"""
Middleware customizado para tratamento de exceções e logging.
"""
import logging
from django.http import JsonResponse
from rest_framework.views import exception_handler
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Handler customizado para exceções do DRF.
    
    Padroniza todas as respostas de erro da API.
    """
    # Não modificar respostas de endpoints de token (JWT)
    # Eles já têm seu próprio formato de resposta
    request = context.get('request')
    if request and request.path and '/token/' in request.path:
        # Deixa o handler padrão do DRF lidar com erros de token
        return exception_handler(exc, context)
    
    # Chama o handler padrão do DRF primeiro
    response = exception_handler(exc, context)
    
    if response is not None:
        # Padroniza a resposta de erro
        custom_response_data = {
            'success': False,
            'error': None,
            'errors': {}
        }
        
        # Extrai mensagem de erro
        if 'detail' in response.data:
            custom_response_data['error'] = str(response.data['detail'])
        elif isinstance(response.data, dict):
            # Se for um dicionário de erros de validação
            if len(response.data) == 1 and 'detail' not in response.data:
                # Pega o primeiro erro
                first_key = list(response.data.keys())[0]
                first_value = response.data[first_key]
                if isinstance(first_value, list) and len(first_value) > 0:
                    custom_response_data['error'] = f"{first_key}: {first_value[0]}"
                else:
                    custom_response_data['error'] = str(first_value)
            else:
                custom_response_data['error'] = 'Erro de validação'
                custom_response_data['errors'] = response.data
        else:
            custom_response_data['error'] = str(response.data)
        
        response.data = custom_response_data
    
    return response

