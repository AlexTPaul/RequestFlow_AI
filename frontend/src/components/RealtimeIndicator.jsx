export default function RealtimeIndicator({ connected }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.85rem' }}>
      <div style={{
        width:'10px', height:'10px', borderRadius:'50%',
        background: connected ? '#2ecc71' : '#e74c3c',
        animation: connected ? 'pulse 2s infinite' : 'none'
      }} />
      {connected ? 'Live' : 'Disconnected'}
    </div>
  );
}