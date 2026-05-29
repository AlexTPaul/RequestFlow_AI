import StatusBadge from './StatusBadge';

export default function RequestCard({ request, onClick }) {
  return (
    <div onClick={onClick} style={styles.card}>
      <div style={styles.row}>
        <span style={styles.id}>#{request.id.slice(0,8)}</span>
        <StatusBadge status={request.status} />
        {request.priority_snapshot && (
          <StatusBadge status={request.priority_snapshot} type="priority" />
        )}
      </div>
      <p style={styles.message}>{request.message.substring(0, 120)}...</p>
      <div style={styles.meta}>
        <span>{request.customer_name || 'Anonymous'}</span>
        <span>{request.category_snapshot || 'Classifying...'}</span>
        <span>{new Date(request.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
}

const styles = {
  card: { background:'white', padding:'1rem', borderRadius:'8px', cursor:'pointer',
    boxShadow:'0 1px 4px rgba(0,0,0,0.1)', transition:'transform 0.1s',
    ':hover': { transform:'translateY(-2px)' } },
  row: { display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.5rem' },
  id: { color:'#888', fontSize:'0.8rem', fontFamily:'monospace' },
  message: { margin:'0.5rem 0', color:'#333', fontSize:'0.9rem' },
  meta: { display:'flex', gap:'1rem', fontSize:'0.8rem', color:'#888' }
};