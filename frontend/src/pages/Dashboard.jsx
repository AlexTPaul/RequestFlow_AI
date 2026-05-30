import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import RequestCard from '../components/RequestCard';
import RealtimeIndicator from '../components/RealtimeIndicator';

export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  const fetchRequests = useCallback(async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v));
    const res = await api.get('/requests', { params });
    setRequests(res.data.requests);
  }, [filters]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Handle realtime events
  const handleSocketEvent = useCallback((type, data) => {
    setToast(`Request ${data.requestId.slice(0,8)}... ${type}`);
    setTimeout(() => setToast(''), 3000);
    fetchRequests(); // refresh list
  }, [fetchRequests]);

  const { connected } = useSocket(handleSocketEvent);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.logo}>RequestFlow AI</h1>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <RealtimeIndicator connected={connected} />
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Toast notification */}
      {toast && <div style={styles.toast}>🔔 {toast}</div>}

      {/* Filters */}
      <div style={styles.filters}>
        {[
          { key:'status', options:['','queued','processing','open','resolved','closed'] },
          { key:'priority', options:['','low','medium','high'] },
          { key:'category', options:['','support','sales','urgent','spam','other'] }
        ].map(({ key, options }) => (
          <select key={key} style={styles.select}
            value={filters[key]}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}>
            {options.map(o => <option key={o} value={o}>{o || `All ${key}s`}</option>)}
          </select>
        ))}
        <button onClick={fetchRequests} style={styles.refreshBtn}>Refresh</button>
      </div>

      {/* Request List */}
      <div style={styles.list}>
        {requests.length === 0 
          ? <p style={{ textAlign:'center', color:'#888' }}>No requests found</p>
          : requests.map(r => (
              <RequestCard key={r.id} request={r}
                onClick={() => navigate(`/requests/${r.id}`)} />
            ))
        }
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth:'1000px', margin:'0 auto', padding:'1rem' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 0', borderBottom:'2px solid #008080' },
  logo: { color:'#008080', margin:0 },
  filters: { display:'flex', gap:'0.75rem', margin:'1.5rem 0', flexWrap:'wrap' },
  select: { padding:'0.5rem', border:'1px solid #ddd', borderRadius:'4px', minWidth:'130px' },
  list: { display:'flex', flexDirection:'column', gap:'0.75rem' },
  toast: { background:'#008080', color:'white', padding:'0.75rem 1rem', borderRadius:'4px', marginBottom:'1rem' },
  logoutBtn: { padding:'0.5rem 1rem', background:'#e74c3c', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' },
  refreshBtn: { padding:'0.5rem 1rem', background:'#008080', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' }
};