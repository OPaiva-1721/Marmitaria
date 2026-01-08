import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';
import api from '../services/api';
import { getErrorMessage } from '../utils/errorHandler';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há usuário salvo
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password);
      
      // Verificar se a resposta tem os tokens
      if (!response.data) {
        throw new Error('Resposta do servidor inválida');
      }
      
      // O endpoint de token retorna diretamente { access, refresh }
      // Mas o interceptor pode ter envolvido em { success: true, data: { access, refresh } }
      let access, refresh;
      
      if (response.data.access && response.data.refresh) {
        // Formato direto do JWT
        access = response.data.access;
        refresh = response.data.refresh;
      } else if (response.data.data && response.data.data.access && response.data.data.refresh) {
        // Formato envolvido pelo interceptor
        access = response.data.data.access;
        refresh = response.data.data.refresh;
      } else {
        console.error('Tokens não recebidos. Resposta completa:', response);
        console.error('Estrutura da resposta:', JSON.stringify(response.data, null, 2));
        throw new Error('Tokens de autenticação não recebidos do servidor');
      }
      
      // Verificar se os tokens existem
      if (!access || !refresh) {
        console.error('Tokens não recebidos:', response.data);
        throw new Error('Tokens de autenticação não recebidos do servidor');
      }
      
      // Salvar tokens ANTES de fazer qualquer requisição
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // Aguardar um pouco para garantir que o localStorage foi atualizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Buscar informações do usuário usando a instância api (que tem os interceptors)
      try {
        // Usar a instância api que já tem o interceptor configurado
        const userResponse = await api.get('/user/');
        
        const userInfo = userResponse.data?.data || userResponse.data;
        
        if (!userInfo) {
          throw new Error('Resposta vazia do servidor');
        }
        
        const userData = {
          username: userInfo.username,
          userId: userInfo.id,
          email: userInfo.email,
          isAdmin: userInfo.is_admin || false,
          isCaixa: userInfo.is_caixa || false,
          groups: userInfo.groups || [],
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } catch (e) {
        console.error('Erro ao buscar informações do usuário:', e);
        console.error('Detalhes do erro:', e.response?.data || e.message);
        
        // Se falhar, tentar usar o token JWT para obter informações básicas
        // Mas isso é apenas um fallback temporário - o ideal é que o endpoint funcione
        if (access && typeof access === 'string') {
          try {
            const tokenParts = access.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              
              // Verificar se o username é 'admin' - se for, provavelmente é admin
              // Isso é um workaround até o endpoint funcionar corretamente
              const isAdminUser = username.toLowerCase() === 'admin' || payload.user_id === 1;
              
              const userData = {
                username: payload.username || username,
                userId: payload.user_id,
                email: payload.email || '',
                isAdmin: isAdminUser,
                isCaixa: !isAdminUser,
                groups: [],
              };
              
              console.warn('Usando fallback JWT. isAdmin:', isAdminUser);
              localStorage.setItem('user', JSON.stringify(userData));
              setUser(userData);
            } else {
              throw new Error('Token inválido');
            }
          } catch (decodeError) {
            console.error('Erro ao decodificar token:', decodeError);
            // Último fallback - verificar se username é admin
            const isAdminUser = username.toLowerCase() === 'admin';
            const userData = {
              username,
              isAdmin: isAdminUser,
              isCaixa: !isAdminUser,
            };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
          }
        } else {
          // Se não tem token válido, usar fallback básico
          console.warn('Token não disponível para decodificação, usando fallback básico');
          const isAdminUser = username.toLowerCase() === 'admin';
          const userData = {
            username,
            isAdmin: isAdminUser,
            isCaixa: !isAdminUser,
          };
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      
      // Tratamento específico para erro 401 (credenciais inválidas)
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Usuário ou senha incorretos. Verifique suas credenciais e tente novamente.',
        };
      }
      
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = () => {
    return user?.isAdmin || false;
  };

  const isCaixa = () => {
    return user?.isCaixa || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        isCaixa,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

