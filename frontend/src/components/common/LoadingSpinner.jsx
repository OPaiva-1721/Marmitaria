/**
 * Componente de loading spinner reutilizável
 */
function LoadingSpinner({ size = 'medium', message = 'Carregando...' }) {
  const sizeClasses = {
    small: '24px',
    medium: '48px',
    large: '64px'
  };

  return (
    <div className="loading">
      <div 
        className="spinner" 
        style={{ 
          width: sizeClasses[size] || sizeClasses.medium,
          height: sizeClasses[size] || sizeClasses.medium
        }}
      />
      {message && <p>{message}</p>}
    </div>
  );
}

export default LoadingSpinner;

