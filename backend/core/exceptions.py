"""
Exceções customizadas para o projeto.
"""
from rest_framework.exceptions import APIException
from rest_framework import status


class BusinessLogicError(APIException):
    """
    Exceção para erros de lógica de negócio.
    
    Use quando uma operação viola regras de negócio.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Erro de lógica de negócio'
    default_code = 'business_logic_error'


class OrderAlreadyPaidError(BusinessLogicError):
    """
    Exceção quando tenta alterar um pedido já pago.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Não é possível alterar um pedido com pagamento completo'
    default_code = 'order_already_paid'


class OrderClosedError(BusinessLogicError):
    """
    Exceção quando tenta alterar um pedido fechado.
    """
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Apenas pedidos em aberto podem ser editados pelo Caixa'
    default_code = 'order_closed'


class ProductNotAvailableError(BusinessLogicError):
    """
    Exceção quando tenta usar um produto indisponível.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Produto não está disponível'
    default_code = 'product_not_available'

