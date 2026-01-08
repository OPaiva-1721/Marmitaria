/**
 * Utilitários para formatação de dados
 */

/**
 * Formata valor monetário em Real (BRL)
 * @param {number|string} value - Valor a ser formatado
 * @returns {string} Valor formatado
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return 'R$ 0,00';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
}

/**
 * Formata telefone brasileiro
 * @param {string} value - Telefone a ser formatado
 * @returns {string} Telefone formatado
 */
export function formatPhone(value) {
  if (!value) return '';
  
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }
  
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

/**
 * Formata CEP brasileiro
 * @param {string} value - CEP a ser formatado
 * @returns {string} CEP formatado
 */
export function formatZipcode(value) {
  if (!value) return '';
  
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
}

/**
 * Formata data e hora
 * @param {string|Date} date - Data a ser formatada
 * @param {Object} options - Opções de formatação
 * @returns {string} Data formatada
 */
export function formatDateTime(date, options = {}) {
  if (!date) return '';
  
  const defaultOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
    ...options
  };
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR', defaultOptions).format(dateObj);
  } catch (error) {
    return '';
  }
}

/**
 * Formata apenas data
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export function formatDate(date) {
  return formatDateTime(date, { timeStyle: undefined });
}

/**
 * Formata apenas hora
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Hora formatada
 */
export function formatTime(date) {
  return formatDateTime(date, { dateStyle: undefined });
}

