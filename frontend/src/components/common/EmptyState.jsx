/**
 * Componente de estado vazio reutilizável
 */
function EmptyState({ 
  icon = '📭', 
  title = 'Nenhum item encontrado',
  message = 'Não há itens para exibir no momento.',
  action = null
}) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>
        {icon}
      </div>
      <h3 style={{ 
        fontSize: '1.25rem', 
        fontWeight: '600', 
        color: 'var(--text-primary)',
        marginBottom: '8px'
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: '1rem', 
        color: 'var(--text-secondary)',
        marginBottom: action ? '20px' : '0'
      }}>
        {message}
      </p>
      {action && (
        <div style={{ marginTop: '20px' }}>
          {action}
        </div>
      )}
    </div>
  );
}

export default EmptyState;

