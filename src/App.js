import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:8080/api';
const USDA_KEY = 'zFZ3LLHNi6jM9uLKavvLVtqFEQvledgKCy0t3xwy';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('userName'));
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [foodLogs, setFoodLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { if (token) fetchFoodLogs(); }, [token]);

  const fetchFoodLogs = async () => {
    try {
      const res = await axios.get(`${API}/foodlogs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFoodLogs(res.data);
    } catch (err) { console.log(err); }
  };

  const handleAuth = async () => {
    try {
      const url = authMode === 'login' ? `${API}/auth/login` : `${API}/auth/register`;
      const body = authMode === 'login'
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword,
            age: 25, weightLbs: 170, heightFeet: 5, heightInches: 10,
            goal: 'maintain', activity: 'moderate', sex: 'male' };
      const res = await axios.post(url, body);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userName', res.data.name);
      setToken(res.data.token);
      setCurrentUser(res.data.name);
    } catch (err) {
      setAuthMessage('❌ ' + (err.response?.data || 'Something went wrong'));
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setCurrentUser(null);
    setFoodLogs([]);
  };

  const searchFood = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
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
    } catch (err) { setMessage('❌ Food search failed.'); }
    setSearching(false);
  };

  const logFood = async (food) => {
    try {
      await axios.post(`${API}/foodlogs`, {
        foodName: food.name, calories: food.calories,
        protein: food.protein, carbs: food.carbs, fat: food.fat
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('✅ ' + food.name + ' logged!');
      setSearchQuery('');
      setSearchResults([]);
      fetchFoodLogs();
      setTimeout(() => fetchFoodLogs(), 4000);
    } catch (err) { setMessage('❌ Error logging food.'); }
  };

  const totalCalories = foodLogs.reduce((sum, f) => sum + f.calories, 0);

  if (!token) {
    return (
      <div style={styles.pageCenter}>
        <nav style={styles.nav}>
          <h1 style={styles.logo}>💪 LifeOS Health</h1>
        </nav>
        <div style={styles.authWrapper}>
          <div style={styles.authCard}>
            <h2 style={styles.cardTitle}>
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            {authMode === 'register' && (
              <input style={styles.input} placeholder="Full Name"
                value={authName} onChange={e => setAuthName(e.target.value)} />
            )}
            <input style={styles.input} placeholder="Email"
              value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
            <input style={styles.input} placeholder="Password" type="password"
              value={authPassword} onChange={e => setAuthPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()} />
            <button style={styles.button} onClick={handleAuth}>
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
            {authMessage && <p style={styles.message}>{authMessage}</p>}
            <p style={styles.switchText}>
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <span style={styles.switchLink}
                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthMessage(''); }}>
                {authMode === 'login' ? 'Register' : 'Login'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>💪 LifeOS Health</h1>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👤 {currentUser}</span>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </nav>
      <div style={styles.content}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Log Food</h2>
          <div style={styles.row}>
            <input style={styles.searchInput}
              placeholder="Search food (e.g. Big Mac, Banana, Chicken)"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchFood()} />
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
          {message && <p style={styles.message}>{message}</p>}
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
                    : <p style={styles.insightLoading}>⏳ Loading insight...</p>}
                </div>
                <span style={styles.calBadge}>{f.calories} cal</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { fontFamily: 'Segoe UI, sans-serif', background: '#0f172a', minHeight: '100vh', width: '100%' },
  pageCenter: { fontFamily: 'Segoe UI, sans-serif', background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' },
  nav: { background: '#1e293b', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' },
  logo: { color: '#38bdf8', margin: 0, fontSize: '24px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  navUser: { color: '#f1f5f9', fontSize: '14px' },
  logoutBtn: { background: 'transparent', border: '1px solid #334155', color: '#64748b', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  content: { maxWidth: '560px', margin: '0 auto', padding: '0 16px 40px', width: '100%' },
  authWrapper: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', width: '100%', boxSizing: 'border-box' },
  authCard: { background: '#1e293b', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '400px' },
  card: { background: '#1e293b', borderRadius: '12px', padding: '24px', marginTop: '24px', width: '100%' },
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
  userName: { color: '#f1f5f9', margin: 0, fontWeight: 'bold' },
  userEmail: { color: '#64748b', margin: 0, fontSize: '13px' },
  switchText: { color: '#64748b', textAlign: 'center', marginTop: '16px', fontSize: '14px' },
  switchLink: { color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold' },
};

export default App;