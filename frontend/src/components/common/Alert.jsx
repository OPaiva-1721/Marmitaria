/**
 * Componente de alerta reutilizável
 */
import { useEffect, useState } from 'react';

function Alert({ 
  type = 'info', 
  message, 
  onClose, 
  autoClose = false, 
  duration = 5000 
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, isVisible, onClose]);

  if (!isVisible || !message) return null;

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  return (
    <div 
      className={`alert alert-${type}`}
      onClick={handleClose}
      style={{ cursor: onClose ? 'pointer' : 'default' }}
      role="alert"
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '0 8px',
            marginLeft: 'auto'
          }}
          aria-label="Fechar alerta"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default Alert;

