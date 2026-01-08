import { useState, useEffect } from 'react';
import { reportsService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function ReportsPanel({ onNavigate }) {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  
  // Sales report data
  const [salesData, setSalesData] = useState(null);
  const [salesFilters, setSalesFilters] = useState({
    start_date: '',
    end_date: '',
    group_by: 'day',
    payment_method: '',
  });
  
  // Products report data
  const [productsData, setProductsData] = useState(null);
  const [productsFilters, setProductsFilters] = useState({
    start_date: '',
    end_date: '',
    limit: 10,
    category: '',
  });
  
  // Orders report data
  const [ordersData, setOrdersData] = useState(null);
  const [ordersFilters, setOrdersFilters] = useState({
    start_date: '',
    end_date: '',
    status: '',
    is_open: '',
  });
  
  // Financial report data
  const [financialData, setFinancialData] = useState(null);
  const [financialFilters, setFinancialFilters] = useState({
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard();
    }
  }, [activeTab]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsService.getDashboard();
      setDashboardData(response.data);
    } catch (err) {
      setError('Erro ao carregar dashboard: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadSalesReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (salesFilters.start_date) params.start_date = salesFilters.start_date;
      if (salesFilters.end_date) params.end_date = salesFilters.end_date;
      if (salesFilters.group_by) params.group_by = salesFilters.group_by;
      if (salesFilters.payment_method) params.payment_method = salesFilters.payment_method;
      
      const response = await reportsService.getSalesReport(params);
      setSalesData(response.data);
    } catch (err) {
      setError('Erro ao carregar relatório de vendas: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadProductsReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (productsFilters.start_date) params.start_date = productsFilters.start_date;
      if (productsFilters.end_date) params.end_date = productsFilters.end_date;
      if (productsFilters.limit) params.limit = productsFilters.limit;
      if (productsFilters.category) params.category = productsFilters.category;
      
      const response = await reportsService.getProductsReport(params);
      setProductsData(response.data);
    } catch (err) {
      setError('Erro ao carregar relatório de produtos: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (ordersFilters.start_date) params.start_date = ordersFilters.start_date;
      if (ordersFilters.end_date) params.end_date = ordersFilters.end_date;
      if (ordersFilters.status) params.status = ordersFilters.status;
      if (ordersFilters.is_open !== '') params.is_open = ordersFilters.is_open;
      
      const response = await reportsService.getOrdersReport(params);
      setOrdersData(response.data);
    } catch (err) {
      setError('Erro ao carregar relatório de pedidos: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (financialFilters.start_date) params.start_date = financialFilters.start_date;
      if (financialFilters.end_date) params.end_date = financialFilters.end_date;
      
      const response = await reportsService.getFinancialReport(params);
      setFinancialData(response.data);
    } catch (err) {
      setError('Erro ao carregar relatório financeiro: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDateRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  // Função para fazer download de arquivo
  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Funções de exportação
  const exportSalesCSV = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (salesFilters.start_date) params.start_date = salesFilters.start_date;
      if (salesFilters.end_date) params.end_date = salesFilters.end_date;
      if (salesFilters.payment_method) params.payment_method = salesFilters.payment_method;
      
      const response = await reportsService.exportSalesCSV(params);
      const filename = `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(response.data, filename);
    } catch (err) {
      setError('Erro ao exportar relatório: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const exportProductsCSV = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (productsFilters.start_date) params.start_date = productsFilters.start_date;
      if (productsFilters.end_date) params.end_date = productsFilters.end_date;
      if (productsFilters.limit) params.limit = productsFilters.limit;
      if (productsFilters.category) params.category = productsFilters.category;
      
      const response = await reportsService.exportProductsCSV(params);
      const filename = `relatorio_produtos_${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(response.data, filename);
    } catch (err) {
      setError('Erro ao exportar relatório: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const exportOrdersCSV = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (ordersFilters.start_date) params.start_date = ordersFilters.start_date;
      if (ordersFilters.end_date) params.end_date = ordersFilters.end_date;
      if (ordersFilters.status) params.status = ordersFilters.status;
      if (ordersFilters.is_open !== '') params.is_open = ordersFilters.is_open;
      
      const response = await reportsService.exportOrdersCSV(params);
      const filename = `relatorio_pedidos_${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(response.data, filename);
    } catch (err) {
      setError('Erro ao exportar relatório: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const exportFinancialCSV = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (financialFilters.start_date) params.start_date = financialFilters.start_date;
      if (financialFilters.end_date) params.end_date = financialFilters.end_date;
      
      const response = await reportsService.exportFinancialCSV(params);
      const filename = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(response.data, filename);
    } catch (err) {
      setError('Erro ao exportar relatório: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Expenses report data
  const [expensesData, setExpensesData] = useState(null);
  const [expensesFilters, setExpensesFilters] = useState({
    start_date: '',
    end_date: '',
    category: '',
  });

  const loadExpensesReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (expensesFilters.start_date) params.start_date = expensesFilters.start_date;
      if (expensesFilters.end_date) params.end_date = expensesFilters.end_date;
      if (expensesFilters.category) params.category = expensesFilters.category;
      
      const response = await reportsService.getExpensesReport(params);
      setExpensesData(response.data);
    } catch (err) {
      setError('Erro ao carregar relatório de despesas: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const exportExpensesCSV = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (expensesFilters.start_date) params.start_date = expensesFilters.start_date;
      if (expensesFilters.end_date) params.end_date = expensesFilters.end_date;
      if (expensesFilters.category) params.category = expensesFilters.category;
      
      const response = await reportsService.exportExpensesCSV(params);
      const filename = `relatorio_despesas_${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(response.data, filename);
    } catch (err) {
      setError('Erro ao exportar relatório: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = '#667eea' }) => (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      border: `2px solid ${color}20`,
      transition: 'transform 0.2s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '8px', fontWeight: '600' }}>
            {title}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color, marginBottom: '4px' }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.85rem', color: '#95a5a6' }}>
              {subtitle}
            </div>
          )}
        </div>
        {icon && (
          <div style={{ fontSize: '2.5rem', opacity: 0.3 }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>📊 Relatórios Administrativos</h1>
            <p>Análise e estatísticas do sistema</p>
          </div>
          <button className="btn btn-danger" onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      {/* Navegação de volta para gerenciamento */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '10px',
      }}>
        <button
          onClick={() => {
            if (onNavigate) {
              onNavigate('management');
            } else {
              // Se não houver callback, tentar navegar via estado do AdminPanel
              window.location.reload();
            }
          }}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: '#f8f9fa',
            color: '#495057',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.9rem',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e9ecef';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8f9fa';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ← Voltar para Gerenciamento
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '10px',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'dashboard', label: '📈 Dashboard', icon: '📈' },
          { id: 'sales', label: '💰 Vendas', icon: '💰' },
          { id: 'products', label: '🍽️ Produtos', icon: '🍽️' },
          { id: 'orders', label: '📦 Pedidos', icon: '📦' },
          { id: 'financial', label: '💳 Financeiro', icon: '💳' },
          { id: 'expenses', label: '💸 Despesas', icon: '💸' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#f8f9fa',
              color: activeTab === tab.id ? '#fff' : '#495057',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '400',
              fontSize: '0.95rem',
              transition: 'all 0.3s',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Carregando dashboard...</p>
            </div>
          ) : dashboardData ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard
                  title="Total de Pedidos"
                  value={dashboardData.summary.total_orders}
                  subtitle={`${dashboardData.summary.open_orders} abertos, ${dashboardData.summary.closed_orders} fechados`}
                  icon="📦"
                  color="#667eea"
                />
                <StatCard
                  title="Receita Total"
                  value={formatCurrency(dashboardData.summary.total_revenue)}
                  subtitle={`${formatCurrency(dashboardData.summary.recent_revenue)} nos últimos 30 dias`}
                  icon="💰"
                  color="#10b981"
                />
                {dashboardData.summary.total_products_revenue !== undefined && (
                  <StatCard
                    title="Receita de Produtos"
                    value={formatCurrency(dashboardData.summary.total_products_revenue)}
                    subtitle={`${formatCurrency(dashboardData.summary.recent_products_revenue || 0)} nos últimos 30 dias`}
                    icon="🛒"
                    color="#3b82f6"
                  />
                )}
                {dashboardData.summary.total_delivery_fees !== undefined && (
                  <StatCard
                    title="Taxas de Entrega"
                    value={formatCurrency(dashboardData.summary.total_delivery_fees)}
                    subtitle={`${formatCurrency(dashboardData.summary.recent_delivery_fees || 0)} nos últimos 30 dias`}
                    icon="🚚"
                    color="#8b5cf6"
                  />
                )}
                <StatCard
                  title="Despesas Total"
                  value={formatCurrency(dashboardData.summary.total_expenses || 0)}
                  subtitle={`${formatCurrency(dashboardData.summary.recent_expenses || 0)} nos últimos 30 dias`}
                  icon="💸"
                  color="#ef4444"
                />
                <StatCard
                  title="Lucro Líquido"
                  value={formatCurrency(dashboardData.summary.profit || 0)}
                  subtitle={`${formatCurrency(dashboardData.summary.recent_profit || 0)} nos últimos 30 dias`}
                  icon="📊"
                  color="#667eea"
                />
                <StatCard
                  title="Pedidos Pendentes"
                  value={dashboardData.summary.pending_payments}
                  subtitle="Aguardando pagamento"
                  icon="⏳"
                  color="#f59e0b"
                />
              </div>

              {dashboardData.top_products && dashboardData.top_products.length > 0 && (
                <div className="section">
                  <h2>🏆 Top 5 Produtos Mais Vendidos</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {dashboardData.top_products.map((product, index) => (
                      <div
                        key={product.id}
                        style={{
                          padding: '20px',
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                          borderRadius: '10px',
                          border: '2px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                          }}>
                            {index + 1}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{product.name}</div>
                            <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                              {product.total_quantity} unidades vendidas
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '1.1rem' }}>
                            {formatCurrency(product.total_revenue)}
                          </div>
                          <div style={{ color: '#6c757d', fontSize: '0.85rem' }}>Receita total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dashboardData.orders_by_status && dashboardData.orders_by_status.length > 0 && (
                <div className="section">
                  <h2>📊 Pedidos por Status</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    {dashboardData.orders_by_status.map((item) => (
                      <div
                        key={item.status}
                        style={{
                          padding: '20px',
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                          borderRadius: '10px',
                          border: '2px solid #e5e7eb',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>
                          {item.count}
                        </div>
                        <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                          {item.status_display || item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>Nenhum dado disponível</p>
            </div>
          )}
        </div>
      )}

      {/* Sales Report Tab */}
      {activeTab === 'sales' && (
        <div>
          <div className="section">
            <h2>Filtros</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data Inicial:</label>
                <input
                  type="date"
                  value={salesFilters.start_date}
                  onChange={(e) => setSalesFilters({ ...salesFilters, start_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data Final:</label>
                <input
                  type="date"
                  value={salesFilters.end_date}
                  onChange={(e) => setSalesFilters({ ...salesFilters, end_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Agrupar por:</label>
                <select
                  value={salesFilters.group_by}
                  onChange={(e) => setSalesFilters({ ...salesFilters, group_by: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                  <option value="day">Dia</option>
                  <option value="month">Mês</option>
                  <option value="year">Ano</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Método de Pagamento:</label>
                <select
                  value={salesFilters.payment_method}
                  onChange={(e) => setSalesFilters({ ...salesFilters, payment_method: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                  <option value="">Todos</option>
                  <option value="cash">Dinheiro</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                  <option value="bank_transfer">Transferência Bancária</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={loadSalesReport} disabled={loading}>
                {loading ? 'Carregando...' : 'Gerar Relatório'}
              </button>
              <button 
                className="btn" 
                onClick={exportSalesCSV} 
                disabled={loading}
                style={{ background: '#10b981', color: '#fff' }}
                title="Exportar para CSV"
              >
                📥 Exportar CSV
              </button>
              <button
                className="btn"
                onClick={() => {
                  const range = getDateRange(30);
                  setSalesFilters({ ...salesFilters, start_date: range.start, end_date: range.end });
                }}
              >
                Últimos 30 dias
              </button>
              <button
                className="btn"
                onClick={() => {
                  const range = getDateRange(7);
                  setSalesFilters({ ...salesFilters, start_date: range.start, end_date: range.end });
                }}
              >
                Últimos 7 dias
              </button>
            </div>
          </div>

          {salesData && (
            <div className="section">
              <h2>Relatório de Vendas</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard
                  title="Total de Vendas"
                  value={formatCurrency(salesData.summary.total_sales)}
                  subtitle={`${salesData.summary.total_orders} pedidos`}
                  icon="💰"
                  color="#10b981"
                />
              </div>

              {salesData.sales_by_method && salesData.sales_by_method.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3>Vendas por Método de Pagamento</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {salesData.sales_by_method.map((item) => (
                      <div
                        key={item.method}
                        style={{
                          padding: '15px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600' }}>{item.method_display}</div>
                          <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>{item.count} pagamentos</div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '1.1rem' }}>
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {salesData.sales_by_period && salesData.sales_by_period.length > 0 && (
                <div>
                  <h3>Vendas por Período</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Período</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Total</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Pedidos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.sales_by_period.map((item, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px' }}>{formatDate(item.period)}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {formatCurrency(item.total)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Products Report Tab */}
      {activeTab === 'products' && (
        <div>
          <div className="section">
            <h2>Filtros</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data Inicial:</label>
                <input
                  type="date"
                  value={productsFilters.start_date}
                  onChange={(e) => setProductsFilters({ ...productsFilters, start_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data Final:</label>
                <input
                  type="date"
                  value={productsFilters.end_date}
                  onChange={(e) => setProductsFilters({ ...productsFilters, end_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Limite:</label>
                <input
                  type="number"
                  value={productsFilters.limit}
                  onChange={(e) => setProductsFilters({ ...productsFilters, limit: parseInt(e.target.value) || 10 })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                  min="1"
                  max="50"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Categoria:</label>
                <select
                  value={productsFilters.category}
                  onChange={(e) => setProductsFilters({ ...productsFilters, category: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                  <option value="">Todas</option>
                  <option value="marmitas">Marmitas</option>
                  <option value="bebidas">Bebidas</option>
                  <option value="sobremesas">Sobremesas</option>
                  <option value="acompanhamentos">Acompanhamentos</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={loadProductsReport} disabled={loading}>
                {loading ? 'Carregando...' : 'Gerar Relatório'}
              </button>
              <button 
                className="btn" 
                onClick={exportProductsCSV} 
                disabled={loading}
                style={{ background: '#10b981', color: '#fff' }}
                title="Exportar para CSV"
              >
                📥 Exportar CSV
              </button>
            </div>
          </div>

          {productsData && (
            <div className="section">
              <h2>Relatório de Produtos</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard
                  title="Total Vendido"
                  value={productsData.summary.total_products_sold}
                  subtitle="unidades"
                  icon="📦"
                  color="#667eea"
                />
                <StatCard
                  title="Receita Total"
                  value={formatCurrency(productsData.summary.total_revenue)}
                  subtitle={`${productsData.summary.products_count} produtos`}
                  icon="💰"
                  color="#10b981"
                />
              </div>

              {productsData.products && productsData.products.length > 0 && (
                <div>
                  <h3>Produtos Mais Vendidos</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Produto</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Categoria</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Quantidade</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Pedidos</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Receita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productsData.products.map((product) => (
                          <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{product.name}</td>
                            <td style={{ padding: '12px', textTransform: 'capitalize' }}>{product.category}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>{product.total_quantity}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>{product.order_count}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                              {formatCurrency(product.total_revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Orders Report Tab */}
      {activeTab === 'orders' && (
        <div>
          <div className="section">
            <h2>Filtros</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data Inicial:</label>
                <input
                  type="date"
                  value={ordersFilters.start_date}
                  onChange={(e) => setOrdersFilters({ ...ordersFilters, start_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data Final:</label>
                <input
                  type="date"
                  value={ordersFilters.end_date}
                  onChange={(e) => setOrdersFilters({ ...ordersFilters, end_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Status:</label>
                <select
                  value={ordersFilters.status}
                  onChange={(e) => setOrdersFilters({ ...ordersFilters, status: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                  <option value="">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="preparing">Preparando</option>
                  <option value="ready">Pronto</option>
                  <option value="delivered">Entregue</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Aberto/Fechado:</label>
                <select
                  value={ordersFilters.is_open}
                  onChange={(e) => setOrdersFilters({ ...ordersFilters, is_open: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                  <option value="">Todos</option>
                  <option value="true">Abertos</option>
                  <option value="false">Fechados</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={loadOrdersReport} disabled={loading}>
                {loading ? 'Carregando...' : 'Gerar Relatório'}
              </button>
              <button 
                className="btn" 
                onClick={exportOrdersCSV} 
                disabled={loading}
                style={{ background: '#10b981', color: '#fff' }}
                title="Exportar para CSV"
              >
                📥 Exportar CSV
              </button>
            </div>
          </div>

          {ordersData && (
            <div className="section">
              <h2>Relatório de Pedidos</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard
                  title="Total de Pedidos"
                  value={ordersData.summary.total_orders}
                  subtitle={`${ordersData.summary.open_orders} abertos, ${ordersData.summary.closed_orders} fechados`}
                  icon="📦"
                  color="#667eea"
                />
                <StatCard
                  title="Valor Total"
                  value={formatCurrency(ordersData.summary.total_value)}
                  subtitle={`Média: ${formatCurrency(ordersData.summary.avg_order_value)}`}
                  icon="💰"
                  color="#10b981"
                />
                <StatCard
                  title="Com Pagamento"
                  value={ordersData.summary.orders_with_payment}
                  subtitle={`${ordersData.summary.orders_without_payment} sem pagamento`}
                  icon="✅"
                  color="#10b981"
                />
              </div>

              {ordersData.orders_by_status && ordersData.orders_by_status.length > 0 && (
                <div>
                  <h3>Pedidos por Status</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    {ordersData.orders_by_status.map((item) => (
                      <div
                        key={item.status}
                        style={{
                          padding: '20px',
                          background: '#f8f9fa',
                          borderRadius: '10px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>
                          {item.count}
                        </div>
                        <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                          {item.status_display || item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Financial Report Tab */}
      {activeTab === 'financial' && (
        <div>
          <div className="section">
            <h2>Filtros</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data Inicial:</label>
                <input
                  type="date"
                  value={financialFilters.start_date}
                  onChange={(e) => setFinancialFilters({ ...financialFilters, start_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data Final:</label>
                <input
                  type="date"
                  value={financialFilters.end_date}
                  onChange={(e) => setFinancialFilters({ ...financialFilters, end_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={loadFinancialReport} disabled={loading}>
                {loading ? 'Carregando...' : 'Gerar Relatório'}
              </button>
              <button 
                className="btn" 
                onClick={exportFinancialCSV} 
                disabled={loading}
                style={{ background: '#10b981', color: '#fff' }}
                title="Exportar para CSV"
              >
                📥 Exportar CSV
              </button>
              <button
                className="btn"
                onClick={() => {
                  const range = getDateRange(30);
                  setFinancialFilters({ ...financialFilters, start_date: range.start, end_date: range.end });
                }}
              >
                Últimos 30 dias
              </button>
            </div>
          </div>

          {financialData && (
            <div className="section">
              <h2>Relatório Financeiro</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard
                  title="Receita Total"
                  value={formatCurrency(financialData.summary.total_revenue)}
                  subtitle="Produtos + Taxas de Entrega"
                  icon="💰"
                  color="#10b981"
                />
                {financialData.summary.products_revenue !== undefined && (
                  <StatCard
                    title="Receita de Produtos"
                    value={formatCurrency(financialData.summary.products_revenue)}
                    subtitle="Apenas produtos vendidos"
                    icon="🛒"
                    color="#3b82f6"
                  />
                )}
                {financialData.summary.delivery_fees !== undefined && (
                  <StatCard
                    title="Taxas de Entrega"
                    value={formatCurrency(financialData.summary.delivery_fees)}
                    subtitle="Total de taxas cobradas"
                    icon="🚚"
                    color="#8b5cf6"
                  />
                )}
                <StatCard
                  title="Receita Pendente"
                  value={formatCurrency(financialData.summary.pending_revenue)}
                  subtitle="Aguardando pagamento"
                  icon="⏳"
                  color="#f59e0b"
                />
                <StatCard
                  title="Total de Pagamentos"
                  value={financialData.summary.total_payments}
                  subtitle={`${financialData.summary.completed_payments} completos, ${financialData.summary.pending_payments} pendentes`}
                  icon="💳"
                  color="#667eea"
                />
              </div>

              {financialData.revenue_by_method && financialData.revenue_by_method.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3>Receita por Método de Pagamento</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {financialData.revenue_by_method.map((item) => (
                      <div
                        key={item.method}
                        style={{
                          padding: '15px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600' }}>{item.method_display}</div>
                          <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>{item.count} pagamentos</div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '1.1rem' }}>
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {financialData.payments_by_status && financialData.payments_by_status.length > 0 && (
                <div>
                  <h3>Pagamentos por Status</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    {financialData.payments_by_status.map((item) => (
                      <div
                        key={item.status}
                        style={{
                          padding: '20px',
                          background: '#f8f9fa',
                          borderRadius: '10px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>
                          {formatCurrency(item.total)}
                        </div>
                        <div style={{ color: '#6c757d', fontSize: '0.9rem', marginBottom: '4px' }}>
                          {item.status_display}
                        </div>
                        <div style={{ color: '#95a5a6', fontSize: '0.85rem' }}>
                          {item.count} pagamentos
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {financialData.expenses_by_category && financialData.expenses_by_category.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3>Despesas por Categoria</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {financialData.expenses_by_category.map((item) => (
                      <div
                        key={item.category}
                        style={{
                          padding: '15px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600' }}>{item.category_display}</div>
                          <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>{item.count} despesas</div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '1.1rem' }}>
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expenses Report Tab */}
      {activeTab === 'expenses' && (
        <div>
          <div className="section">
            <h2>Filtros</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data Inicial:</label>
                <input
                  type="date"
                  value={expensesFilters.start_date}
                  onChange={(e) => setExpensesFilters({ ...expensesFilters, start_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data Final:</label>
                <input
                  type="date"
                  value={expensesFilters.end_date}
                  onChange={(e) => setExpensesFilters({ ...expensesFilters, end_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Categoria:</label>
                <select
                  value={expensesFilters.category}
                  onChange={(e) => setExpensesFilters({ ...expensesFilters, category: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                  <option value="">Todas</option>
                  <option value="ingredients">Ingredientes</option>
                  <option value="utilities">Utilidades</option>
                  <option value="rent">Aluguel</option>
                  <option value="salary">Salários</option>
                  <option value="delivery">Entrega</option>
                  <option value="marketing">Marketing</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="supplies">Suprimentos</option>
                  <option value="other">Outros</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={loadExpensesReport} disabled={loading}>
                {loading ? 'Carregando...' : 'Gerar Relatório'}
              </button>
              <button 
                className="btn" 
                onClick={exportExpensesCSV} 
                disabled={loading}
                style={{ background: '#10b981', color: '#fff' }}
                title="Exportar para CSV"
              >
                📥 Exportar CSV
              </button>
              <button
                className="btn"
                onClick={() => {
                  const range = getDateRange(30);
                  setExpensesFilters({ ...expensesFilters, start_date: range.start, end_date: range.end });
                }}
              >
                Últimos 30 dias
              </button>
            </div>
          </div>

          {expensesData && (
            <div className="section">
              <h2>Relatório de Despesas</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard
                  title="Total de Despesas"
                  value={formatCurrency(expensesData.summary.total_expenses)}
                  subtitle={`${expensesData.summary.total_count} despesas registradas`}
                  icon="💸"
                  color="#ef4444"
                />
                <StatCard
                  title="Média por Despesa"
                  value={formatCurrency(expensesData.summary.avg_expense)}
                  subtitle="Valor médio"
                  icon="📊"
                  color="#667eea"
                />
              </div>

              {expensesData.expenses_by_category && expensesData.expenses_by_category.length > 0 && (
                <div>
                  <h3>Despesas por Categoria</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    {expensesData.expenses_by_category.map((item) => (
                      <div
                        key={item.category}
                        style={{
                          padding: '20px',
                          background: '#f8f9fa',
                          borderRadius: '10px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px' }}>
                          {formatCurrency(item.total)}
                        </div>
                        <div style={{ color: '#6c757d', fontSize: '0.9rem', marginBottom: '4px' }}>
                          {item.category_display}
                        </div>
                        <div style={{ color: '#95a5a6', fontSize: '0.85rem' }}>
                          {item.count} despesas
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportsPanel;

