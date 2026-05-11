import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:8080/api';

function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);
      setUsers(res.data);
    } catch (err) {
      setMessage('Cannot connect to server.');
    }
  };

  const createUser = async () => {
    try {
      await axios.post(`${API}/users`, {
        name, email, password: 'password123',
        age: 25, weightLbs: 170, heightFeet: 5,
        heightInches: 10, goal: 'maintain',
        activity: 'moderate', sex: 'male'
      });
      setMessage('✅ User created!');
      setName(''); setEmail('');
      fetchUsers();
    } catch (err) {
      setMessage('❌ Error: ' + (err.response?.data || err.message));
    }
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>💪 LifeOS Health</h1>
        <span style={styles.navTag}>Full Stack App</span>
      </nav>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Create Account</h2>
        <input style={styles.input} placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
        <input style={styles.input} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <button style={styles.button} onClick={createUser}>Create User</button>
        {message && <p style={styles.message}>{message}</p>}
      </div>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Registered Users ({users.length})</h2>
        {users.length === 0 ? <p style={styles.empty}>No users yet.</p> :
          users.map(u => (
            <div key={u.id} style={styles.userRow}>
              <div style={styles.avatar}>{u.name[0]}</div>
              <div>
                <p style={styles.userName}>{u.name}</p>
                <p style={styles.userEmail}>{u.email}</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

const styles = {
  container: { fontFamily: 'Segoe UI, sans-serif', background: '#0f172a', minHeight: '100vh', padding: '0 0 40px' },
  nav: { background: '#1e293b', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: '#38bdf8', margin: 0, fontSize: '24px' },
  navTag: { color: '#64748b', fontSize: '13px' },
  card: { background: '#1e293b', borderRadius: '12px', padding: '24px', margin: '24px auto', maxWidth: '500px' },
  cardTitle: { color: '#f1f5f9', marginTop: 0 },
  input: { width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: '15px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  message: { color: '#38bdf8', textAlign: 'center', marginTop: '12px' },
  empty: { color: '#64748b' },
  userRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #334155' },
  avatar: { background: '#38bdf8', color: '#0f172a', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' },
  userName: { color: '#f1f5f9', margin: 0, fontWeight: 'bold' },
  userEmail: { color: '#64748b', margin: 0, fontSize: '13px' },
};

export default App;