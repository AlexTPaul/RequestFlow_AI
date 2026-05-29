import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');

  const fetch = async () => {
    const res = await api.get(`/requests/${id}`);
    setData(res.data);
    setStatus(res.data.request.status);
  };

  useEffect(() => { fetch(); }, [id]);

  const updateStatus = async () => {
    await api.patch(`/requests/${id}/status`, { status });
    fetch();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api.post(`/requests/${id}/notes`, { body: note });
    setNote('');
    fetch();
  };

  if (!data) return <p style={{ padding:'2rem' }}>Loading...</p>;

  const { request, ai_classification, events, notes } = data;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/')} style={styles.back}>← Back</button>

      {/* Request Info */}
      <div style={styles.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2>Request #{id.slice(0,8)}</h2>
          <StatusBadge status={request.status} />
        </div>
        <p style={styles.message}>{request.message}</p>
        <div style={styles.meta}>
          <span>From: {request.customer_name || 'Anonymous'} ({request.customer_email || 'N/A'})</span>
          <span>Channel: {request.source_channel}</span>
          <span>Created: {new Date(request.created_at).toLocaleString()}</span>
        </div>
      </div>

      {/* AI Classification */}
      <div style={styles.card}>
        <h3>AI Classification</h3>
        {ai_classification ? (
          <div style={styles.aiGrid}>
            <div><strong>Category:</strong> {ai_classification.category}</div>
            <div><strong>Priority:</strong> {ai_classification.priority}</div>
            <div><strong>Confidence:</strong> {(ai_classification.confidence * 100).toFixed(0)}%</div>
            <div><strong>Status:</strong> {ai_classification.status}</div>
            <div style={{ gridColumn:'span 2' }}><strong>Summary:</strong> {ai_classification.summary}</div>
            <div style={{ gridColumn:'span 2' }}><strong>Reason:</strong> {ai_classification.reason}</div>
          </div>
        ) : <p style={{ color:'#888' }}>Classification pending...</p>}
      </div>

      {/* Update Status */}
      <div style={styles.card}>
        <h3>Update Status</h3>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <select value={status} onChange={e => setStatus(e.target.value)} style={styles.select}>
            {['queued','processing','open','resolved','closed'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={updateStatus} style={styles.btn}>Update</button>
        </div>
      </div>

      {/* Internal Notes */}
      <div style={styles.card}>
        <h3>Internal Notes</h3>
        {notes.map(n => (
          <div key={n.id} style={styles.note}>
            <p style={{ margin:0 }}>{n.body}</p>
            <small style={{ color:'#888' }}>{n.author_email} — {new Date(n.created_at).toLocaleString()}</small>
          </div>
        ))}
        <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem' }}>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add internal note..." style={{ ...styles.select, flex:1 }} />
          <button onClick={addNote} style={styles.btn}>Add Note</button>
        </div>
      </div>

      {/* Event Timeline */}
      <div style={styles.card}>
        <h3>Event Timeline</h3>
        {events.map(e => (
          <div key={e.id} style={styles.event}>
            <span style={styles.eventType}>{e.event_type}</span>
            <span>{e.old_value && `${e.old_value} → `}{e.new_value}</span>
            <span style={{ color:'#888', fontSize:'0.8rem' }}>{new Date(e.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth:'800px', margin:'0 auto', padding:'1.5rem' },
  card: { background:'white', padding:'1.5rem', borderRadius:'8px', marginBottom:'1rem', boxShadow:'0 1px 4px rgba(0,0,0,0.1)' },
  message: { fontSize:'1rem', color:'#333', background:'#f8f9fa', padding:'1rem', borderRadius:'4px' },
  meta: { display:'flex', gap:'1.5rem', fontSize:'0.85rem', color:'#888', marginTop:'0.75rem', flexWrap:'wrap' },
  aiGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginTop:'0.5rem' },
  select: { padding:'0.5rem', border:'1px solid #ddd', borderRadius:'4px' },
  btn: { padding:'0.5rem 1rem', background:'#008080', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' },
  note: { background:'#f8f9fa', padding:'0.75rem', borderRadius:'4px', marginBottom:'0.5rem' },
  event: { display:'flex', gap:'1rem', alignItems:'center', padding:'0.5rem 0', borderBottom:'1px solid #f0f0f0' },
  eventType: { background:'#e8f4f8', padding:'0.2rem 0.6rem', borderRadius:'12px', fontSize:'0.8rem', fontWeight:'bold', color:'#008080' },
  back: { background:'none', border:'none', color:'#008080', cursor:'pointer', fontSize:'1rem', marginBottom:'1rem', padding:0 }
};