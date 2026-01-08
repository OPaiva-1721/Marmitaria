import { useState, useEffect } from 'react';
import { productService, orderService, paymentService, expenseService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Alert from './common/Alert';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';
import { formatCurrency, formatPhone, formatZipcode, formatDateTime } from '../utils/formatters';
import { getErrorMessage } from '../utils/errorHandler';

function CaixaPanel() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('pedidos'); // 'pedidos' ou 'saidas'
  const [products, setProducts] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState('delivery'); // 'delivery' ou 'pickup'
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryNumber, setDeliveryNumber] = useState('');
  const [deliveryComplement, setDeliveryComplement] = useState('');
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState('');
  const [deliveryZipcode, setDeliveryZipcode] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [productQuantities, setProductQuantities] = useState({}); // Estado para quantidades selecionadas

  // Carregar produtos e criar pedido inicial
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      await loadProducts();
      // Criar pedido apenas uma vez ao montar o componente
      if (mounted && !currentOrder) {
        await createNewOrder();
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez ao montar

  // Carregar itens do pedido quando o ID do pedido mudar
  useEffect(() => {
    if (currentOrder?.id) {
      // Carregar itens sempre que o pedido mudar
      console.log('Pedido mudou, carregando itens para pedido:', currentOrder.id);
      loadOrderItems();
    }
  }, [currentOrder?.id]); // Usar apenas o ID para evitar loops

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAll();
      const data = response.data?.data || response.data?.results || response.data;
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadOrderItems = async () => {
    if (!currentOrder?.id) {
      console.log('loadOrderItems: currentOrder ou ID não existe', currentOrder);
      return;
    }
    try {
      const response = await orderService.getById(currentOrder.id);
      
      // Extrair dados do pedido (pode estar em response.data ou response.data.data)
      const orderData = response.data?.data || response.data;
      
      if (!orderData) {
        console.error('Resposta inválida ao carregar pedido:', response);
        setError('Erro ao carregar pedido: resposta inválida do servidor');
        return;
      }
      
      const items = orderData.items || [];
      console.log('Itens carregados:', items.length, items);
      setOrderItems(items);
      
      // Carregar taxa de entrega se existir
      if (orderData.delivery_fee !== undefined) {
        setDeliveryFee(parseFloat(orderData.delivery_fee || 0));
      }
      
      // Atualizar apenas o total se mudou, sem recriar o objeto para evitar loops
      setCurrentOrder(prev => {
        if (prev && prev.id === currentOrder.id && prev.total !== orderData.total) {
          return { ...prev, total: orderData.total, delivery_fee: orderData.delivery_fee };
        }
        return prev;
      });
    } catch (err) {
      console.error('Erro ao carregar itens do pedido:', err);
      setError('Erro ao carregar itens do pedido: ' + (err.response?.data?.detail || err.message));
    }
  };

  const createNewOrder = async () => {
    // Evitar criar múltiplos pedidos simultaneamente
    if (currentOrder) {
      return; // Já existe um pedido ativo
    }
    
    try {
      setLoading(true);
      setError(null);
      // Criar pedido - o backend criará/usará cliente padrão automaticamente
      const notes = buildNotes();
      const deliveryAddress = buildDeliveryAddress();
      
      const response = await orderService.create({
        notes: notes,
        delivery_address: deliveryAddress,
        delivery_fee: orderType === 'delivery' ? parseFloat(deliveryFee || 0) : 0,
      });
      
      // Extrair dados do pedido (pode estar em response.data ou response.data.data)
      const orderData = response.data?.data || response.data;
      
      if (!orderData || !orderData.id) {
        console.error('Resposta inválida ao criar pedido:', response);
        setError('Erro ao criar pedido: resposta inválida do servidor');
        return;
      }
      
      setCurrentOrder(orderData);
      // Limpar campos
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryStreet('');
      setDeliveryNumber('');
      setDeliveryComplement('');
      setDeliveryNeighborhood('');
      setDeliveryZipcode('');
      setDeliveryReference('');
      setDeliveryFee(orderData.delivery_fee ? parseFloat(orderData.delivery_fee) : 0);
      setOrderType('delivery');
      setOrderItems([]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const addItemToOrder = async (productId, quantity) => {
    if (!currentOrder || !currentOrder.id) {
      setError('Erro: Pedido não encontrado ou ID inválido');
      console.error('currentOrder:', currentOrder);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const orderId = currentOrder.id;
      console.log('Adicionando item ao pedido:', orderId, 'Produto:', productId, 'Quantidade:', quantity);
      
      if (!orderId || orderId === 'undefined') {
        setError('Erro: ID do pedido inválido. Por favor, crie um novo pedido.');
        return;
      }
      
      const addItemResponse = await orderService.addItem(orderId, {
        product_id: productId,
        quantity: parseInt(quantity),
      });
      
      console.log('Resposta ao adicionar item:', addItemResponse);
      
      setSuccess('Item adicionado!');
      setTimeout(() => setSuccess(null), 2000);
      
      // Recarregar itens imediatamente após adicionar
      await loadOrderItems();
      
      // Forçar atualização visual
      setOrderItems(prev => {
        // Isso força o React a re-renderizar
        return [...prev];
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const removeItemFromOrder = async (itemId) => {
    if (!currentOrder) {
      setError('Erro: Pedido não encontrado');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await orderService.removeItem(itemId);
      setSuccess('Item removido!');
      setTimeout(() => setSuccess(null), 2000);
      // Recarregar itens sem atualizar o objeto currentOrder inteiro
      const orderResponse = await orderService.getById(currentOrder.id);
      
      // Extrair dados do pedido (pode estar em response.data ou response.data.data)
      const orderData = orderResponse.data?.data || orderResponse.data;
      
      if (orderData) {
        console.log('Itens após remover:', orderData.items);
        setOrderItems(orderData.items || []);
        setCurrentOrder(prev => ({
          ...prev,
          total: orderData.total
        }));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const finalizePayment = async () => {
    if (!currentOrder) {
      setError('Erro: Pedido não encontrado');
      return;
    }

    if (orderItems.length === 0) {
      setError('Adicione itens ao pedido antes de finalizar!');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Atualizar informações do pedido
      const notes = buildNotes();
      const deliveryAddress = buildDeliveryAddress();
      const feeToSave = orderType === 'delivery' ? parseFloat(deliveryFee || 0) : 0;
      
      console.log('Atualizando pedido com taxa de entrega:', feeToSave, 'Tipo:', orderType);
      
      await orderService.update(currentOrder.id, {
        notes: notes,
        delivery_address: deliveryAddress,
        delivery_fee: feeToSave,
      });

      // Recarregar o pedido para garantir que temos os dados atualizados (incluindo delivery_fee)
      const orderResponse = await orderService.getById(currentOrder.id);
      const orderData = orderResponse.data?.data || orderResponse.data;
      
      console.log('Pedido recarregado após atualização:', orderData);
      console.log('Taxa de entrega no pedido:', orderData?.delivery_fee);
      
      // Atualizar o estado do pedido com os dados atualizados
      if (orderData) {
        setCurrentOrder(orderData);
        // Atualizar a taxa de entrega no estado também
        if (orderData.delivery_fee !== undefined) {
          setDeliveryFee(parseFloat(orderData.delivery_fee || 0));
        }
      }

      // Preparar notas do pagamento incluindo taxa de entrega se houver
      let paymentNotes = `Pagamento via ${paymentMethod.toUpperCase()}`;
      const finalDeliveryFee = orderData?.delivery_fee || feeToSave;
      if (orderType === 'delivery' && finalDeliveryFee > 0) {
        paymentNotes += ` | Taxa de entrega: ${formatCurrency(finalDeliveryFee)}`;
      }
      
      if (orderData?.payment) {
        setError('Este pedido já possui um pagamento. Não é possível criar outro.');
        setLoading(false);
        return;
      }

      console.log('Criando pagamento para pedido:', currentOrder.id, 'Método:', paymentMethod);
      const paymentResponse = await paymentService.create({
        order: currentOrder.id,
        method: paymentMethod,
        notes: paymentNotes,
      });

      // Extrair dados do pagamento (pode estar em response.data ou response.data.data)
      const paymentData = paymentResponse.data?.data || paymentResponse.data;
      
      if (!paymentData || !paymentData.id) {
        console.error('Resposta inválida ao criar pagamento:', paymentResponse);
        setError('Erro ao criar pagamento: resposta inválida do servidor');
        setLoading(false);
        return;
      }

      console.log('Pagamento criado com sucesso. ID:', paymentData.id);
      await paymentService.finalize(paymentData.id);

      setSuccess('Pagamento finalizado com sucesso!');
      
      // Limpar estado atual
      setCurrentOrder(null);
      setOrderItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryStreet('');
      setDeliveryNumber('');
      setDeliveryComplement('');
      setDeliveryNeighborhood('');
      setDeliveryZipcode('');
      setDeliveryReference('');
      setDeliveryFee(0);
      setOrderType('delivery');
      
      // Criar novo pedido após finalizar (aguardar um pouco para mostrar mensagem)
      setTimeout(async () => {
        setSuccess(null);
        // Forçar criação de novo pedido (ignorar verificação de currentOrder)
        try {
          setLoading(true);
          const response = await orderService.create({
            notes: '',
            delivery_address: '',
          });
          
          // Extrair dados do pedido (pode estar em response.data ou response.data.data)
          const orderData = response.data?.data || response.data;
          
          if (!orderData || !orderData.id) {
            console.error('Resposta inválida ao criar pedido:', response);
            setError('Erro ao criar pedido: resposta inválida do servidor');
            return;
          }
          
          console.log('Novo pedido criado com ID:', orderData.id);
          setCurrentOrder(orderData);
          setOrderItems([]);
          // Limpar campos
          setCustomerName('');
          setCustomerPhone('');
          setDeliveryStreet('');
          setDeliveryNumber('');
          setDeliveryComplement('');
          setDeliveryNeighborhood('');
          setDeliveryZipcode('');
          setDeliveryReference('');
          setDeliveryFee(0);
          setOrderType('delivery');
        } catch (err) {
          setError(getErrorMessage(err));
        } finally {
          setLoading(false);
        }
      }, 1500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };


  // Construir notas do pedido
  const buildNotes = () => {
    const parts = [];
    if (customerName) parts.push(`Cliente: ${customerName}`);
    if (customerPhone) parts.push(`Telefone: ${customerPhone}`);
    if (deliveryReference) parts.push(`Referência: ${deliveryReference}`);
    return parts.join(' | ');
  };

  // Construir endereço completo
  const buildDeliveryAddress = () => {
    if (orderType === 'pickup') return 'Retirada no local';
    
    const parts = [];
    if (deliveryStreet) {
      parts.push(deliveryStreet);
      if (deliveryNumber) parts.push(`nº ${deliveryNumber}`);
      if (deliveryComplement) parts.push(`- ${deliveryComplement}`);
    }
    if (deliveryNeighborhood) parts.push(deliveryNeighborhood);
    if (deliveryZipcode) parts.push(`CEP: ${deliveryZipcode}`);
    
    return parts.length > 0 ? parts.join(', ') : '';
  };

  // Calcular total com taxa de entrega
  const calculateTotal = () => {
    const subtotal = parseFloat(currentOrder?.total || 0);
    const fee = orderType === 'delivery' ? parseFloat(deliveryFee || 0) : 0;
    return subtotal + fee;
  };

  // Agrupar produtos por categoria
  const productsByCategory = products.reduce((acc, product) => {
    const category = product.category || 'outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {});

  // Mapear nomes das categorias
  const categoryNames = {
    'marmitas': 'Marmitas',
    'bebidas': 'Bebidas',
    'sobremesas': 'Sobremesas',
    'acompanhamentos': 'Acompanhamentos',
    'outros': 'Outros'
  };

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <h1>🍽️ Restaurante e Marmitaria da Angela</h1>
            <p>Caixa - Sistema de Pedidos</p>
          </div>
          <button className="btn btn-danger" onClick={logout} style={{ boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
            Sair
          </button>
        </div>
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

      {/* Sistema de Abas */}
      <div className="section" style={{ marginBottom: '20px', padding: '0' }}>
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          borderBottom: '2px solid #e5e7eb',
          padding: '0 20px'
        }}>
          <button
            onClick={() => setActiveTab('pedidos')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              fontSize: '1rem',
              fontWeight: '600',
              color: activeTab === 'pedidos' ? '#667eea' : '#6b7280',
              borderBottom: activeTab === 'pedidos' ? '3px solid #667eea' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: '-2px'
            }}
          >
            🛒 Pedidos
          </button>
          <button
            onClick={() => setActiveTab('saidas')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              fontSize: '1rem',
              fontWeight: '600',
              color: activeTab === 'saidas' ? '#667eea' : '#6b7280',
              borderBottom: activeTab === 'saidas' ? '3px solid #667eea' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: '-2px'
            }}
          >
            💸 Saídas
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba de Pedidos */}
      {activeTab === 'pedidos' && (
        <>
      {/* Seção: Informações do Pedido */}
      <div className="section">
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0 }}>Pedido #{currentOrder?.id || '...'}</h2>
              {currentOrder && (
                <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '0.9rem' }}>
                  Criado em: {formatDateTime(currentOrder.created_at)}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '600' }}>
                  Tipo de Pedido:
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: '2px solid #e5e7eb',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="delivery">🚚 Entrega</option>
                  <option value="pickup">🏪 Retirada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Informações do Cliente */}
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid rgba(102, 126, 234, 0.2)',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#1f2937' }}>
              📱 Informações do Cliente (WhatsApp)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                  Nome do Cliente:
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: João Silva"
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                  Telefone/WhatsApp:
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setCustomerPhone(formatted);
                  }}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Endereço de Entrega - Mostrar apenas se for entrega */}
          {orderType === 'delivery' && (
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
              padding: '20px',
              borderRadius: '12px',
              border: '2px solid rgba(34, 197, 94, 0.2)',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#1f2937' }}>
                🏠 Endereço de Entrega
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                    Rua/Avenida:
                  </label>
                  <input
                    type="text"
                    value={deliveryStreet}
                    onChange={(e) => setDeliveryStreet(e.target.value)}
                    placeholder="Ex: Rua das Flores"
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                    Número:
                  </label>
                  <input
                    type="text"
                    value={deliveryNumber}
                    onChange={(e) => setDeliveryNumber(e.target.value)}
                    placeholder="123"
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                    CEP:
                  </label>
                  <input
                    type="text"
                    value={deliveryZipcode}
                    onChange={(e) => {
                      const formatted = formatZipcode(e.target.value);
                      setDeliveryZipcode(formatted);
                    }}
                    placeholder="01234-567"
                    maxLength={9}
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                    Complemento:
                  </label>
                  <input
                    type="text"
                    value={deliveryComplement}
                    onChange={(e) => setDeliveryComplement(e.target.value)}
                    placeholder="Ex: Apto 45, Bloco B"
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                    Bairro:
                  </label>
                  <input
                    type="text"
                    value={deliveryNeighborhood}
                    onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                    placeholder="Ex: Centro"
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                  Ponto de Referência:
                </label>
                <input
                  type="text"
                  value={deliveryReference}
                  onChange={(e) => setDeliveryReference(e.target.value)}
                  placeholder="Ex: Próximo ao mercado, casa amarela"
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }} className="caixa-grid">
        {/* Coluna Esquerda: Produtos por Categoria */}
        <div className="section">
          <h2>Produtos Disponíveis</h2>
          {loading && !products.length ? (
            <LoadingSpinner message="Carregando produtos..." />
          ) : products.length === 0 ? (
            <EmptyState 
              icon="📦"
              title="Nenhum produto disponível"
              message="Não há produtos cadastrados no momento. Entre em contato com o administrador."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.keys(productsByCategory).map((category) => (
                <div key={category} style={{ 
                  border: '2px solid #e5e7eb', 
                  borderRadius: '12px', 
                  padding: '20px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease'
                }}>
                  <h3 style={{ 
                    margin: '0 0 18px 0', 
                    fontSize: '1.3rem', 
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: '700'
                  }}>
                    {categoryNames[category] || category}
                    <span style={{ 
                      fontSize: '0.85rem', 
                      color: '#6b7280', 
                      fontWeight: '500',
                      padding: '4px 10px',
                      background: 'rgba(102, 126, 234, 0.1)',
                      borderRadius: '12px',
                      border: '1px solid rgba(102, 126, 234, 0.2)'
                    }}>
                      {productsByCategory[category].length} {productsByCategory[category].length === 1 ? 'produto' : 'produtos'}
                    </span>
                  </h3>
                  
                  {/* Grid de produtos com controles de quantidade */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '12px',
                    marginTop: '10px'
                  }}>
                    {productsByCategory[category].map((product) => {
                      const productId = product.id;
                      const quantity = productQuantities[productId] || 0;
                      
                      return (
                        <div
                          key={productId}
                          onClick={(e) => {
                            // Se clicar no card e não tiver quantidade selecionada, adiciona 1 rapidamente
                            if (quantity === 0 && !e.target.closest('button')) {
                              addItemToOrder(productId, 1);
                            }
                          }}
                          style={{
                            background: quantity > 0 
                              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                              : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                            border: quantity > 0 
                              ? '2px solid #667eea'
                              : '2px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '16px',
                            transition: 'all 0.3s ease',
                            cursor: quantity === 0 ? 'pointer' : 'default',
                            boxShadow: quantity > 0 
                              ? '0 4px 12px rgba(102, 126, 234, 0.2)'
                              : '0 2px 8px rgba(0,0,0,0.06)'
                          }}
                          onMouseEnter={(e) => {
                            if (quantity === 0) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                              e.currentTarget.style.borderColor = '#667eea';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (quantity === 0) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }
                          }}
                        >
                          {/* Nome e preço do produto */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ 
                              fontWeight: '700', 
                              fontSize: '1rem', 
                              color: '#1f2937',
                              marginBottom: '4px'
                            }}>
                              {product.name}
                            </div>
                            {product.description && (
                              <div style={{ 
                                fontSize: '0.85rem', 
                                color: '#6b7280',
                                marginBottom: '6px',
                                lineHeight: '1.4',
                                fontStyle: 'italic'
                              }}>
                                {product.description}
                              </div>
                            )}
                            <div style={{ 
                              fontSize: '1.1rem', 
                              fontWeight: 'bold', 
                              color: '#667eea'
                            }}>
                              {formatCurrency(product.price)}
                            </div>
                          </div>
                          
                          {/* Controles de quantidade */}
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            gap: '8px'
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (quantity > 0) {
                                  setProductQuantities(prev => ({
                                    ...prev,
                                    [productId]: quantity - 1
                                  }));
                                }
                              }}
                              disabled={quantity === 0 || loading || !currentOrder}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                border: '2px solid #e5e7eb',
                                background: quantity > 0 ? '#ffffff' : '#f3f4f6',
                                color: quantity > 0 ? '#667eea' : '#9ca3af',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                cursor: quantity > 0 ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (quantity > 0) {
                                  e.currentTarget.style.background = '#fee2e2';
                                  e.currentTarget.style.borderColor = '#ef4444';
                                  e.currentTarget.style.color = '#ef4444';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (quantity > 0) {
                                  e.currentTarget.style.background = '#ffffff';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                  e.currentTarget.style.color = '#667eea';
                                }
                              }}
                            >
                              −
                            </button>
                            
                            <div style={{
                              flex: 1,
                              textAlign: 'center',
                              fontSize: '1.2rem',
                              fontWeight: 'bold',
                              color: quantity > 0 ? '#667eea' : '#9ca3af',
                              minWidth: '40px',
                              padding: '8px 4px'
                            }}>
                              {quantity}
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductQuantities(prev => ({
                                  ...prev,
                                  [productId]: (prev[productId] || 0) + 1
                                }));
                              }}
                              disabled={loading || !currentOrder}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                border: '2px solid #667eea',
                                background: '#667eea',
                                color: '#ffffff',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#5568d3';
                                e.currentTarget.style.borderColor = '#5568d3';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#667eea';
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              +
                            </button>
                          </div>
                          
                          {/* Botão de adicionar ao pedido */}
                          {quantity > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addItemToOrder(productId, quantity);
                                setProductQuantities(prev => {
                                  const newState = { ...prev };
                                  delete newState[productId];
                                  return newState;
                                });
                              }}
                              disabled={loading || !currentOrder}
                              className="btn btn-success"
                              style={{
                                width: '100%',
                                marginTop: '12px',
                                padding: '10px',
                                fontSize: '0.95rem',
                                fontWeight: 'bold',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                              }}
                            >
                              Adicionar {quantity}x
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna Direita: Itens do Pedido e Total */}
        <div className="section">
          <h2>Itens do Pedido</h2>
          {orderItems.length === 0 ? (
            <EmptyState 
              icon="🛒"
              title="Carrinho vazio"
              message="Adicione produtos da lista ao lado para começar o pedido."
            />
          ) : (
            <>
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                {orderItems.map((item) => (
                  <div key={item.id} style={{ 
                    padding: '14px 16px', 
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    background: '#ffffff',
                    transition: 'all 0.2s ease',
                    border: '1px solid #e5e7eb'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong>{item.product?.name || 'Produto'}</strong>
                      <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                        {item.quantity}x {formatCurrency(item.price)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', minWidth: '80px', textAlign: 'right' }}>
                      {formatCurrency(item.subtotal)}
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => removeItemFromOrder(item.id)}
                      disabled={loading}
                      style={{ 
                        padding: '5px 10px', 
                        fontSize: '0.9rem',
                        minWidth: '30px'
                      }}
                      title="Remover item"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              <div style={{ 
                padding: '24px', 
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)', 
                borderRadius: '12px',
                borderTop: '4px solid #667eea',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1rem', color: '#6b7280' }}>Subtotal dos produtos:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50' }}>
                    {formatCurrency(currentOrder?.total || 0)}
                  </span>
                </div>
                
                {orderType === 'delivery' && (
                  <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px solid rgba(102, 126, 234, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#6b7280' }}>
                        Taxa de Entrega:
                      </label>
                      <input
                        type="number"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        style={{ 
                          width: '120px', 
                          padding: '8px', 
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb',
                          fontSize: '1rem',
                          fontWeight: '600',
                          textAlign: 'right'
                        }}
                      />
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingTop: '10px', borderTop: '2px solid rgba(102, 126, 234, 0.2)' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>Total:</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#667eea' }}>
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>

                {orderItems.length > 0 && (
                  <>
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label>Forma de Pagamento:</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{ width: '100%', padding: '10px' }}
                      >
                        <option value="pix">PIX</option>
                        <option value="cash">Dinheiro</option>
                        <option value="credit_card">Cartão de Crédito</option>
                        <option value="debit_card">Cartão de Débito</option>
                        <option value="bank_transfer">Transferência Bancária</option>
                      </select>
                    </div>
                    <button
                      className="btn btn-success"
                      onClick={finalizePayment}
                      disabled={loading}
                      style={{ 
                        width: '100%', 
                        fontSize: '1.2rem', 
                        padding: '15px',
                        fontWeight: 'bold'
                      }}
                    >
                      {loading ? 'Processando...' : 'Finalizar Pagamento'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
        </>
      )}

      {/* Conteúdo da Aba de Saídas */}
      {activeTab === 'saidas' && <SaidasTab />}
    </div>
  );
}

// Componente para a aba de Saídas
function SaidasTab() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: 'other',
    description: '',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseService.getAll();
      const data = response.data?.data || response.data?.results || response.data;
      setExpenses(Array.isArray(data) ? data : []);
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
      await expenseService.create({
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        notes: formData.notes || null
      });
      setSuccess('Saída registrada com sucesso!');
      setShowForm(false);
      setFormData({
        category: 'other',
        description: '',
        amount: '',
        notes: ''
      });
      await loadExpenses();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta saída?')) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await expenseService.delete(id);
      setSuccess('Saída excluída com sucesso!');
      await loadExpenses();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };


  const categoryNames = {
    'ingredients': 'Ingredientes',
    'utilities': 'Utilidades',
    'rent': 'Aluguel',
    'salary': 'Salários',
    'delivery': 'Entrega',
    'marketing': 'Marketing',
    'maintenance': 'Manutenção',
    'supplies': 'Suprimentos',
    'other': 'Outros'
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);

  return (
    <>
      {error && (
        <div className="alert alert-error" onClick={() => setError(null)} style={{ cursor: 'pointer', marginBottom: '20px' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" onClick={() => setSuccess(null)} style={{ cursor: 'pointer', marginBottom: '20px' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Registro de Saídas</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          style={{ 
            padding: '10px 20px',
            fontSize: '1rem'
          }}
        >
          {showForm ? '✕ Cancelar' : '+ Nova Saída'}
        </button>
      </div>

      {/* Formulário de Nova Saída */}
      {showForm && (
        <div className="section" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px' }}>Nova Saída</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                  Categoria:
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    fontSize: '0.95rem'
                  }}
                  required
                >
                  {Object.entries(categoryNames).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                  Valor (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    fontSize: '0.95rem'
                  }}
                  required
                />
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                Descrição:
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Compra de ingredientes"
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '0.95rem'
                }}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                Observações (opcional):
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações adicionais..."
                rows="3"
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '0.95rem',
                  resize: 'vertical'
                }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '12px',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Salvando...' : 'Registrar Saída'}
            </button>
          </form>
        </div>
      )}

      {/* Resumo */}
      <div className="section" style={{ marginBottom: '20px' }}>
        <div style={{ 
          padding: '20px', 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
          borderRadius: '12px',
          border: '2px solid rgba(239, 68, 68, 0.2)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#1f2937' }}>
            Total de Saídas
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>
            {formatCurrency(totalExpenses)}
          </div>
          <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
            {expenses.length} {expenses.length === 1 ? 'saída registrada' : 'saídas registradas'}
          </p>
        </div>
      </div>

      {/* Lista de Saídas */}
      <div className="section">
        <h2>Histórico de Saídas</h2>
        {loading && expenses.length === 0 ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Carregando saídas...</p>
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState 
            icon="💸"
            title="Nenhuma saída registrada"
            message="Clique em 'Nova Saída' para registrar uma despesa."
          />
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {expenses.map((expense) => (
              <div
                key={expense.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  background: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '15px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <strong style={{ fontSize: '1rem' }}>{expense.description}</strong>
                    <span style={{
                      fontSize: '0.85rem',
                      padding: '4px 8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '6px',
                      color: '#dc2626',
                      fontWeight: '500'
                    }}>
                      {expense.category_display || categoryNames[expense.category]}
                    </span>
                  </div>
                  {expense.notes && (
                    <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '5px 0 0 0' }}>
                      {expense.notes}
                    </p>
                  )}
                  <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '5px 0 0 0' }}>
                    {formatDateTime(expense.created_at)}
                    {expense.user_username && ` • Por: ${expense.user_username}`}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#dc2626' }}>
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(expense.id)}
                    disabled={loading}
                    style={{ 
                      padding: '8px 12px', 
                      fontSize: '0.9rem'
                    }}
                    title="Excluir saída"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default CaixaPanel;
