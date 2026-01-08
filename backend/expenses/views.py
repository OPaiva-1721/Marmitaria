from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from .models import Expense
from .serializers import (
    ExpenseSerializer,
    CreateExpenseSerializer
)
from core.permissions import IsAdminOrCaixa
from core.utils import (
    success_response,
    error_response,
    validation_error_response,
    not_found_response
)


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar despesas/saídas.
    
    Endpoints:
    - POST /api/expenses/ - Criar nova despesa
    - GET /api/expenses/ - Listar despesas
    - GET /api/expenses/{id}/ - Detalhes da despesa
    - PATCH /api/expenses/{id}/ - Atualizar despesa
    - DELETE /api/expenses/{id}/ - Deletar despesa
    
    Permissões:
    - Admin e Caixa podem criar e gerenciar despesas
    """
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, IsAdminOrCaixa]
    
    def get_queryset(self):
        """
        Retorna despesas baseado no tipo de usuário.
        - Admin: vê todas as despesas
        - Caixa: vê todas as despesas
        """
        return Expense.objects.all()
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação"""
        if self.action == 'create':
            return CreateExpenseSerializer
        return ExpenseSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Cria uma nova despesa.
        
        Body esperado:
        {
            "category": "ingredients",
            "description": "Compra de ingredientes",
            "amount": 150.00,
            "notes": "Compra mensal"
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            expense = serializer.save(user=request.user)
            return success_response(
                data=ExpenseSerializer(expense).data,
                message='Despesa registrada com sucesso!',
                status_code=status.HTTP_201_CREATED
            )
        except IntegrityError:
            return error_response(
                message='Erro ao criar despesa. Verifique se os dados estão corretos.',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao criar despesa: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """
        Atualiza uma despesa existente.
        """
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            return error_response(
                message=f'Erro ao atualizar despesa: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Deleta uma despesa.
        """
        try:
            expense = self.get_object()
            expense.delete()
            return success_response(
                message='Despesa deletada com sucesso!'
            )
        except Exception as e:
            return error_response(
                message=f'Erro ao deletar despesa: {str(e)}',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

