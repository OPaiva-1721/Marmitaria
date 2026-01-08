import axios from 'axios';

// Usar URL relativa quando em produção (executável)
const API_BASE_URL = import.meta.env.PROD 
  ? '/api' 
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação e padronizar respostas
api.interceptors.response.use(
  (response) => {
    // Não modificar respostas de token (JWT) - elas já vêm no formato correto
    if (response.config?.url?.includes('/token/')) {
      return response;
    }
    
    // Padronizar resposta de sucesso
    if (response.data && !response.data.success && !response.data.results) {
      // Se não tem formato padronizado, adiciona
      return {
        ...response,
        data: {
          success: true,
          data: response.data
        }
      };
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Evitar loop infinito de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Token expirado, tentar refresh
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh falhou, fazer logout
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // Sem refresh token, fazer logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    // Padronizar erro
    if (error.response?.data) {
      const errorData = error.response.data;
      if (!errorData.success && !errorData.error) {
        // Se não tem formato padronizado, adiciona
        error.response.data = {
          success: false,
          error: errorData.detail || errorData.message || 'Ocorreu um erro',
          errors: errorData
        };
      }
    }

    return Promise.reject(error);
  }
);

// Serviços de Produtos
export const productService = {
  getAll: () => api.get('/products/'),
  getById: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.put(`/products/${id}/`, data),
  delete: (id) => api.delete(`/products/${id}/`),
};

// Serviços de Pedidos
export const orderService = {
  create: (data) => api.post('/orders/', data),
  getAll: (params) => api.get('/orders/', { params }),
  getById: (id) => api.get(`/orders/${id}/`),
  update: (id, data) => api.patch(`/orders/${id}/`, data),
  delete: (id, includePaid = false) => {
    const url = includePaid ? `/orders/${id}/?include_paid=true` : `/orders/${id}/`;
    return api.delete(url);
  },
  bulkDelete: (data) => api.post('/orders/bulk_delete/', data),
  addItem: (orderId, data) => api.post(`/orders/${orderId}/add_item/`, data),
  removeItem: (itemId) => api.delete(`/order-items/${itemId}/`),
};

// Serviços de Pagamentos
export const paymentService = {
  create: (data) => api.post('/payments/', data),
  getAll: () => api.get('/payments/'),
  getById: (id) => api.get(`/payments/${id}/`),
  finalize: (id) => api.post(`/payments/${id}/finalize/`),
};

// Serviços de Autenticação
export const authService = {
  login: (username, password) => api.post('/token/', { username, password }),
  refresh: (refreshToken) => api.post('/token/refresh/', { refresh: refreshToken }),
  register: (userData) => api.post('/register/', userData),
};

// Serviços de Relatórios
export const reportsService = {
  getDashboard: () => api.get('/reports/dashboard/'),
  getSalesReport: (params) => api.get('/reports/sales/', { params }),
  getProductsReport: (params) => api.get('/reports/products/', { params }),
  getOrdersReport: (params) => api.get('/reports/orders/', { params }),
  getFinancialReport: (params) => api.get('/reports/financial/', { params }),
  getExpensesReport: (params) => api.get('/reports/expenses/', { params }),
  // Exportações
  exportSalesCSV: (params) => api.get('/reports/sales/export_csv/', { params, responseType: 'blob' }),
  exportProductsCSV: (params) => api.get('/reports/products/export_csv/', { params, responseType: 'blob' }),
  exportOrdersCSV: (params) => api.get('/reports/orders/export_csv/', { params, responseType: 'blob' }),
  exportFinancialCSV: (params) => api.get('/reports/financial/export_csv/', { params, responseType: 'blob' }),
  exportExpensesCSV: (params) => api.get('/reports/expenses/export_csv/', { params, responseType: 'blob' }),
};

// Serviços de Despesas/Saídas
export const expenseService = {
  create: (data) => api.post('/expenses/', data),
  getAll: (params) => api.get('/expenses/', { params }),
  getById: (id) => api.get(`/expenses/${id}/`),
  update: (id, data) => api.patch(`/expenses/${id}/`, data),
  delete: (id) => api.delete(`/expenses/${id}/`),
};

// Serviços de Usuários (Admin apenas)
export const userService = {
  getAll: () => api.get('/users/'),
  getById: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}/`, data),
  patch: (id, data) => api.patch(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
};

export default api;

