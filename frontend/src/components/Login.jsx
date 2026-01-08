import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Alert from './common/Alert';
import LoadingSpinner from './common/LoadingSpinner';
import './Login.css';

function Login({ onNavigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      
      if (!result.success) {
        setError(result.error || 'Usuário ou senha incorretos');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🍽️ Restaurante e Marmitaria da Angela
          </h1>
          <h2 style={{ 
            fontSize: '1.5rem', 
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Sistema de Gerenciamento
          </h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert 
              type="error" 
              message={error} 
              onClose={() => setError('')}
              autoClose={false}
            />
          )}
          
          <div className="form-group">
            <label htmlFor="username">
              <span style={{ marginRight: '8px' }}>👤</span>
              Usuário:
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              disabled={loading}
              placeholder="Digite seu usuário"
              aria-label="Nome de usuário"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">
              <span style={{ marginRight: '8px' }}>🔒</span>
              Senha:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Digite sua senha"
              aria-label="Senha"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ 
              width: '100%',
              marginTop: '8px',
              fontSize: '1.1rem',
              padding: '14px'
            }}
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" message="" />
                <span style={{ marginLeft: '8px' }}>Entrando...</span>
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
        
        <div style={{ marginTop: '20px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <a 
            href="/signup" 
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) {
                onNavigate('signup');
              } else {
                window.location.href = '/signup';
              }
            }}
            style={{ 
              color: '#667eea', 
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
          >
            Não tem uma conta? <strong>Criar conta</strong>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;

