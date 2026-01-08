import { useState, useEffect } from 'react';
import { productService, orderService, userService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ReportsPanel from './ReportsPanel';
import Alert from './common/Alert';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { getErrorMessage, getValidationErrors } from '../utils/errorHandler';

function AdminPanel() {
  const { logout, user: currentUser } = useAuth();
  const [activeView, setActiveView] = useState('management'); // 'management', 'reports' ou 'users'
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('completed');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'marmitas',
    price: '',
    is_available: true,
  });
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    is_active: true,
    groups: [],
  });
  const [userValidationErrors, setUserValidationErrors] = useState({});

  useEffect(() => {
    if (activeView === 'management') {
      loadProducts();
      loadOrders();
    } else if (activeView === 'users') {
      loadUsers();
    }
  }, [paymentStatusFilter, activeView]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productService.getAll();
      const data = response.data?.data || response.data?.results || response.data;
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      if (editingProduct) {
        await productService.update(editingProduct.id, formData);
        setSuccess('Produto atualizado com sucesso!');
      } else {
        await productService.create(formData);
        setSuccess('Produto criado com sucesso!');
      }
      
      setFormData({ name: '', description: '', category: 'marmitas', price: '', is_available: true });
      setEditingProduct(null);
      await loadProducts();
      setSuccess(editingProduct ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category || 'marmitas',
      price: product.price,
      is_available: product.is_available,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      setLoading(true);
      await productService.delete(id);
      setSuccess('Produto excluído com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      await loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      // Filtrar apenas pedidos com pagamentos finalizados por padrão
      const params = paymentStatusFilter !== 'all' ? { payment_status: paymentStatusFilter } : {};
      const response = await orderService.getAll(params);
      setOrders(response.data.results || response.data);
    } catch (err) {
      setError('Erro ao carregar pedidos: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleDeleteOrder = async (id, order) => {
    // Verificar se o pedido tem pagamento completo
    if (order.payment_status === 'completed') {
      setError('Não é possível deletar um pedido com pagamento completo.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir o Pedido #${id}?\n\nEsta ação não pode ser desfeita!`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await orderService.delete(id);
      setSuccess('Pedido excluído com sucesso!');
      await loadOrders();
      // Limpar seleção se o pedido deletado estava selecionado
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
    } catch (err) {
      setError('Erro ao excluir pedido: ' + (err.response?.data?.error || err.response?.data?.detail || err.message));
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

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      confirmed: '#17a2b8',
      preparing: '#007bff',
      ready: '#28a745',
      delivered: '#6c757d',
      cancelled: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Pronto',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  // Funções para gerenciar usuários
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      setError(null);
      const response = await userService.getAll();
      const data = response.data?.data || response.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setUserValidationErrors({});
    
    // Validação básica
    if (userFormData.password && userFormData.password.length < 6) {
      setUserValidationErrors({ password: 'Senha deve ter pelo menos 6 caracteres' });
      return;
    }
    
    if (userFormData.password !== userFormData.password_confirm) {
      setUserValidationErrors({ password_confirm: 'As senhas não coincidem' });
      return;
    }

    try {
      setLoading(true);
      const userData = {
        username: userFormData.username,
        email: userFormData.email,
        first_name: userFormData.first_name,
        last_name: userFormData.last_name,
        is_active: userFormData.is_active,
        groups: userFormData.groups.length > 0 ? userFormData.groups : ['Caixa'],
      };
      
      // Adicionar senha apenas se estiver preenchida (para criação ou atualização)
      if (userFormData.password) {
        userData.password = userFormData.password;
        userData.password_confirm = userFormData.password_confirm;
      }
      
      if (editingUser) {
        if (userFormData.password) {
          await userService.patch(editingUser.id, userData);
        } else {
          // Se não tem senha, remover campos de senha
          delete userData.password;
          delete userData.password_confirm;
          await userService.patch(editingUser.id, userData);
        }
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        await userService.create(userData);
        setSuccess('Usuário criado com sucesso!');
      }
      
      setUserFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        password_confirm: '',
        is_active: true,
        groups: [],
      });
      setEditingUser(null);
      setUserValidationErrors({});
      await loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const validationErrs = getValidationErrors(err);
      if (Object.keys(validationErrs).length > 0) {
        setUserValidationErrors(validationErrs);
        setError('Por favor, corrija os erros no formulário');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      password: '',
      password_confirm: '',
      is_active: user.is_active !== false,
      groups: user.groups || [],
    });
    setUserValidationErrors({});
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) return;
    
    try {
      setLoading(true);
      await userService.delete(id);
      setSuccess('Usuário excluído com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Se estiver na view de relatórios, renderizar ReportsPanel
  if (activeView === 'reports') {
    return <ReportsPanel onNavigate={(view) => setActiveView(view)} />;
  }

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <h1>🍽️ Restaurante e Marmitaria da Angela</h1>
            <p>Painel Administrativo</p>
          </div>
          <button className="btn btn-danger" onClick={logout} style={{ boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
            Sair
          </button>
        </div>
      </div>

      {/* Navegação por abas */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '10px',
      }}>
        <button
          onClick={() => setActiveView('management')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeView === 'management'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#f8f9fa',
            color: activeView === 'management' ? '#fff' : '#495057',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: activeView === 'management' ? '600' : '400',
            fontSize: '0.95rem',
            transition: 'all 0.3s',
            boxShadow: activeView === 'management' ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
          }}
        >
          🛠️ Gerenciamento
        </button>
        <button
          onClick={() => setActiveView('users')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeView === 'users'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#f8f9fa',
            color: activeView === 'users' ? '#fff' : '#495057',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: activeView === 'users' ? '600' : '400',
            fontSize: '0.95rem',
            transition: 'all 0.3s',
            boxShadow: activeView === 'users' ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
          }}
        >
          👥 Usuários
        </button>
        <button
          onClick={() => setActiveView('reports')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeView === 'reports'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#f8f9fa',
            color: activeView === 'reports' ? '#fff' : '#495057',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: activeView === 'reports' ? '600' : '400',
            fontSize: '0.95rem',
            transition: 'all 0.3s',
            boxShadow: activeView === 'reports' ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
          }}
        >
          📊 Relatórios
        </button>
      </div>

      {error && (
        <Alert 
          type="error" 
          message={error} 
          onClose={() => setError(null)}
          autoClose={true}
          duration={5000}
        />
      )}
      {success && (
        <Alert 
          type="success" 
          message={success} 
          onClose={() => setSuccess(null)}
          autoClose={true}
          duration={3000}
        />
      )}

      {/* Seção de Gerenciamento (Produtos e Pedidos) */}
      {activeView === 'management' && (
        <>
      {/* Formulário de Produto */}
      <div className="section">
        <h2>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Descrição:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>Categoria:</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: '100%', padding: '10px' }}
            >
              <option value="marmitas">Marmitas</option>
              <option value="bebidas">Bebidas</option>
              <option value="sobremesas">Sobremesas</option>
              <option value="acompanhamentos">Acompanhamentos</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div className="form-group">
            <label>Preço:</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              />
              {' '}Disponível
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {editingProduct ? 'Atualizar' : 'Criar'} Produto
          </button>
          {editingProduct && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditingProduct(null);
                setFormData({ name: '', description: '', category: 'marmitas', price: '', is_available: true });
              }}
              style={{ marginLeft: '10px' }}
            >
              Cancelar
            </button>
          )}
        </form>
      </div>

      {/* Lista de Produtos */}
      <div className="section">
        <h2>Produtos Cadastrados</h2>
        {loading && !products.length ? (
          <LoadingSpinner message="Carregando produtos..." />
        ) : products.length === 0 ? (
          <EmptyState 
            icon="📦"
            title="Nenhum produto cadastrado"
            message="Comece adicionando seu primeiro produto usando o formulário acima."
          />
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <h3>{product.name}</h3>
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: '#667eea', 
                  marginBottom: '8px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {product.category_display || product.category || 'Sem categoria'}
                </div>
                {product.description && (
                  <p className="description">{product.description}</p>
                )}
                <div className="price" style={{ 
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: 'var(--success-color)',
                  margin: '12px 0'
                }}>
                  {formatCurrency(product.price)}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: product.is_available 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)' 
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
                    color: product.is_available ? '#065f46' : '#991b1b',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    border: `1px solid ${product.is_available ? '#10b981' : '#ef4444'}`,
                    display: 'inline-block'
                  }}>
                    {product.is_available ? '✓ Disponível' : '✕ Indisponível'}
                  </span>
                </div>
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleEdit(product)}
                    style={{ flex: 1 }}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(product.id)}
                    style={{ flex: 1 }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de Pedidos */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Histórico de Pedidos</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.9rem' }}>Pagamento:</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ddd' }}
            >
              <option value="completed">Finalizados</option>
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="none">Sem pagamento</option>
            </select>
            <label style={{ fontSize: '0.9rem' }}>Status do pedido:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ddd' }}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="preparing">Preparando</option>
              <option value="ready">Pronto</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <button
              className="btn btn-primary"
              onClick={loadOrders}
              disabled={loadingOrders}
              style={{ padding: '8px 15px' }}
            >
              {loadingOrders ? 'Carregando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        {loadingOrders && !orders.length ? (
          <LoadingSpinner message="Carregando pedidos..." />
        ) : filteredOrders.length === 0 ? (
          <EmptyState 
            icon="📋"
            title="Nenhum pedido encontrado"
            message={`Não há pedidos com os filtros selecionados.`}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  border: `2px solid ${selectedOrder?.id === order.id ? '#667eea' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  padding: '24px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: selectedOrder?.id === order.id 
                    ? '0 10px 25px rgba(102, 126, 234, 0.2)' 
                    : '0 2px 8px rgba(0,0,0,0.08)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                onMouseEnter={(e) => {
                  if (selectedOrder?.id !== order.id) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedOrder?.id !== order.id) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>
                      Pedido #{order.id}
                    </h3>
                    <p style={{ margin: '5px 0', color: '#7f8c8d', fontSize: '0.9rem' }}>
                      Cliente: {order.customer_username || order.customer || 'N/A'}
                    </p>
                    <p style={{ margin: '5px 0', color: '#7f8c8d', fontSize: '0.9rem' }}>
                      Data: {formatDateTime(order.created_at)}
                    </p>
                    {order.payment_method_display && (
                      <p style={{ margin: '5px 0', color: '#7f8c8d', fontSize: '0.9rem' }}>
                        Pagamento: {order.payment_method_display}
                        {order.payment_status_display && (
                          <span style={{ marginLeft: '8px', color: order.payment_status === 'completed' ? '#28a745' : order.payment_status === 'pending' ? '#ffc107' : '#dc3545' }}>
                            ({order.payment_status_display})
                          </span>
                        )}
                      </p>
                    )}
                    {order.updated_at !== order.created_at && (
                      <p style={{ margin: '5px 0', color: '#7f8c8d', fontSize: '0.85rem' }}>
                        Atualizado: {formatDateTime(order.updated_at)}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${getStatusColor(order.status)}20 0%, ${getStatusColor(order.status)}10 100%)`,
                      color: getStatusColor(order.status),
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      display: 'inline-block',
                      marginBottom: '12px',
                      border: `2px solid ${getStatusColor(order.status)}40`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: `0 2px 8px ${getStatusColor(order.status)}20`
                    }}>
                      {getStatusLabel(order.status)}
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#2c3e50' }}>
                      {formatCurrency((parseFloat(order.total) || 0) + (parseFloat(order.delivery_fee) || 0))}
                    </div>
                    {order.delivery_fee && parseFloat(order.delivery_fee) > 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '5px' }}>
                        <span style={{ color: '#6c757d' }}>Subtotal: {formatCurrency(parseFloat(order.total) || 0)}</span>
                        <br />
                        <span style={{ color: '#8b5cf6', fontWeight: '600' }}>Taxa de entrega: {formatCurrency(parseFloat(order.delivery_fee) || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {order.notes && (
                  <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                    <strong>Observações:</strong> {order.notes}
                  </div>
                )}

                {order.delivery_address && (
                  <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                    <strong>Endereço de entrega:</strong> {order.delivery_address}
                  </div>
                )}

                {/* Botão de deletar - apenas para pedidos não pagos */}
                {order.payment_status !== 'completed' && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '15px', 
                    right: '15px',
                    zIndex: 10
                  }}>
                    <button
                      className="btn btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOrder(order.id, order);
                      }}
                      disabled={loading}
                      style={{ 
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                        borderRadius: '6px',
                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
                      }}
                      title="Deletar pedido"
                    >
                      🗑️ Deletar
                    </button>
                  </div>
                )}

                {selectedOrder?.id === order.id && (
                  <div style={{
                    marginTop: '15px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '5px',
                    borderTop: '2px solid #3498db'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Itens do Pedido:</h4>
                    {order.items && order.items.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px',
                              backgroundColor: '#fff',
                              borderRadius: '5px',
                              border: '1px solid #e0e0e0'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                                {item.product?.name || 'Produto não encontrado'}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                                {item.quantity}x {formatCurrency(item.price)} = {formatCurrency(item.subtotal)}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div style={{
                          marginTop: '10px',
                          padding: '10px',
                          backgroundColor: '#e8f5e9',
                          borderRadius: '5px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          fontSize: '1.1rem'
                        }}>
                          <div style={{ marginBottom: order.delivery_fee && parseFloat(order.delivery_fee) > 0 ? '5px' : '0' }}>
                            Subtotal: {formatCurrency(parseFloat(order.total) || 0)}
                          </div>
                          {order.delivery_fee && parseFloat(order.delivery_fee) > 0 && (
                            <div style={{ marginBottom: '5px', color: '#8b5cf6', fontSize: '0.95rem' }}>
                              Taxa de entrega: {formatCurrency(parseFloat(order.delivery_fee) || 0)}
                            </div>
                          )}
                          <div style={{ borderTop: '2px solid #4caf50', paddingTop: '5px', marginTop: '5px' }}>
                            Total: {formatCurrency((parseFloat(order.total) || 0) + (parseFloat(order.delivery_fee) || 0))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Nenhum item neste pedido</p>
                    )}
                  </div>
                )}

                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#95a5a6', textAlign: 'center' }}>
                  {selectedOrder?.id === order.id ? 'Clique para ocultar detalhes' : 'Clique para ver detalhes'}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredOrders.length > 0 && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '5px', textAlign: 'center' }}>
            <strong>Total de pedidos: {filteredOrders.length}</strong>
            {statusFilter !== 'all' && (
              <span style={{ marginLeft: '10px', color: '#7f8c8d' }}>
                (Filtrado por: {getStatusLabel(statusFilter)})
              </span>
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* Seção de Gerenciamento de Usuários */}
      {activeView === 'users' && (
        <>
          {/* Formulário de Usuário */}
          <div className="section">
            <h2>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
            <form onSubmit={handleUserSubmit}>
              <div className="form-group">
                <label>Usuário:</label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  required
                  disabled={!!editingUser}
                />
                {userValidationErrors.username && (
                  <span style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                    {userValidationErrors.username}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  required
                />
                {userValidationErrors.email && (
                  <span style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                    {userValidationErrors.email}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Nome:</label>
                  <input
                    type="text"
                    value={userFormData.first_name}
                    onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Sobrenome:</label>
                  <input
                    type="text"
                    value={userFormData.last_name}
                    onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Senha {editingUser && '(deixe em branco para não alterar)'}:</label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  required={!editingUser}
                  minLength={6}
                />
                {userValidationErrors.password && (
                  <span style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                    {userValidationErrors.password}
                  </span>
                )}
              </div>
              {(!editingUser || userFormData.password) && (
                <div className="form-group">
                  <label>Confirmar Senha:</label>
                  <input
                    type="password"
                    value={userFormData.password_confirm}
                    onChange={(e) => setUserFormData({ ...userFormData, password_confirm: e.target.value })}
                    required={!editingUser || !!userFormData.password}
                    minLength={6}
                  />
                  {userValidationErrors.password_confirm && (
                    <span style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                      {userValidationErrors.password_confirm}
                    </span>
                  )}
                </div>
              )}
              <div className="form-group">
                <label>Grupos:</label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={userFormData.groups.includes('Admin')}
                      onChange={(e) => {
                        const groups = [...userFormData.groups];
                        if (e.target.checked) {
                          if (!groups.includes('Admin')) groups.push('Admin');
                          const caixaIndex = groups.indexOf('Caixa');
                          if (caixaIndex > -1) groups.splice(caixaIndex, 1);
                        } else {
                          const index = groups.indexOf('Admin');
                          if (index > -1) groups.splice(index, 1);
                        }
                        setUserFormData({ ...userFormData, groups });
                      }}
                    />
                    Admin
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={userFormData.groups.includes('Caixa')}
                      onChange={(e) => {
                        const groups = [...userFormData.groups];
                        if (e.target.checked) {
                          if (!groups.includes('Caixa')) groups.push('Caixa');
                          const adminIndex = groups.indexOf('Admin');
                          if (adminIndex > -1) groups.splice(adminIndex, 1);
                        } else {
                          const index = groups.indexOf('Caixa');
                          if (index > -1) groups.splice(index, 1);
                        }
                        setUserFormData({ ...userFormData, groups });
                      }}
                    />
                    Caixa
                  </label>
                </div>
                {userFormData.groups.length === 0 && (
                  <span style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                    ⚠️ Selecione pelo menos um grupo. Se nenhum for selecionado, será adicionado ao grupo Caixa por padrão.
                  </span>
                )}
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={userFormData.is_active}
                    onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                  />
                  {' '}Usuário ativo
                </label>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {editingUser ? 'Atualizar' : 'Criar'} Usuário
              </button>
              {editingUser && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditingUser(null);
                    setUserFormData({
                      username: '',
                      email: '',
                      first_name: '',
                      last_name: '',
                      password: '',
                      password_confirm: '',
                      is_active: true,
                      groups: [],
                    });
                    setUserValidationErrors({});
                  }}
                  style={{ marginLeft: '10px' }}
                >
                  Cancelar
                </button>
              )}
            </form>
          </div>

          {/* Lista de Usuários */}
          <div className="section">
            <h2>Usuários Cadastrados</h2>
            {loadingUsers && !users.length ? (
              <LoadingSpinner message="Carregando usuários..." />
            ) : users.length === 0 ? (
              <EmptyState 
                icon="👥"
                title="Nenhum usuário cadastrado"
                message="Comece adicionando seu primeiro usuário usando o formulário acima."
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {users.map((user) => (
                  <div key={user.id} className="product-card" style={{ position: 'relative' }}>
                    <h3>{user.full_name || user.username}</h3>
                    <p style={{ color: '#7f8c8d', fontSize: '0.9rem', margin: '5px 0' }}>
                      @{user.username}
                    </p>
                    {user.email && (
                      <p style={{ color: '#7f8c8d', fontSize: '0.85rem', margin: '5px 0' }}>
                        📧 {user.email}
                      </p>
                    )}
                    <div style={{ marginTop: '10px' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: user.is_admin 
                          ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)' 
                          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
                        color: user.is_admin ? '#667eea' : '#065f46',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        border: `1px solid ${user.is_admin ? '#667eea' : '#10b981'}`,
                        display: 'inline-block',
                        marginRight: '8px'
                      }}>
                        {user.is_admin ? '👑 Admin' : '💰 Caixa'}
                      </span>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: user.is_active 
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)' 
                          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
                        color: user.is_active ? '#065f46' : '#991b1b',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        border: `1px solid ${user.is_active ? '#10b981' : '#ef4444'}`,
                        display: 'inline-block'
                      }}>
                        {user.is_active ? '✓ Ativo' : '✕ Inativo'}
                      </span>
                    </div>
                    {user.groups && user.groups.length > 0 && (
                      <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#7f8c8d' }}>
                        Grupos: {user.groups.join(', ')}
                      </p>
                    )}
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleEditUser(user)}
                        style={{ flex: 1 }}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        style={{ flex: 1 }}
                        disabled={user.id === currentUser?.userId}
                        title={user.id === currentUser?.userId ? 'Você não pode deletar seu próprio usuário' : ''}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminPanel;

