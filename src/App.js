import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:8080/api';

function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);
      setUsers(res.data);
    } catch (err) {
      setMessage('Could not connect to server.');
    }
  };

  const createUser = async () => {
    try {
      await axios.post(`${API}/users`, {
        name,
        email,
        password: 'password123',
        age: 25,
        weightLbs: 170,
        heightFeet: 5,
        heightInches: 10,
        goal: 'maintain',
        activity: 'moderate',
        sex: 'male'
      });
      setMessage('User created!');
      setName('');
      setEmail('');
      fetchUsers();
    } catch (err) {
      setMessage('Error creating user.');
    }
  };

  return (
    <div className="App">
      <h1>LifeOS Health</h1>
      <h2>Create User</h2>
      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={createUser}>Create</button>
      <p>{message}</p>
      <h2>Users</h2>
      {users.map(u => <p key={u.id}>{u.name} — {u.email}</p>)}
    </div>
  );
}

export default App;