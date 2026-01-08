from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import models
from .models import Order, OrderItem
from .serializers import (
    OrderSerializer,
    CreateOrderSerializer,
    AddOrderItemSerializer,
    OrderItemSerializer
)
from core.models import Product
from core.permissions import IsAdminOrCaixa
from core.utils import (
    success_response,
    error_response,
    validation_error_response,
    not_found_response,
    permission_denied_response
)
from core.exceptions import OrderAlreadyPaidError, OrderClosedError, ProductNotAvailableError


class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar pedidos.
    
    Endpoints:
    - POST /api/orders/ - Criar novo pedido
    - GET /api/orders/ - Listar pedidos
    - GET /api/orders/{id}/ - Detalhes do pedido
    - POST /api/orders/{id}/add_item/ - Adicionar item ao pedido
    - PATCH /api/orders/{id}/ - Atualizar pedido
    
    Permissões:
    - Admin: pode ver e editar todos os pedidos (abertos e fechados)
    - Caixa: pode ver e editar apenas pedidos em aberto
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrCaixa]
    
    def _is_admin(self):
        """Verifica se o usuário é admin"""
        user = self.request.user
        return user.is_superuser or user.groups.filter(name='Admin').exists()
    
    def _is_caixa(self):
        """Verifica se o usuário é caixa"""
        return self.request.user.groups.filter(name='Caixa').exists()
    
    def _can_edit_order(self, order):
        """
        Verifica se o usuário pode editar o pedido.
        - Admin pode editar qualquer pedido
        - Caixa só pode editar pedidos em aberto
        """
        if self._is_admin():
            return True
        return order.is_open
    
    def get_queryset(self):
        """
        Retorna pedidos baseado no tipo de usuário.
        - Admin: vê todos os pedidos (abertos e fechados)
        - Caixa: vê apenas pedidos em aberto (is_open=True)
        
        Filtros disponíveis via query parameters:
        - payment_status: filtra por status do pagamento (completed, pending, etc.)
        """
        from django.contrib.auth.models import User
        from payments.models import PaymentStatus
        
        queryset = Order.objects.all()
        
        # Filtro por status de pagamento
        payment_status = self.request.query_params.get('payment_status', None)
        if payment_status:
            if payment_status == 'completed':
                # Apenas pedidos com pagamento finalizado
                queryset = queryset.filter(payment__status=PaymentStatus.COMPLETED)
            elif payment_status == 'pending':
                # Apenas pedidos com pagamento pendente ou sem pagamento
                queryset = queryset.filter(
                    models.Q(payment__status=PaymentStatus.PENDING) | 
                    models.Q(payment__isnull=True)
                )
            elif payment_status == 'none':
                # Apenas pedidos sem pagamento
                queryset = queryset.filter(payment__isnull=True)
            else:
                # Outros status específicos
                queryset = queryset.filter(payment__status=payment_status)
        
        if self.request.user.is_authenticated:
            # Admin vê todos os pedidos (abertos e fechados)
            if self.request.user.is_superuser or self.request.user.groups.filter(name='Admin').exists():
                return queryset
            # Caixa vê apenas pedidos em aberto
            return queryset.filter(is_open=True)
        return queryset
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação"""
        if self.action == 'create':
            return CreateOrderSerializer
        return OrderSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Cria um novo pedido.
        
        Body esperado:
        {
            "notes": "Sem cebola",  # opcional
            "delivery_address": "Rua Exemplo, 123"  # opcional
        }
        
        O cliente será determinado automaticamente (cliente padrão).
        """
        from django.contrib.auth.models import User
        
        serializer = CreateOrderSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        # Determinar qual cliente usar (sempre usar cliente padrão)
        try:
            customer = User.objects.get(username='cliente_padrao')
        except User.DoesNotExist:
            # Se não existir, criar cliente padrão
            customer = User.objects.create_user(
                username='cliente_padrao',
                email='cliente@marmitaria.com',
                first_name='Cliente',
                last_name='Padrão'
            )
        
        # Criar pedido com o cliente padrão
        order = serializer.save(customer=customer)
        
        # Retorna o pedido criado com todos os detalhes
        response_serializer = OrderSerializer(order)
        return success_response(
            data=response_serializer.data,
            message='Pedido criado com sucesso!',
            status_code=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """
        Atualiza um pedido.
        
        Caixa só pode editar pedidos em aberto.
        Admin pode editar qualquer pedido.
        """
        order = self.get_object()
        
        # Valida se o usuário pode editar este pedido
        if not self._can_edit_order(order):
            return permission_denied_response(
                'Apenas pedidos em aberto podem ser editados pelo Caixa. Pedidos fechados só podem ser visualizados pelo Admin.'
            )
        
        # Valida se o pedido pode ser alterado (já pago)
        if order.is_paid():
            raise OrderAlreadyPaidError()
        
        try:
            serializer = self.get_serializer(order, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return success_response(
                data=serializer.data,
                message='Pedido atualizado com sucesso!'
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao atualizar pedido: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='add_item')
    def add_item(self, request, pk=None):
        """
        Adiciona um item ao pedido.
        
        Body esperado:
        {
            "product_id": 1,
            "quantity": 2
        }
        
        O preço será obtido automaticamente do produto.
        """
        order = self.get_object()
        
        # Valida se o usuário pode editar este pedido
        if not self._can_edit_order(order):
            return permission_denied_response(
                'Apenas pedidos em aberto podem ser editados pelo Caixa. Pedidos fechados só podem ser visualizados pelo Admin.'
            )
        
        # Valida se o pedido pode ser alterado
        if order.is_paid():
            raise OrderAlreadyPaidError()
        
        serializer = AddOrderItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Obtém o produto e o preço atual
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']
        
        try:
            product = Product.objects.get(id=product_id, is_available=True)
        except Product.DoesNotExist:
            raise ProductNotAvailableError('Produto não encontrado ou não está disponível.')
        
        try:
            # Cria o item do pedido com o preço atual do produto
            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                price=product.price  # Usa o preço atual do produto
            )
            
            # Retorna o item criado
            response_serializer = OrderItemSerializer(order_item)
            return success_response(
                data=response_serializer.data,
                message='Item adicionado ao pedido com sucesso!',
                status_code=status.HTTP_201_CREATED
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao adicionar item: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Remove um pedido.
        
        Regras:
        - Por padrão, não é possível deletar pedidos com pagamento completo
        - Use ?include_paid=true na URL para permitir deletar pedidos pagos
        - Apenas admin pode deletar pedidos
        
        Exemplo para deletar pedido pago:
        DELETE /api/orders/{id}/?include_paid=true
        """
        # Verifica se é admin PRIMEIRO (antes de buscar o objeto)
        # Isso evita problemas de permissão no get_object()
        if not self._is_admin():
            return permission_denied_response('Apenas administradores podem deletar pedidos.')
        
        # Verifica se deve incluir pedidos pagos
        include_paid = request.query_params.get('include_paid', 'false').lower() == 'true'
        
        # Para admin, busca o pedido diretamente sem filtros do queryset
        # Isso garante que admin possa deletar qualquer pedido
        try:
            order_id = kwargs.get('pk')
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            return not_found_response('Pedido', str(order_id))
        
        # Valida se o pedido pode ser deletado (não pode estar pago, a menos que include_paid seja True)
        if order.is_paid() and not include_paid:
            return error_response(
                message='Não é possível deletar um pedido com pagamento completo.',
                errors={'hint': 'Use ?include_paid=true na URL para permitir deletar pedidos pagos.'},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Deleta o pedido
            order.delete()
            return success_response(
                message='Pedido deletado com sucesso.'
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao deletar pedido: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['POST'], url_path='bulk_delete')
    def bulk_delete(self, request):
        """
        Deleta múltiplos pedidos do banco de dados.
        
        Apenas admin pode usar esta ação.
        
        Body esperado:
        {
            "order_ids": [1, 2, 3],  # Lista de IDs dos pedidos a deletar (opcional)
            "delete_all": false,     # Se true, deleta todos os pedidos (opcional)
            "only_open": false,      # Se true, deleta apenas pedidos em aberto (opcional)
            "include_paid": false   # Se true, permite deletar pedidos pagos também (CUIDADO!)
        }
        
        NOTA: Por padrão, pedidos com pagamento completo NÃO são deletados.
        Use "include_paid": true para permitir deletar pedidos pagos também.
        
        Exemplos:
        1. Deletar pedidos específicos (apenas não pagos):
           {"order_ids": [1, 2, 3]}
        
        2. Deletar todos os pedidos não pagos:
           {"delete_all": true}
        
        3. Deletar todos os pedidos (incluindo pagos):
           {"delete_all": true, "include_paid": true}
        
        4. Deletar todos os pedidos em aberto (incluindo pagos):
           {"delete_all": true, "only_open": true, "include_paid": true}
        """
        # Verifica se é admin
        if not self._is_admin():
            return permission_denied_response('Apenas administradores podem deletar pedidos em massa.')
        
        order_ids = request.data.get('order_ids', [])
        delete_all = request.data.get('delete_all', False)
        only_open = request.data.get('only_open', False)
        include_paid = request.data.get('include_paid', False)
        
        # Validação: precisa ter order_ids OU delete_all
        if not order_ids and not delete_all:
            return validation_error_response(
                errors={'delete_all': ['É necessário fornecer "order_ids" ou definir "delete_all" como true.']},
                message='Parâmetros inválidos para exclusão em massa'
            )
        
        # Se delete_all, busca todos os pedidos (com filtros opcionais)
        if delete_all:
            queryset = Order.objects.all()
            
            # Aplica filtros
            if only_open:
                # Filtra apenas pedidos em aberto
                queryset = queryset.filter(is_open=True)
            
            # Filtra pedidos pagos baseado no parâmetro include_paid
            orders_to_delete = []
            for order in queryset:
                if include_paid or not order.is_paid():
                    # Se include_paid for True, adiciona todos (incluindo pagos)
                    # Se include_paid for False, adiciona apenas não pagos
                    orders_to_delete.append(order)
        else:
            # Busca pedidos pelos IDs fornecidos
            try:
                queryset = Order.objects.filter(pk__in=order_ids)
                
                # Aplica filtros opcionais
                if only_open:
                    queryset = queryset.filter(is_open=True)
                
                # Filtra pedidos pagos baseado no parâmetro include_paid
                if include_paid:
                    orders_to_delete = list(queryset)
                else:
                    orders_to_delete = [order for order in queryset if not order.is_paid()]
            except Exception as e:
                return Response(
                    {'error': f'Erro ao buscar pedidos: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if not orders_to_delete:
            message = 'Nenhum pedido encontrado para deletar.'
            if not include_paid:
                message += ' (Use "include_paid": true para deletar pedidos pagos também)'
            return success_response(
                message=message
            )
        
        # Conta quantos serão deletados
        count = len(orders_to_delete)
        
        # Deleta os pedidos
        try:
            # Usa bulk delete para melhor performance
            order_ids_to_delete = [order.id for order in orders_to_delete]
            Order.objects.filter(pk__in=order_ids_to_delete).delete()
            
            return success_response(
                data={
                    'deleted_count': count,
                    'deleted_ids': order_ids_to_delete
                },
                message=f'{count} pedido(s) deletado(s) com sucesso.'
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao deletar pedidos: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OrderItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar itens do pedido.
    
    Permite deletar itens do pedido.
    """
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated, IsAdminOrCaixa]
    
    def get_queryset(self):
        """
        Retorna itens de pedidos.
        - Admin: vê itens de todos os pedidos (abertos e fechados)
        - Caixa: vê apenas itens de pedidos em aberto
        """
        queryset = OrderItem.objects.all()
        
        if self.request.user.is_authenticated:
            # Admin vê todos os itens
            if self.request.user.is_superuser or self.request.user.groups.filter(name='Admin').exists():
                return queryset
            # Caixa vê apenas itens de pedidos em aberto
            return queryset.filter(order__is_open=True)
        return queryset
    
    def destroy(self, request, *args, **kwargs):
        """
        Remove um item do pedido.
        
        Caixa só pode remover itens de pedidos em aberto.
        Admin pode remover itens de qualquer pedido (não pago).
        """
        item = self.get_object()
        order = item.order
        
        # Valida se o usuário pode editar este pedido
        # Para OrderItemViewSet, precisamos verificar se é admin ou se o pedido está aberto
        is_admin = request.user.is_superuser or request.user.groups.filter(name='Admin').exists()
        if not is_admin and not order.is_open:
            return permission_denied_response(
                'Apenas pedidos em aberto podem ser editados pelo Caixa. Pedidos fechados só podem ser visualizados pelo Admin.'
            )
        
        # Valida se o pedido pode ser alterado
        if order.is_paid():
            raise OrderAlreadyPaidError('Não é possível remover itens de um pedido com pagamento completo.')
        
        try:
            item.delete()
            return success_response(
                message='Item removido do pedido com sucesso!',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao remover item: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# View alternativa para bulk_delete (caso a ação do ViewSet não funcione)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_delete_orders(request):
    """
    View alternativa para deletar múltiplos pedidos.
    Endpoint: POST /api/orders/bulk_delete/
    """
    from core.permissions import IsAdminOrCaixa
    
    # Verifica permissão
    if not IsAdminOrCaixa().has_permission(request, None):
        return Response(
            {'error': 'Apenas administradores e caixa podem deletar pedidos.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Verifica se é admin
    is_admin = request.user.is_superuser or request.user.groups.filter(name='Admin').exists()
    if not is_admin:
        return Response(
            {'error': 'Apenas administradores podem deletar pedidos em massa.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    order_ids = request.data.get('order_ids', [])
    delete_all = request.data.get('delete_all', False)
    only_open = request.data.get('only_open', False)
    include_paid = request.data.get('include_paid', False)
    
    # Validação: precisa ter order_ids OU delete_all
    if not order_ids and not delete_all:
        return Response(
            {'error': 'É necessário fornecer "order_ids" ou definir "delete_all" como true.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Se delete_all, busca todos os pedidos (com filtros opcionais)
    if delete_all:
        queryset = Order.objects.all()
        
        # Aplica filtros
        if only_open:
            queryset = queryset.filter(is_open=True)
        
        # Filtra pedidos pagos baseado no parâmetro include_paid
        orders_to_delete = []
        for order in queryset:
            if include_paid or not order.is_paid():
                orders_to_delete.append(order)
    else:
        # Busca pedidos pelos IDs fornecidos
        try:
            queryset = Order.objects.filter(pk__in=order_ids)
            
            # Aplica filtros opcionais
            if only_open:
                queryset = queryset.filter(is_open=True)
            
            # Filtra pedidos pagos baseado no parâmetro include_paid
            if include_paid:
                orders_to_delete = list(queryset)
            else:
                orders_to_delete = [order for order in queryset if not order.is_paid()]
        except Exception as e:
            return Response(
                {'error': f'Erro ao buscar pedidos: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if not orders_to_delete:
        message = 'Nenhum pedido encontrado para deletar.'
        if not include_paid:
            message += ' (Use "include_paid": true para deletar pedidos pagos também)'
        return Response(
            {'message': message},
            status=status.HTTP_200_OK
        )
    
    # Conta quantos serão deletados
    count = len(orders_to_delete)
    
    # Deleta os pedidos
    try:
        # Usa bulk delete para melhor performance
        order_ids_to_delete = [order.id for order in orders_to_delete]
        Order.objects.filter(pk__in=order_ids_to_delete).delete()
        
        return Response(
            {
                'message': f'{count} pedido(s) deletado(s) com sucesso.',
                'deleted_count': count,
                'deleted_ids': order_ids_to_delete
            },
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'error': f'Erro ao deletar pedidos: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
