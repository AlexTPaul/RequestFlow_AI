const colors = {
  queued: '#f39c12', processing: '#3498db', open: '#2ecc71',
  resolved: '#27ae60', closed: '#95a5a6',
  high: '#e74c3c', medium: '#f39c12', low: '#2ecc71'
};

export default function StatusBadge({ status, type }) {
  return (
    <span style={{
      background: colors[status] || '#ddd',
      color: 'white', padding: '0.2rem 0.6rem',
      borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'
    }}>
      {status}
    </span>
  );
}