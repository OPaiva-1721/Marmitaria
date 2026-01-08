from rest_framework import serializers
from decimal import Decimal
import logging
from .models import Payment, PaymentMethod, PaymentStatus

logger = logging.getLogger(__name__)


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer para o model Payment"""
    
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'order_id', 'method', 'method_display',
            'status', 'status_display', 'amount', 'transaction_id',
            'notes', 'paid_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'paid_at', 'created_at', 'updated_at']


class CreatePaymentSerializer(serializers.ModelSerializer):
    """Serializer para criar um novo pagamento"""
    
    class Meta:
        model = Payment
        fields = ['order', 'method', 'transaction_id', 'notes']
        
    def validate_order(self, value):
        """Valida se o pedido pode receber um pagamento"""
        # Verifica se o pedido já tem um pagamento
        if hasattr(value, 'payment'):
            raise serializers.ValidationError("Este pedido já possui um pagamento.")
        
        # Verifica se o pedido tem itens
        if not value.items.exists():
            raise serializers.ValidationError("O pedido não possui itens.")
        
        return value
        
    def create(self, validated_data):
        """Cria um novo pagamento com o valor do pedido + taxa de entrega"""
        order = validated_data['order']
        
        # Recarregar o pedido do banco para garantir que temos o delivery_fee atualizado
        order.refresh_from_db()
        
        # Valor do pagamento = total dos produtos + taxa de entrega
        delivery_fee = order.delivery_fee or Decimal('0.00')
        payment_amount = order.total + delivery_fee
        
        # Log para debug
        logger.info(f'Criando pagamento - Pedido #{order.id}: Total produtos={order.total}, Taxa entrega={delivery_fee}, Total pagamento={payment_amount}')
        
        payment = Payment.objects.create(
            **validated_data,
            amount=payment_amount,
            status=PaymentStatus.PENDING
        )
        
        return payment


class FinalizePaymentSerializer(serializers.Serializer):
    """Serializer para finalizar um pagamento"""
    
    def validate(self, attrs):
        """Valida se o pagamento pode ser finalizado"""
        payment = self.context['payment']
        
        if payment.status == PaymentStatus.COMPLETED:
            raise serializers.ValidationError("Este pagamento já foi finalizado.")
        
        if payment.status == PaymentStatus.FAILED:
            raise serializers.ValidationError("Este pagamento falhou e não pode ser finalizado.")
        
        return attrs

