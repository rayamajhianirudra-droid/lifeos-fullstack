import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:8080/api';
const USDA_KEY = 'zFZ3LLHNi6jM9uLKavvLVtqFEQvledgKCy0t3xwy';
const DAILY_GOAL = 2000;

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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [water, setWater] = useState(0);

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
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${searchQuery}&pageSize=6&api_key=${USDA_KEY}`
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
      setMessage('✅ ' + food.name.substring(0, 30) + ' logged!');
      setSearchQuery('');
      setSearchResults([]);
      fetchFoodLogs();
      setTimeout(() => fetchFoodLogs(), 4000);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('❌ Error logging food.'); }
  };

  const totalCalories = foodLogs.reduce((sum, f) => sum + f.calories, 0);
  const totalProtein = foodLogs.reduce((sum, f) => sum + f.protein, 0);
  const totalCarbs = foodLogs.reduce((sum, f) => sum + f.carbs, 0);
  const totalFat = foodLogs.reduce((sum, f) => sum + f.fat, 0);
  const caloriePercent = Math.min((totalCalories / DAILY_GOAL) * 100, 100);
  const remaining = Math.max(DAILY_GOAL - totalCalories, 0);

  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference - (caloriePercent / 100) * circumference;

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-logo">
            <span className="auth-logo-icon">💪</span>
            <h1 className="auth-logo-text">LifeOS Health</h1>
            <p className="auth-logo-sub">Your personal nutrition intelligence</p>
          </div>
          <div className="auth-card">
            <h2 className="auth-title">
              {authMode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="auth-subtitle">
              {authMode === 'login' ? 'Sign in to continue your journey' : 'Start tracking your nutrition today'}
            </p>
            {authMode === 'register' && (
              <div className="input-group">
                <label>Full Name</label>
                <input className="auth-input" placeholder="Anirudra Rayamajhi"
                  value={authName} onChange={e => setAuthName(e.target.value)} />
              </div>
            )}
            <div className="input-group">
              <label>Email</label>
              <input className="auth-input" placeholder="you@example.com"
                value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="auth-input" placeholder="••••••••" type="password"
                value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()} />
            </div>
            {authMessage && <p className="auth-error">{authMessage}</p>}
            <button className="auth-btn" onClick={handleAuth}>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            <p className="auth-switch">
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthMessage(''); }}>
                {authMode === 'login' ? 'Sign Up' : 'Sign In'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Top Nav */}
      <nav className="topnav">
        <div className="topnav-left">
          <span className="topnav-logo">💪 LifeOS</span>
        </div>
        <div className="topnav-right">
          <span className="topnav-user">👤 {currentUser}</span>
          <button className="topnav-logout" onClick={logout}>Sign Out</button>
        </div>
      </nav>

      {/* Tab Bar */}
      <div className="tabbar">
        {['dashboard', 'log', 'progress'].map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab === 'dashboard' ? '🏠 Dashboard' : tab === 'log' ? '🍽️ Log Food' : '📊 Progress'}
          </button>
        ))}
      </div>

      <div className="main-content">

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="tab-content">

            {/* Calorie Ring */}
            <div className="calorie-card">
              <div className="calorie-ring-wrapper">
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r="54" fill="none" stroke="#1e293b" strokeWidth="12"/>
                  <circle cx="65" cy="65" r="54" fill="none" stroke="#38bdf8" strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDash}
                    strokeLinecap="round"
                    transform="rotate(-90 65 65)"
                    style={{transition: 'stroke-dashoffset 0.5s ease'}}/>
                </svg>
                <div className="calorie-ring-text">
                  <span className="calorie-ring-num">{totalCalories}</span>
                  <span className="calorie-ring-label">eaten</span>
                </div>
              </div>
              <div className="calorie-stats">
                <div className="cal-stat">
                  <span className="cal-stat-val">{DAILY_GOAL}</span>
                  <span className="cal-stat-label">Goal</span>
                </div>
                <div className="cal-stat-divider"/>
                <div className="cal-stat">
                  <span className="cal-stat-val" style={{color: remaining === 0 ? '#ef4444' : '#22c55e'}}>{remaining}</span>
                  <span className="cal-stat-label">Remaining</span>
                </div>
                <div className="cal-stat-divider"/>
                <div className="cal-stat">
                  <span className="cal-stat-val">0</span>
                  <span className="cal-stat-label">Burned</span>
                </div>
              </div>
            </div>

            {/* Macro Cards */}
            <div className="macro-row">
              {[
                { label: 'Protein', val: totalProtein, goal: 150, color: '#38bdf8', unit: 'g' },
                { label: 'Carbs', val: totalCarbs, goal: 250, color: '#a78bfa', unit: 'g' },
                { label: 'Fat', val: totalFat, goal: 65, color: '#fb923c', unit: 'g' },
              ].map(m => (
                <div key={m.label} className="macro-card">
                  <div className="macro-top">
                    <span className="macro-label">{m.label}</span>
                    <span className="macro-val" style={{color: m.color}}>{m.val}{m.unit}</span>
                  </div>
                  <div className="macro-bar-bg">
                    <div className="macro-bar-fill" style={{
                      width: `${Math.min((m.val / m.goal) * 100, 100)}%`,
                      background: m.color
                    }}/>
                  </div>
                  <span className="macro-goal">{m.goal}{m.unit} goal</span>
                </div>
              ))}
            </div>

            {/* Water Tracker */}
            <div className="water-card">
              <div className="water-header">
                <span>💧 Water Intake</span>
                <span className="water-count">{water} / 8 glasses</span>
              </div>
              <div className="water-glasses">
                {[...Array(8)].map((_, i) => (
                  <button key={i} className={`glass ${i < water ? 'glass-full' : ''}`}
                    onClick={() => setWater(i < water ? i : i + 1)}>💧</button>
                ))}
              </div>
            </div>

            {/* Today's Food Log */}
            <div className="foodlog-card">
              <div className="foodlog-header">
                <h3>Today's Food Log</h3>
                <span className="foodlog-count">{foodLogs.length} items</span>
              </div>
              {foodLogs.length === 0 ? (
                <div className="empty-state">
                  <span>🍽️</span>
                  <p>No food logged yet</p>
                  <button className="empty-btn" onClick={() => setActiveTab('log')}>Log your first meal →</button>
                </div>
              ) : (
                foodLogs.map(f => (
                  <div key={f.id} className="food-item">
                    <div className="food-item-left">
                      <p className="food-item-name">{f.foodName}</p>
                      <p className="food-item-macros">{f.protein}g P · {f.carbs}g C · {f.fat}g F</p>
                      {f.insight && f.insight !== 'A nutritious choice for your health!'
                        ? <p className="food-insight">💡 {f.insight}</p>
                        : <p className="food-insight-loading">⏳ Loading insight...</p>}
                    </div>
                    <span className="food-item-cal">{f.calories} cal</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* LOG FOOD TAB */}
        {activeTab === 'log' && (
          <div className="tab-content">
            <div className="log-card">
              <h3 className="log-title">Search & Log Food</h3>
              <p className="log-sub">Search from 600,000+ real foods including restaurants</p>
              <div className="search-row">
                <input className="search-input" placeholder="Try: Big Mac, Banana, Grilled Chicken..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchFood()} />
                <button className="search-btn" onClick={searchFood}>
                  {searching ? <span className="spinner"/> : '🔍'}
                </button>
              </div>
              {message && <div className="log-message">{message}</div>}
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((food, i) => (
                    <div key={i} className="result-item">
                      <div className="result-left">
                        <p className="result-name">{food.name}</p>
                        <p className="result-macros">{food.calories} cal · {food.protein}g protein · {food.carbs}g carbs · {food.fat}g fat</p>
                      </div>
                      <button className="log-btn" onClick={() => logFood(food)}>+ Log</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          <div className="tab-content">
            <div className="progress-card">
              <h3>Weekly Summary</h3>
              <div className="progress-stats">
                <div className="progress-stat">
                  <span className="progress-stat-num">{foodLogs.length}</span>
                  <span className="progress-stat-label">Foods Logged</span>
                </div>
                <div className="progress-stat">
                  <span className="progress-stat-num">{totalCalories}</span>
                  <span className="progress-stat-label">Total Calories</span>
                </div>
                <div className="progress-stat">
                  <span className="progress-stat-num">{Math.round(totalProtein)}g</span>
                  <span className="progress-stat-label">Total Protein</span>
                </div>
                <div className="progress-stat">
                  <span className="progress-stat-num">{water}</span>
                  <span className="progress-stat-label">Glasses of Water</span>
                </div>
              </div>
            </div>
            <div className="progress-card">
              <h3>Calorie Goal Progress</h3>
              <div className="progress-bar-section">
                <div className="progress-bar-label">
                  <span>Today</span>
                  <span>{totalCalories} / {DAILY_GOAL} cal</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{width: `${caloriePercent}%`}}/>
                </div>
              </div>
              <div className="progress-bar-section">
                <div className="progress-bar-label">
                  <span>Protein</span>
                  <span>{Math.round(totalProtein)} / 150g</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{width: `${Math.min((totalProtein/150)*100,100)}%`, background: '#38bdf8'}}/>
                </div>
              </div>
              <div className="progress-bar-section">
                <div className="progress-bar-label">
                  <span>Carbs</span>
                  <span>{Math.round(totalCarbs)} / 250g</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{width: `${Math.min((totalCarbs/250)*100,100)}%`, background: '#a78bfa'}}/>
                </div>
              </div>
              <div className="progress-bar-section">
                <div className="progress-bar-label">
                  <span>Fat</span>
                  <span>{Math.round(totalFat)} / 65g</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{width: `${Math.min((totalFat/65)*100,100)}%`, background: '#fb923c'}}/>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav (mobile) */}
      <div className="bottomnav">
        {[
          { id: 'dashboard', icon: '🏠', label: 'Home' },
          { id: 'log', icon: '🍽️', label: 'Log' },
          { id: 'progress', icon: '📊', label: 'Progress' },
        ].map(item => (
          <button key={item.id} className={`bottomnav-btn ${activeTab === item.id ? 'bottomnav-active' : ''}`}
            onClick={() => setActiveTab(item.id)}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;