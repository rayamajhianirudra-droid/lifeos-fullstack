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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [water, setWater] = useState(0);
  const [mealType, setMealType] = useState('breakfast');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetStep, setResetStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [streak, setStreak] = useState(0);
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('profile');
    return saved ? JSON.parse(saved) : {
      age: 25, weightLbs: 170, heightFeet: 5, heightInches: 10,
      sex: 'male', activity: 'moderate', goal: 'maintain'
    };
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const calculateDailyGoal = (p) => {
    const weightKg = p.weightLbs * 0.453592;
    const heightCm = (p.heightFeet * 30.48) + (p.heightInches * 2.54);
    let bmr = p.sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * p.age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * p.age - 161;
    const activityMultipliers = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryactive: 1.9
    };
    let tdee = bmr * (activityMultipliers[p.activity] || 1.55);
    if (p.goal === 'lose') tdee -= 500;
    if (p.goal === 'gain') tdee += 500;
    return Math.round(tdee);
  };

  const dailyGoal = calculateDailyGoal(profile);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (token) fetchFoodLogs(selectedDate); }, [token]);

  const fetchFoodLogs = async (date) => {
    try {
      const res = await axios.get(`${API}/foodlogs?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFoodLogs(res.data);
    } catch (err) { console.log(err); }
  };

  const changeDate = (direction) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + direction);
    const newDate = current.toISOString().split('T')[0];
    setSelectedDate(newDate);
    fetchFoodLogs(newDate);
  };

  const goToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    fetchFoodLogs(today);
  };

  const formatDateLabel = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleAuth = async () => {
    try {
      const url = authMode === 'login' ? `${API}/auth/login` : `${API}/auth/register`;
      const body = authMode === 'login'
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword,
            age: profile.age, weightLbs: profile.weightLbs,
            heightFeet: profile.heightFeet, heightInches: profile.heightInches,
            goal: profile.goal, activity: profile.activity, sex: profile.sex };
      const res = await axios.post(url, body);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userName', res.data.name);
      setToken(res.data.token);
      setCurrentUser(res.data.name);
    } catch (err) {
      setAuthMessage('❌ ' + (err.response?.data || 'Something went wrong'));
    }
  };

  const handleForgotPassword = async () => {
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: authEmail });
      setResetMessage('✅ Reset token sent to your email!');
      setResetStep(2);
    } catch (err) {
      setResetMessage('❌ Something went wrong. Try again.');
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken || !newPassword) {
      setResetMessage('❌ Please enter both token and new password.');
      return;
    }
    try {
      const res = await axios.post(`${API}/auth/reset-password`, {
        token: resetToken,
        newPassword: newPassword
      });
      setResetMessage('✅ ' + res.data + ' You can now sign in!');
      setTimeout(() => {
        setAuthMode('login');
        setResetStep(1);
        setResetToken('');
        setNewPassword('');
        setResetMessage('');
      }, 2000);
    } catch (err) {
      setResetMessage('❌ Invalid or expired token.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setCurrentUser(null);
    setFoodLogs([]);
  };

  const saveProfile = () => {
    localStorage.setItem('profile', JSON.stringify(profile));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
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
        protein: food.protein, carbs: food.carbs, fat: food.fat,
        mealType: mealType
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('✅ ' + food.name.substring(0, 30) + ' logged!');
      setSearchQuery('');
      setSearchResults([]);
      fetchFoodLogs(selectedDate);
      setTimeout(() => fetchFoodLogs(selectedDate), 4000);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('❌ Error logging food.'); }
  };

  const deleteFood = async (id) => {
    try {
      await axios.delete(`${API}/foodlogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFoodLogs(selectedDate);
    } catch (err) { setMessage('❌ Error deleting food.'); }
  };

  const totalCalories = foodLogs.reduce((sum, f) => sum + f.calories, 0);
  const totalProtein = Math.round(foodLogs.reduce((sum, f) => sum + f.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(foodLogs.reduce((sum, f) => sum + f.carbs, 0) * 10) / 10;
  const totalFat = Math.round(foodLogs.reduce((sum, f) => sum + f.fat, 0) * 10) / 10;
  const caloriePercent = Math.min((totalCalories / dailyGoal) * 100, 100);
  const remaining = Math.max(dailyGoal - totalCalories, 0);

  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference - (caloriePercent / 100) * circumference;

  const mealCategories = [
    { key: 'breakfast', label: '🌅 Breakfast' },
    { key: 'lunch', label: '☀️ Lunch' },
    { key: 'dinner', label: '🌙 Dinner' },
    { key: 'snack', label: '🍎 Snack' },
  ];

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

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
            {authMode === 'forgot' && (
              <>
                <h2 className="auth-title">Reset Password</h2>
                <p className="auth-subtitle">
                  {resetStep === 1 ? "Enter your email to receive a reset token" : "Enter the token from your email"}
                </p>
                {resetStep === 1 && (
                  <>
                    <div className="input-group">
                      <label>Email</label>
                      <input className="auth-input" placeholder="you@example.com"
                        value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                    </div>
                    {resetMessage && <p className={resetMessage.startsWith('✅') ? 'auth-success' : 'auth-error'}>{resetMessage}</p>}
                    <button className="auth-btn" onClick={handleForgotPassword}>Send Reset Token</button>
                  </>
                )}
                {resetStep === 2 && (
                  <>
                    <div className="input-group">
                      <label>Reset Token (from email)</label>
                      <input className="auth-input" placeholder="Paste token here"
                        value={resetToken} onChange={e => setResetToken(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>New Password</label>
                      <input className="auth-input" placeholder="••••••••" type="password"
                        value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    {resetMessage && <p className={resetMessage.startsWith('✅') ? 'auth-success' : 'auth-error'}>{resetMessage}</p>}
                    <button className="auth-btn" onClick={handleResetPassword}>Reset Password</button>
                  </>
                )}
                <p className="auth-switch">
                  Remember your password? <span onClick={() => { setAuthMode('login'); setResetStep(1); setResetMessage(''); }}>Sign In</span>
                </p>
              </>
            )}
            {authMode !== 'forgot' && (
              <>
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
                {authMode === 'login' && (
                  <p className="forgot-link" onClick={() => { setAuthMode('forgot'); setResetMessage(''); setResetStep(1); }}>
                    Forgot Password?
                  </p>
                )}
                <p className="auth-switch">
                  {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                  <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthMessage(''); }}>
                    {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="topnav">
        <div className="topnav-left">
          <span className="topnav-logo">💪 LifeOS</span>
        </div>
        <div className="topnav-right">
          <span className="topnav-user">👤 {currentUser}</span>
          <button className="topnav-logout" onClick={logout}>Sign Out</button>
        </div>
      </nav>

      <div className="tabbar">
        {['dashboard', 'log', 'progress', 'profile'].map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab === 'dashboard' ? '🏠 Dashboard' :
             tab === 'log' ? '🍽️ Log Food' :
             tab === 'progress' ? '📊 Progress' : '👤 Profile'}
          </button>
        ))}
      </div>

      <div className="main-content">

        {activeTab === 'dashboard' && (
          <div className="tab-content">

            <div className="date-nav">
              <button className="date-nav-btn" onClick={() => changeDate(-1)}>‹</button>
              <div className="date-nav-center">
                <span className="date-nav-label">{formatDateLabel(selectedDate)}</span>
                {!isToday && (
                  <button className="date-today-btn" onClick={goToToday}>Back to Today</button>
                )}
              </div>
              <button className="date-nav-btn" onClick={() => changeDate(1)} disabled={isToday}>›</button>
            </div>

            <div className="calorie-card">
              <div className="calorie-ring-wrapper">
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="12"/>
                  <circle cx="65" cy="65" r="54" fill="none" stroke="#10B981" strokeWidth="12"
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
                  <span className="cal-stat-val">{dailyGoal}</span>
                  <span className="cal-stat-label">Goal</span>
                </div>
                <div className="cal-stat-divider"/>
                <div className="cal-stat">
                  <span className="cal-stat-val" style={{color: remaining === 0 ? '#f87171' : '#10B981'}}>{remaining}</span>
                  <span className="cal-stat-label">Remaining</span>
                </div>
                <div className="cal-stat-divider"/>
                <div className="cal-stat">
                  <span className="cal-stat-val">0</span>
                  <span className="cal-stat-label">Burned</span>
                </div>
              </div>
            </div>

            <div className="macro-row">
              {[
                { label: 'Protein', val: totalProtein, goal: Math.round(dailyGoal * 0.3 / 4), color: '#10B981', unit: 'g' },
                { label: 'Carbs', val: totalCarbs, goal: Math.round(dailyGoal * 0.45 / 4), color: '#34d399', unit: 'g' },
                { label: 'Fat', val: totalFat, goal: Math.round(dailyGoal * 0.25 / 9), color: '#6ee7b7', unit: 'g' },
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

            <div className="foodlog-card">
              <div className="foodlog-header">
                <h3>{formatDateLabel(selectedDate)}'s Food Log</h3>
                <span className="foodlog-count">{foodLogs.length} items</span>
              </div>
              {foodLogs.length === 0 ? (
                <div className="empty-state">
                  <span>🍽️</span>
                  <p>No food logged {isToday ? 'yet' : 'on this day'}</p>
                  {isToday && <button className="empty-btn" onClick={() => setActiveTab('log')}>Log your first meal →</button>}
                </div>
              ) : (
                mealCategories.map(cat => {
                  const items = foodLogs.filter(f => f.mealType === cat.key);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat.key} className="meal-section">
                      <div className="meal-section-header">
                        <span>{cat.label}</span>
                        <span className="meal-section-cal">
                          {items.reduce((s, f) => s + f.calories, 0)} cal
                        </span>
                      </div>
                      {items.map(f => (
                        <div key={f.id} className="food-item">
                          <div className="food-item-left">
                            <p className="food-item-name">{f.foodName}</p>
                            <p className="food-item-macros">{f.protein}g P · {f.carbs}g C · {f.fat}g F</p>
                            {f.insight && f.insight !== 'A nutritious choice for your health!'
                              ? <p className="food-insight">💡 {f.insight}</p>
                              : <p className="food-insight-loading">⏳ Loading insight...</p>}
                          </div>
                          <div style={{display:'flex', alignItems:'center', gap:'8px', flexShrink:0}}>
                            <span className="food-item-cal">{f.calories} cal</span>
                            <button onClick={() => deleteFood(f.id)} style={{background:'transparent', border:'none', color:'#f87171', cursor:'pointer', fontSize:'18px', padding:'4px'}}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div className="tab-content">
            <div className="log-card">
              <h3 className="log-title">Search & Log Food</h3>
              <p className="log-sub">Search from 600,000+ real foods including restaurants</p>
              <div className="meal-selector">
                {mealCategories.map(m => (
                  <button key={m.key}
                    className={`meal-btn ${mealType === m.key ? 'meal-btn-active' : ''}`}
                    onClick={() => setMealType(m.key)}>
                    {m.label}
                  </button>
                ))}
              </div>
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

        {activeTab === 'progress' && (
          <div className="tab-content">
            <div className="progress-card">
              <h3>Today's Summary</h3>
              <div className="progress-stats">
                <div className="progress-stat">
                  <span className="progress-stat-num">{foodLogs.length}</span>
                  <span className="progress-stat-label">Foods Logged</span>
                </div>
                <div className="progress-stat">
                  <span className="progress-stat-num">{totalCalories}</span>
                  <span className="progress-stat-label">Calories Eaten</span>
                </div>
                <div className="progress-stat">
                  <span className="progress-stat-num">{totalProtein}g</span>
                  <span className="progress-stat-label">Total Protein</span>
                </div>
                <div className="progress-stat">
                  <span className="progress-stat-num">{water}</span>
                  <span className="progress-stat-label">Glasses of Water</span>
                </div>
              </div>
            </div>
            <div className="progress-card">
              <h3>Goal Progress</h3>
              {[
                { label: 'Calories', val: totalCalories, goal: dailyGoal, color: '#10B981', unit: 'cal' },
                { label: 'Protein', val: totalProtein, goal: Math.round(dailyGoal * 0.3 / 4), color: '#10B981', unit: 'g' },
                { label: 'Carbs', val: totalCarbs, goal: Math.round(dailyGoal * 0.45 / 4), color: '#34d399', unit: 'g' },
                { label: 'Fat', val: totalFat, goal: Math.round(dailyGoal * 0.25 / 9), color: '#6ee7b7', unit: 'g' },
              ].map(item => (
                <div key={item.label} className="progress-bar-section">
                  <div className="progress-bar-label">
                    <span>{item.label}</span>
                    <span>{item.val} / {item.goal}{item.unit}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{
                      width: `${Math.min((item.val / item.goal) * 100, 100)}%`,
                      background: item.color
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="tab-content">
            <div className="profile-card">
              <h3 className="profile-title">👤 My Profile</h3>
              <p className="profile-sub">Your stats power your personalized calorie goal</p>
              <div className="profile-goal-banner">
                <span className="profile-goal-label">Your Daily Calorie Goal</span>
                <span className="profile-goal-num">{dailyGoal} cal</span>
                <span className="profile-goal-sub">
                  {profile.goal === 'lose' ? '🔥 Weight Loss' :
                   profile.goal === 'gain' ? '💪 Muscle Gain' : '⚖️ Maintain Weight'}
                </span>
              </div>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>Age</label>
                  <input type="number" className="profile-input" value={profile.age}
                    onChange={e => setProfile({...profile, age: parseInt(e.target.value) || 0})} />
                </div>
                <div className="profile-field">
                  <label>Weight (lbs)</label>
                  <input type="number" className="profile-input" value={profile.weightLbs}
                    onChange={e => setProfile({...profile, weightLbs: parseInt(e.target.value) || 0})} />
                </div>
                <div className="profile-field">
                  <label>Height (feet)</label>
                  <input type="number" className="profile-input" value={profile.heightFeet}
                    onChange={e => setProfile({...profile, heightFeet: parseInt(e.target.value) || 0})} />
                </div>
                <div className="profile-field">
                  <label>Height (inches)</label>
                  <input type="number" className="profile-input" value={profile.heightInches}
                    onChange={e => setProfile({...profile, heightInches: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="profile-field-full">
                <label>Sex</label>
                <div className="profile-options">
                  {['male', 'female'].map(s => (
                    <button key={s} className={`profile-option ${profile.sex === s ? 'profile-option-active' : ''}`}
                      onClick={() => setProfile({...profile, sex: s})}>
                      {s === 'male' ? '♂ Male' : '♀ Female'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="profile-field-full">
                <label>Activity Level</label>
                <div className="profile-options">
                  {[
                    { val: 'sedentary', label: '🪑 Sedentary' },
                    { val: 'light', label: '🚶 Light' },
                    { val: 'moderate', label: '🏃 Moderate' },
                    { val: 'active', label: '⚡ Active' },
                    { val: 'veryactive', label: '🔥 Very Active' },
                  ].map(a => (
                    <button key={a.val} className={`profile-option ${profile.activity === a.val ? 'profile-option-active' : ''}`}
                      onClick={() => setProfile({...profile, activity: a.val})}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="profile-field-full">
                <label>Goal</label>
                <div className="profile-options">
                  {[
                    { val: 'lose', label: '🔥 Lose Weight' },
                    { val: 'maintain', label: '⚖️ Maintain' },
                    { val: 'gain', label: '💪 Gain Muscle' },
                  ].map(g => (
                    <button key={g.val} className={`profile-option ${profile.goal === g.val ? 'profile-option-active' : ''}`}
                      onClick={() => setProfile({...profile, goal: g.val})}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="profile-save-btn" onClick={saveProfile}>
                {profileSaved ? '✅ Saved!' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bottomnav">
        {[
          { id: 'dashboard', icon: '🏠', label: 'Home' },
          { id: 'log', icon: '🍽️', label: 'Log' },
          { id: 'progress', icon: '📊', label: 'Progress' },
          { id: 'profile', icon: '👤', label: 'Profile' },
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