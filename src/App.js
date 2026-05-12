import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:8080/api';
const USDA_KEY = 'zFZ3LLHNi6jM9uLKavvLVtqFEQvledgKCy0t3xwy';

function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [foodLogs, setFoodLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => { fetchUsers(); fetchFoodLogs(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);
      setUsers(res.data);
    } catch (err) { setMessage('Cannot connect to server.'); }
  };

  const fetchFoodLogs = async () => {
    try {
      const res = await axios.get(`${API}/foodlogs`);
      setFoodLogs(res.data);
    } catch (err) { console.log(err); }
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
    } catch (err) { setMessage('❌ Error: ' + (err.response?.data || err.message)); }
  };

  const searchFood = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedFood(null);
    try {
      const res = await axios.get(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${searchQuery}&pageSize=5&api_key=${USDA_KEY}`
      );
      const foods = res.data.foods.map(f => ({
        name: f.description,
        calories: Math.round(f.foodNutrients?.find(n => n.nutrientName === 'Energy')?.value || 0),
        protein: Math.round((f.foodNutrients?.find(n => n.nutrientName === 'Protein')?.value || 0) * 10) / 10,
        carbs: Math.round((f.foodNutrients?.find(n => n.nutrientName === 'Carbohydrate, by difference')?.value || 0) * 10) / 10,
        fat: Math.round((f.foodNutrients?.find(n => n.nutrientName === 'Total lipid (fat)')?.value || 0) * 10) / 10,
      }));
      setSearchResults(foods);
    } catch (err) {
      setMessage('❌ Food search failed.');
    }
    setSearching(false);
  };

  const logFood = async (food) => {
    if (!selectedUserId) { setMessage('❌ Select a user first!'); return; }
    try {
      await axios.post(`${API}/foodlogs`, {
        userId: parseInt(selectedUserId),
        foodName: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat
      });
      setMessage('✅ ' + food.name + ' logged!');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedFood(null);
      fetchFoodLogs();
      setTimeout(() => fetchFoodLogs(), 4000);
      setTimeout(() => fetchFoodLogs(), 8000);
    } catch (err) { setMessage('❌ Error logging food.'); }
  };

  const totalCalories = foodLogs.reduce((sum, f) => sum + f.calories, 0);

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
        <h2 style={styles.cardTitle}>Log Food</h2>
        <select style={styles.input} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
          <option value="">Select User</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <div style={styles.row}>
          <input
            style={styles.searchInput}
            placeholder="Search food (e.g. Big Mac, Banana, Chicken)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchFood()}
          />
          <button style={styles.searchBtn} onClick={searchFood}>
            {searching ? '...' : '🔍'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div style={styles.results}>
            {searchResults.map((food, i) => (
              <div key={i} style={styles.resultRow}>
                <div style={{flex: 1}}>
                  <p style={styles.resultName}>{food.name}</p>
                  <p style={styles.resultMacros}>{food.calories} cal · {food.protein}g protein · {food.carbs}g carbs · {food.fat}g fat</p>
                </div>
                <button style={styles.logBtn} onClick={() => logFood(food)}>+ Log</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Today's Food Log ({foodLogs.length} items — {totalCalories.toFixed(0)} cal total)</h2>
        {foodLogs.length === 0 ? <p style={styles.empty}>No food logged yet. Search and log your first meal!</p> :
          foodLogs.map(f => (
            <div key={f.id} style={styles.foodRow}>
              <div style={{flex: 1}}>
                <p style={styles.userName}>{f.foodName}</p>
                <p style={styles.userEmail}>{f.calories} cal · {f.protein}g protein · {f.carbs}g carbs · {f.fat}g fat</p>
                {f.insight && f.insight !== 'A nutritious choice for your health!'
                  ? <p style={styles.insight}>💡 {f.insight}</p>
                  : <p style={styles.insightLoading}>⏳ Loading insight...</p>
                }
              </div>
              <span style={styles.calBadge}>{f.calories} cal</span>
            </div>
          ))}
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Registered Users ({users.length})</h2>
        {users.map(u => (
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
  row: { display: 'flex', gap: '8px', marginBottom: '8px' },
  searchInput: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: '15px' },
  searchBtn: { padding: '12px 16px', background: '#38bdf8', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer' },
  results: { background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', marginBottom: '12px' },
  resultRow: { display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #1e293b' },
  resultName: { color: '#f1f5f9', margin: 0, fontSize: '14px', fontWeight: 'bold' },
  resultMacros: { color: '#64748b', margin: 0, fontSize: '12px' },
  logBtn: { background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' },
  button: { width: '100%', padding: '12px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  message: { color: '#38bdf8', textAlign: 'center', marginTop: '12px' },
  empty: { color: '#64748b' },
  foodRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #334155' },
  calBadge: { background: '#0f172a', color: '#38bdf8', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', marginLeft: '8px', whiteSpace: 'nowrap' },
  insight: { color: '#38bdf8', margin: '4px 0 0', fontSize: '13px', fontStyle: 'italic' },
  insightLoading: { color: '#64748b', margin: '4px 0 0', fontSize: '13px', fontStyle: 'italic' },
  userRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #334155' },
  avatar: { background: '#38bdf8', color: '#0f172a', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' },
  userName: { color: '#f1f5f9', margin: 0, fontWeight: 'bold' },
  userEmail: { color: '#64748b', margin: 0, fontSize: '13px' },
};

export default App;