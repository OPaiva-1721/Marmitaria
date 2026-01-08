import { useState } from 'react';
import { authService } from '../services/api';
import Alert from './common/Alert';
import LoadingSpinner from './common/LoadingSpinner';
import { getErrorMessage, getValidationErrors } from '../utils/errorHandler';
import './Login.css';

function Signup({ onNavigate }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const validateField = (name, value) => {
    const errors = { ...validationErrors };
    
    switch (name) {
      case 'username':
        if (value.length < 3) {
          errors.username = 'Usuário deve ter pelo menos 3 caracteres';
        } else {
          delete errors.username;
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
          errors.email = 'Email inválido';
        } else {
          delete errors.email;
        }
        break;
      case 'password':
        if (value.length < 6) {
          errors.password = 'Senha deve ter pelo menos 6 caracteres';
        } else {
          delete errors.password;
        }
        // Validar confirmação se já foi preenchida
        if (formData.password_confirm && value !== formData.password_confirm) {
          errors.password_confirm = 'As senhas não coincidem';
        } else if (formData.password_confirm) {
          delete errors.password_confirm;
        }
        break;
      case 'password_confirm':
        if (value !== formData.password) {
          errors.password_confirm = 'As senhas não coincidem';
        } else {
          delete errors.password_confirm;
        }
        break;
      default:
        break;
    }
    
    setValidationErrors(errors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
    validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validar todos os campos antes de submeter
    Object.keys(formData).forEach(key => {
      validateField(key, formData[key]);
    });
    
    // Verificar se há erros de validação
    if (Object.keys(validationErrors).length > 0 || formData.password !== formData.password_confirm) {
      if (formData.password !== formData.password_confirm) {
        setValidationErrors({ ...validationErrors, password_confirm: 'As senhas não coincidem' });
      }
      setError('Por favor, corrija os erros no formulário');
      return;
    }
    
    setLoading(true);

    try {
      await authService.register(formData);
      setSuccess(true);
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('login');
        } else {
          window.location.href = '/login';
        }
      }, 2000);
    } catch (err) {
      const validationErrs = getValidationErrors(err);
      if (Object.keys(validationErrs).length > 0) {
        setValidationErrors(validationErrs);
        setError('Por favor, corrija os erros no formulário');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
          </div>
          <Alert 
            type="success" 
            message="✅ Conta criada com sucesso! Redirecionando para o login..."
            autoClose={false}
          />
          <LoadingSpinner message="Aguarde..." />
        </div>
      </div>
    );
  }

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
            Criar Nova Conta
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
            <label htmlFor="username">Usuário:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoFocus
              minLength={3}
              aria-invalid={validationErrors.username ? 'true' : 'false'}
              aria-describedby={validationErrors.username ? 'username-error' : undefined}
            />
            {validationErrors.username && (
              <span id="username-error" style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                {validationErrors.username}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              aria-invalid={validationErrors.email ? 'true' : 'false'}
              aria-describedby={validationErrors.email ? 'email-error' : undefined}
            />
            {validationErrors.email && (
              <span id="email-error" style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                {validationErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="first_name">Nome:</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Sobrenome:</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              aria-invalid={validationErrors.password ? 'true' : 'false'}
              aria-describedby={validationErrors.password ? 'password-error' : undefined}
            />
            {validationErrors.password && (
              <span id="password-error" style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                {validationErrors.password}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password_confirm">Confirmar Senha:</label>
            <input
              type="password"
              id="password_confirm"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              required
              minLength={6}
              aria-invalid={validationErrors.password_confirm ? 'true' : 'false'}
              aria-describedby={validationErrors.password_confirm ? 'password-confirm-error' : undefined}
            />
            {validationErrors.password_confirm && (
              <span id="password-confirm-error" style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                {validationErrors.password_confirm}
              </span>
            )}
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
                <span style={{ marginLeft: '8px' }}>Criando conta...</span>
              </>
            ) : (
              'Criar Conta'
            )}
          </button>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <a 
              href="/login" 
              onClick={(e) => {
                e.preventDefault();
                if (onNavigate) {
                  onNavigate('login');
                } else {
                  window.location.href = '/login';
                }
              }}
              style={{ color: '#667eea', textDecoration: 'none' }}
            >
              Já tem uma conta? Faça login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;

