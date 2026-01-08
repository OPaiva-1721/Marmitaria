import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminPanel from './components/AdminPanel';
import CaixaPanel from './components/CaixaPanel';
import LoadingSpinner from './components/common/LoadingSpinner';
import './index.css';

function AppContent() {
  const { user, loading, isAdmin, isCaixa } = useAuth();
  const [currentView, setCurrentView] = useState(() => {
    // Verificar se está na rota /signup
    return window.location.pathname === '/signup' ? 'signup' : 'login';
  });

  useEffect(() => {
    // Atualizar view quando a rota mudar
    const handleLocationChange = () => {
      if (window.location.pathname === '/signup') {
        setCurrentView('signup');
      } else {
        setCurrentView('login');
      }
    };

    // Escutar mudanças de popstate (voltar/avançar no navegador)
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <LoadingSpinner size="large" message="Carregando sistema..." />
      </div>
    );
  }

  if (!user) {
    if (currentView === 'signup') {
      return <Signup onNavigate={(view) => {
        setCurrentView(view);
        if (view === 'login') {
          window.history.pushState({}, '', '/login');
        } else {
          window.history.pushState({}, '', '/signup');
        }
      }} />;
    }
    return <Login onNavigate={(view) => {
      setCurrentView(view);
      if (view === 'signup') {
        window.history.pushState({}, '', '/signup');
      } else {
        window.history.pushState({}, '', '/login');
      }
    }} />;
  }

  // Determinar tipo de usuário baseado nos grupos
  // Por enquanto, vamos usar um endpoint para buscar informações do usuário
  // Por enquanto, vamos assumir que se não for admin, é caixa
  if (isAdmin()) {
    return <AdminPanel />;
  }

  return <CaixaPanel />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
