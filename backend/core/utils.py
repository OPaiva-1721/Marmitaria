"""
Utilitários para respostas padronizadas da API.
"""
from rest_framework.response import Response
from rest_framework import status
from typing import Any, Dict, Optional


def success_response(
    data: Any = None,
    message: Optional[str] = None,
    status_code: int = status.HTTP_200_OK
) -> Response:
    """
    Retorna uma resposta de sucesso padronizada.
    
    Args:
        data: Dados a serem retornados
        message: Mensagem de sucesso opcional
        status_code: Código HTTP de status
        
    Returns:
        Response padronizada
        
    Example:
        return success_response(
            data={'id': 1, 'name': 'Produto'},
            message='Produto criado com sucesso',
            status_code=status.HTTP_201_CREATED
        )
    """
    response_data: Dict[str, Any] = {
        'success': True,
    }
    
    if message:
        response_data['message'] = message
    
    if data is not None:
        if isinstance(data, dict) and 'results' in data:
            # Paginação do DRF
            response_data.update(data)
        else:
            response_data['data'] = data
    
    return Response(response_data, status=status_code)


def error_response(
    message: str,
    errors: Optional[Dict[str, Any]] = None,
    status_code: int = status.HTTP_400_BAD_REQUEST
) -> Response:
    """
    Retorna uma resposta de erro padronizada.
    
    Args:
        message: Mensagem de erro principal
        errors: Dicionário com erros detalhados (opcional)
        status_code: Código HTTP de status
        
    Returns:
        Response padronizada
        
    Example:
        return error_response(
            message='Erro ao criar produto',
            errors={'name': ['Este campo é obrigatório']},
            status_code=status.HTTP_400_BAD_REQUEST
        )
    """
    response_data: Dict[str, Any] = {
        'success': False,
        'error': message,
    }
    
    if errors:
        response_data['errors'] = errors
    
    return Response(response_data, status=status_code)


def validation_error_response(
    errors: Dict[str, Any],
    message: str = 'Erro de validação'
) -> Response:
    """
    Retorna uma resposta de erro de validação padronizada.
    
    Args:
        errors: Dicionário com erros de validação
        message: Mensagem de erro principal
        
    Returns:
        Response padronizada
    """
    return error_response(
        message=message,
        errors=errors,
        status_code=status.HTTP_400_BAD_REQUEST
    )


def not_found_response(
    resource: str = 'Recurso',
    resource_id: Optional[str] = None
) -> Response:
    """
    Retorna uma resposta de recurso não encontrado.
    
    Args:
        resource: Nome do recurso (ex: 'Produto', 'Pedido')
        resource_id: ID do recurso não encontrado
        
    Returns:
        Response padronizada
    """
    message = f'{resource} não encontrado'
    if resource_id:
        message += f' (ID: {resource_id})'
    
    return error_response(
        message=message,
        status_code=status.HTTP_404_NOT_FOUND
    )


def permission_denied_response(
    message: str = 'Você não tem permissão para realizar esta ação'
) -> Response:
    """
    Retorna uma resposta de permissão negada.
    
    Args:
        message: Mensagem de erro
        
    Returns:
        Response padronizada
    """
    return error_response(
        message=message,
        status_code=status.HTTP_403_FORBIDDEN
    )

