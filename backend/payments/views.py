from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Payment, PaymentStatus
from .serializers import (
    PaymentSerializer,
    CreatePaymentSerializer,
    FinalizePaymentSerializer
)
from orders.models import Order
from core.permissions import IsAdminOrCaixa
from core.utils import (
    success_response,
    error_response,
    validation_error_response,
    not_found_response
)


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar pagamentos.
    
    Endpoints:
    - POST /api/payments/ - Criar novo pagamento
    - GET /api/payments/ - Listar pagamentos
    - GET /api/payments/{id}/ - Detalhes do pagamento
    - POST /api/payments/{id}/finalize/ - Finalizar pagamento
    
    Permissões:
    - Admin e Caixa podem criar e gerenciar pagamentos
    """
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsAdminOrCaixa]
    
    def get_queryset(self):
        """
        Retorna pagamentos baseado no tipo de usuário.
        - Admin: vê todos os pagamentos
        - Caixa: vê todos os pagamentos (para poder gerenciar)
        """
        # Admin e Caixa podem ver todos os pagamentos
        return Payment.objects.all()
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação"""
        if self.action == 'create':
            return CreatePaymentSerializer
        return PaymentSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Cria um novo pagamento para um pedido.
        
        Body esperado:
        {
            "order": 1,
            "method": "pix",
            "transaction_id": "abc123",
            "notes": "Pagamento via PIX"
        }
        
        O valor será automaticamente o total do pedido.
        """
        serializer = CreatePaymentSerializer(data=request.data)
        
        if not serializer.is_valid():
            return validation_error_response(
                errors=serializer.errors,
                message='Dados inválidos para criar pagamento'
            )
        
        # Admin e Caixa podem criar pagamentos para qualquer pedido
        # Não precisa validar se o pedido pertence ao usuário
        order = serializer.validated_data['order']
        
        # Verificar se o pedido já tem um pagamento
        if hasattr(order, 'payment'):
            return error_response(
                message='Este pedido já possui um pagamento.',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            payment = serializer.save()
            
            # Retorna o pagamento criado
            response_serializer = PaymentSerializer(payment)
            return success_response(
                data=response_serializer.data,
                message='Pagamento criado com sucesso!',
                status_code=status.HTTP_201_CREATED
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao criar pagamento: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='finalize')
    def finalize(self, request, pk=None):
        """
        Finaliza um pagamento, marcando-o como COMPLETED.
        
        Este endpoint marca o pagamento como concluído e atualiza
        a data de pagamento. Após finalizar, o pedido não pode mais ser alterado.
        """
        payment = self.get_object()
        
        # Admin e Caixa podem finalizar pagamentos de qualquer pedido
        # Não precisa validar se o pagamento pertence ao usuário
        
        serializer = FinalizePaymentSerializer(
            data={},
            context={'payment': payment}
        )
        serializer.is_valid(raise_exception=True)
        
        try:
            # Marca o pagamento como concluído
            payment.mark_as_completed()
            
            # Retorna o pagamento atualizado
            response_serializer = PaymentSerializer(payment)
            return success_response(
                data=response_serializer.data,
                message='Pagamento finalizado com sucesso!'
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao finalizar pagamento: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
