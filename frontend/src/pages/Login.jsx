import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Cognifyr Admin</h2>
        <form onSubmit={handleLogin}>
          <input style={styles.input} type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#f0f2f5' },
  card: { background:'white', padding:'2rem', borderRadius:'8px', width:'360px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' },
  title: { textAlign:'center', marginBottom:'1.5rem', color:'#1a1a2e' },
  input: { width:'100%', padding:'0.75rem', margin:'0.5rem 0', border:'1px solid #ddd', borderRadius:'4px', boxSizing:'border-box' },
  button: { width:'100%', padding:'0.75rem', background:'#008080', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', marginTop:'1rem' },
  error: { color:'red', fontSize:'0.85rem' }
};