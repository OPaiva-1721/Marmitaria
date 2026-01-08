/**
 * Utilitário para tratamento de erros da API
 */

/**
 * Extrai mensagem de erro de uma resposta da API
 * @param {Error} error - Erro da requisição
 * @returns {string} Mensagem de erro formatada
 */
export function getErrorMessage(error) {
  if (!error) return 'Ocorreu um erro desconhecido';

  // Erro de rede
  if (!error.response) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  const { response } = error;
  const { data, status } = response;

  // Erro 401 - Não autorizado
  if (status === 401) {
    return 'Sessão expirada. Por favor, faça login novamente.';
  }

  // Erro 403 - Proibido
  if (status === 403) {
    return 'Você não tem permissão para realizar esta ação.';
  }

  // Erro 404 - Não encontrado
  if (status === 404) {
    return 'Recurso não encontrado.';
  }

  // Erro 500 - Erro do servidor
  if (status >= 500) {
    return 'Erro interno do servidor. Tente novamente mais tarde.';
  }

  // Mensagem de erro da API
  if (data) {
    // Formato padronizado do backend
    if (data.error) {
      return data.error;
    }
    
    // Formato de validação do DRF
    if (data.detail) {
      return data.detail;
    }
    
    // Erros de validação
    if (typeof data === 'object' && !Array.isArray(data)) {
      const firstError = Object.values(data)[0];
      if (Array.isArray(firstError)) {
        return firstError[0];
      }
      if (typeof firstError === 'string') {
        return firstError;
      }
    }
    
    // Mensagem genérica
    if (data.message) {
      return data.message;
    }
  }

  return `Erro ${status}: ${error.message || 'Ocorreu um erro'}`;
}

/**
 * Extrai erros de validação de uma resposta da API
 * @param {Error} error - Erro da requisição
 * @returns {Object} Objeto com erros de validação por campo
 */
export function getValidationErrors(error) {
  if (!error?.response?.data) return {};

  const { data } = error.response;

  // Formato de validação do DRF
  if (typeof data === 'object' && !Array.isArray(data) && !data.error) {
    return data;
  }

  // Formato padronizado do backend
  if (data.errors) {
    return data.errors;
  }

  return {};
}

/**
 * Verifica se o erro é de validação
 * @param {Error} error - Erro da requisição
 * @returns {boolean}
 */
export function isValidationError(error) {
  return error?.response?.status === 400 && 
         (error.response.data?.errors || 
          (typeof error.response.data === 'object' && !error.response.data.error));
}

