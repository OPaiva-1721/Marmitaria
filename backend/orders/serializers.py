from rest_framework import serializers
from .models import Order, OrderItem, OrderStatus
from core.models import Product
from core.serializers import ProductSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer para o model OrderItem"""
    
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_available=True),
        source='product',
        write_only=True
    )
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'order', 'product', 'product_id', 'quantity', 'price', 'subtotal', 'created_at']
        read_only_fields = ['id', 'order', 'subtotal', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    """Serializer para o model Order"""
    
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    payment_method = serializers.SerializerMethodField()
    payment_method_display = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_username', 'status', 'status_display',
            'is_open', 'total', 'delivery_fee', 'notes', 'delivery_address', 'items', 'created_at', 'updated_at',
            'payment_method', 'payment_method_display', 'payment_status', 'payment_status_display'
        ]
        read_only_fields = ['id', 'total', 'created_at', 'updated_at']
        # delivery_fee NÃO está em read_only_fields, então pode ser atualizado
    
    def get_payment_method(self, obj):
        """Retorna o método de pagamento se existir"""
        try:
            return obj.payment.method if hasattr(obj, 'payment') else None
        except AttributeError:
            return None
    
    def get_payment_method_display(self, obj):
        """Retorna o método de pagamento formatado se existir"""
        try:
            return obj.payment.get_method_display() if hasattr(obj, 'payment') else None
        except AttributeError:
            return None
    
    def get_payment_status(self, obj):
        """Retorna o status do pagamento se existir"""
        try:
            return obj.payment.status if hasattr(obj, 'payment') else None
        except AttributeError:
            return None
    
    def get_payment_status_display(self, obj):
        """Retorna o status do pagamento formatado se existir"""
        try:
            return obj.payment.get_status_display() if hasattr(obj, 'payment') else None
        except AttributeError:
            return None


class CreateOrderSerializer(serializers.ModelSerializer):
    """Serializer para criar um novo pedido"""
    
    class Meta:
        model = Order
        fields = ['notes', 'delivery_address', 'delivery_fee']
        # customer não está nos fields - será definido na view
        
    def create(self, validated_data):
        """Cria um novo pedido com status PENDING"""
        # customer será adicionado na view antes de salvar
        order = Order.objects.create(
            **validated_data,
            status=OrderStatus.PENDING
        )
        return order


class AddOrderItemSerializer(serializers.Serializer):
    """Serializer para adicionar um item ao pedido"""
    
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    
    def validate_product_id(self, value):
        """Valida se o produto existe e está disponível"""
        try:
            product = Product.objects.get(id=value, is_available=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Produto não encontrado ou não está disponível.")
        return value
        
    def validate_quantity(self, value):
        """Valida se a quantidade é positiva"""
        if value <= 0:
            raise serializers.ValidationError("A quantidade deve ser maior que zero.")
        return value

