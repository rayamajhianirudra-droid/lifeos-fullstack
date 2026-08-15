import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
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
  const [weightLbs, setWeightLbs] = useState('');
  const [weightLogs, setWeightLogs] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [exerciseCategory, setExerciseCategory] = useState('cardio');
  const [totalBurned, setTotalBurned] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]);
  const [aiMessage, setAiMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

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

  useEffect(() => {
    if (token) {
      fetchFoodLogs(selectedDate);
      fetchStreak();
      fetchWeightLogs();
      fetchExerciseLogs(selectedDate);
      fetchWeeklyData();
    }
  }, [token]); // eslint-disable-line

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const fetchFoodLogs = async (date) => {
    try {
      const res = await axios.get(`${API}/foodlogs?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFoodLogs(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchStreak = async () => {
    try {
      const res = await axios.get(`${API}/foodlogs/streak`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStreak(res.data.streak);
    } catch (err) { console.log(err); }
  };

  const fetchWeightLogs = async () => {
    try {
      const res = await axios.get(`${API}/weight`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWeightLogs(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchExerciseLogs = async (date) => {
    try {
      const res = await axios.get(`${API}/exercise?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExerciseLogs(res.data);
      const burned = res.data.reduce((sum, e) => sum + e.caloriesBurned, 0);
      setTotalBurned(burned);
    } catch (err) { console.log(err); }
  };

  const fetchWeeklyData = async () => {
    try {
      const res = await axios.get(`${API}/foodlogs/weekly`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWeeklyData(res.data);
    } catch (err) { console.log(err); }
  };

  const logWeight = async () => {
    if (!weightLbs) return;
    try {
      await axios.post(`${API}/weight`, {
        weightLbs: parseFloat(weightLbs)
      }, { headers: { Authorization: `Bearer ${token}` } });
      setWeightLbs('');
      fetchWeightLogs();
    } catch (err) { console.log(err); }
  };

  const deleteWeight = async (id) => {
    try {
      await axios.delete(`${API}/weight/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchWeightLogs();
    } catch (err) { console.log(err); }
  };

  const logExercise = async () => {
    if (!exerciseName || !exerciseDuration) return;
    const MET_VALUES = {
      cardio: 8, strength: 5, hiit: 10,
      yoga: 3, cycling: 7, swimming: 8,
      running: 9, walking: 4, sports: 7
    };
    const met = MET_VALUES[exerciseCategory] || 6;
    const weightKg = profile.weightLbs * 0.453592;
    const calories = Math.round((met * weightKg * parseInt(exerciseDuration)) / 60);
    try {
      await axios.post(`${API}/exercise`, {
        exerciseName,
        durationMinutes: parseInt(exerciseDuration),
        caloriesBurned: calories,
        category: exerciseCategory,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setExerciseName('');
      setExerciseDuration('');
      fetchExerciseLogs(selectedDate);
    } catch (err) { console.log(err); }
  };

  const deleteExercise = async (id) => {
    try {
      await axios.delete(`${API}/exercise/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchExerciseLogs(selectedDate);
    } catch (err) { console.log(err); }
  };

  const askAiCoach = async () => {
    if (!aiMessage.trim()) return;
    setAiLoading(true);
    const userMsg = aiMessage;
    setAiMessage('');
    const newHistory = [...chatHistory, { role: 'user', text: userMsg }];
    setChatHistory(newHistory);

    const context = `User stats: ${profile.age}yo ${profile.sex}, ${profile.weightLbs}lbs, 
    ${profile.heightFeet}'${profile.heightInches}", goal: ${profile.goal}, 
    activity: ${profile.activity}. Daily calorie goal: ${dailyGoal} kcal.
    Today: consumed ${totalCalories} cal, ${totalProtein}g protein, ${totalCarbs}g carbs, 
    ${totalFat}g fat. Burned ${totalBurned} cal. Water: ${water}/8 glasses. 
    Streak: ${streak} days. BMI: ${bmi} (${bmiLabel}).`;

    try {
      const res = await axios.post(`${API}/ai/chat`, {
        message: userMsg,
        context: context
      }, { headers: { Authorization: `Bearer ${token}` } });
      const reply = res.data.response || generateSmartFallback(userMsg);
      setChatHistory([...newHistory, { role: 'ai', text: reply }]);
    } catch (err) {
      setChatHistory([...newHistory, { role: 'ai', text: generateSmartFallback(userMsg) }]);
    }
    setAiLoading(false);
  };

  const generateSmartFallback = (userMsg) => {
    const msg = userMsg.toLowerCase();
    const firstName = currentUser?.split(' ')[0] || 'champ';
    const hour = new Date().getHours();

    if (totalCalories === 0) {
      const responses = [
        `${firstName}, you haven't eaten anything today. A coach can't help someone running on empty — go eat something real first. 🍽️`,
        `Zero calories logged. Are you fasting or just forgetting to log? Either way, I need data to coach you properly.`,
        `You've consumed nothing today. If that's true, that's not healthy. If you forgot to log — go do it now.`,
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    if (msg.includes('eat') || msg.includes('food') || msg.includes('dinner') || msg.includes('lunch') || msg.includes('meal')) {
      const remaining = dailyGoal - totalCalories;
      const proteinLeft = proteinGoal - totalProtein;
      if (remaining > 600)
        return `You have ${remaining} calories left and ${proteinLeft.toFixed(0)}g protein to hit. Go for grilled chicken or salmon with rice and vegetables — high protein, balanced carbs, exactly what your numbers need.`;
      else if (remaining > 200)
        return `${remaining} calories left — a light meal will do it. Greek yogurt with fruit, or a protein shake with a banana. Don't overdo it this late.`;
      else
        return `You're only ${remaining} calories away from your goal ${firstName}. A small snack — handful of nuts or some fruit — and you're done for the day.`;
    }

    if (msg.includes('workout') || msg.includes('exercise') || msg.includes('train')) {
      if (totalBurned > 0)
        return `You've already burned ${totalBurned} calories today. Nice work. If you want more, a 20-30 min walk or light session is plenty — don't overtrain.`;
      return `No exercise logged yet today. Even a 30 minute walk burns 150-200 calories. Movement is non-negotiable ${firstName} — get it done.`;
    }

    if (msg.includes('protein')) {
      if (totalProtein >= proteinGoal)
        return `Protein goal crushed — ${totalProtein}g of ${proteinGoal}g. That's how you build and maintain muscle. Keep this up every day.`;
      return `You're at ${totalProtein}g of your ${proteinGoal}g protein goal. Need ${(proteinGoal - totalProtein).toFixed(0)}g more. Chicken breast, eggs, Greek yogurt or a protein shake. Pick one now.`;
    }

    if (msg.includes('track') || msg.includes('progress') || msg.includes('doing')) {
      const pct = Math.round((totalCalories / dailyGoal) * 100);
      if (pct < 30)
        return `${pct}% of your calorie goal with the day ${hour > 17 ? 'almost over' : 'still going'}. You need to eat more ${firstName}. Undereating tanks your metabolism.`;
      else if (pct > 100)
        return `You're over your calorie goal by ${totalCalories - dailyGoal} calories. No more eating tonight. Water and sleep — that's the plan.`;
      return `${pct}% of calories hit, protein at ${Math.round((totalProtein/proteinGoal)*100)}%, ${water}/8 glasses of water. ${streak > 0 ? `${streak} day streak alive.` : 'Start your streak today.'} ${pct > 80 ? 'Solid day.' : 'Still work to do.'}`;
    }

    if (msg.includes('weight') || msg.includes('lose') || msg.includes('fat')) {
      return `Stay in your calorie deficit consistently — that's the only thing that works. Protein keeps you full and preserves muscle. Log everything, even the small stuff. Consistency over perfection.`;
    }

    if (msg.includes('bmi')) {
      return `Your BMI is ${bmi} — ${bmiLabel}. ${parseFloat(bmi) < 25 ? 'You\'re in a healthy range. Focus on body composition now — build muscle, reduce fat.' : 'Focus on gradual weight loss through consistent deficit. 0.5-1 lb per week is sustainable and healthy.'}`;
    }

    const pct = Math.round((totalCalories / dailyGoal) * 100);
    return `${totalCalories} of ${dailyGoal} calories today — ${pct}% there. Protein at ${totalProtein}g/${proteinGoal}g. ${streak > 0 ? `${streak} day streak.` : ''} ${pct > 80 ? 'Strong day.' : 'Keep pushing.'}`;
  };

  const changeDate = (direction) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + direction);
    const newDate = current.toISOString().split('T')[0];
    setSelectedDate(newDate);
    fetchFoodLogs(newDate);
    fetchExerciseLogs(newDate);
  };

  const goToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    fetchFoodLogs(today);
    fetchExerciseLogs(today);
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
    } catch (err) { setResetMessage('❌ Something went wrong. Try again.'); }
  };

  const handleResetPassword = async () => {
    if (!resetToken || !newPassword) {
      setResetMessage('❌ Please enter both token and new password.');
      return;
    }
    try {
      const res = await axios.post(`${API}/auth/reset-password`, {
        token: resetToken, newPassword: newPassword
      });
      setResetMessage('✅ ' + res.data + ' You can now sign in!');
      setTimeout(() => {
        setAuthMode('login'); setResetStep(1);
        setResetToken(''); setNewPassword(''); setResetMessage('');
      }, 2000);
    } catch (err) { setResetMessage('❌ Invalid or expired token.'); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null); setCurrentUser(null);
    setFoodLogs([]); setStreak(0); setWeightLogs([]);
    setExerciseLogs([]); setTotalBurned(0); setWeeklyData([]);
    setChatHistory([]);
  };

  const saveProfile = () => {
    localStorage.setItem('profile', JSON.stringify(profile));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const searchFood = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setSearchResults([]);
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
      setSearchQuery(''); setSearchResults([]);
      fetchFoodLogs(selectedDate); fetchStreak(); fetchWeeklyData();
      setTimeout(() => fetchFoodLogs(selectedDate), 4000);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('❌ Error logging food.'); }
  };

  const deleteFood = async (id) => {
    try {
      await axios.delete(`${API}/foodlogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFoodLogs(selectedDate); fetchStreak(); fetchWeeklyData();
    } catch (err) { setMessage('❌ Error deleting food.'); }
  };

  const totalCalories = foodLogs.reduce((sum, f) => sum + f.calories, 0);
  const totalProtein = Math.round(foodLogs.reduce((sum, f) => sum + f.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(foodLogs.reduce((sum, f) => sum + f.carbs, 0) * 10) / 10;
  const totalFat = Math.round(foodLogs.reduce((sum, f) => sum + f.fat, 0) * 10) / 10;
  const caloriePercent = Math.min((totalCalories / dailyGoal) * 100, 100);
  const remaining = Math.max(dailyGoal - totalCalories + totalBurned, 0);
  const proteinGoal = Math.round(dailyGoal * 0.3 / 4);
  const carbsGoal = Math.round(dailyGoal * 0.45 / 4);
  const fatGoal = Math.round(dailyGoal * 0.25 / 9);
  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference - (caloriePercent / 100) * circumference;

  const mealCategories = [
    { key: 'breakfast', label: '🌅 Breakfast', color: '#5B4FD4' },
    { key: 'lunch', label: '☀️ Lunch', color: '#1D9E75' },
    { key: 'dinner', label: '🌙 Dinner', color: '#D85A30' },
    { key: 'snack', label: '🍎 Snack', color: '#E8820C' },
  ];

  const exerciseCategories = [
    { key: 'cardio', label: '🏃 Cardio' },
    { key: 'strength', label: '🏋️ Strength' },
    { key: 'hiit', label: '⚡ HIIT' },
    { key: 'yoga', label: '🧘 Yoga' },
    { key: 'cycling', label: '🚴 Cycling' },
    { key: 'swimming', label: '🏊 Swimming' },
    { key: 'walking', label: '🚶 Walking' },
    { key: 'sports', label: '⚽ Sports' },
  ];

  const MET_VALUES = { cardio:8, strength:5, hiit:10, yoga:3, cycling:7, swimming:8, running:9, walking:4, sports:7 };
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const getHour = () => new Date().getHours();
  const greeting = getHour() < 12 ? 'Good morning' : getHour() < 17 ? 'Good afternoon' : 'Good evening';
  const greetingEmoji = getHour() < 12 ? '☀️' : getHour() < 17 ? '🌤️' : '🌙';

  const bmi = profile.weightLbs && profile.heightFeet ?
    ((profile.weightLbs / ((profile.heightFeet * 12 + profile.heightInches) ** 2)) * 703).toFixed(1) : null;
  const bmiLabel = bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese') : null;

  const estimatedBurn = exerciseDuration
    ? Math.round((MET_VALUES[exerciseCategory] || 6) * (profile.weightLbs * 0.453592) * parseInt(exerciseDuration || 0) / 60)
    : 0;

  let healthScore = 50;
  if (totalCalories > 0) healthScore += 10;
  if (totalCalories <= dailyGoal) healthScore += 10;
  if (totalProtein >= proteinGoal) healthScore += 10;
  if (water >= 8) healthScore += 10;
  if (streak >= 3) healthScore += 5;
  if (streak >= 7) healthScore += 5;
  if (totalBurned > 0) healthScore += 5;
  if (bmi && parseFloat(bmi) >= 18.5 && parseFloat(bmi) < 25) healthScore += 5;
  healthScore = Math.min(healthScore, 100);
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Work';

  const achievements = [
    { id: 'first_food', icon: '🌱', title: 'First Step', desc: 'Logged your first food', unlocked: foodLogs.length > 0 || weightLogs.length > 0 || exerciseLogs.length > 0, color: '#1D9E75', bg: '#EDFAF5', border: '#BAF0D8' },
    { id: 'streak_3', icon: '🔥', title: 'On Fire', desc: '3 day logging streak', unlocked: streak >= 3, color: '#E8820C', bg: '#FEF4E8', border: '#F5D4A8' },
    { id: 'streak_7', icon: '⭐', title: 'Week Warrior', desc: '7 day logging streak', unlocked: streak >= 7, color: '#5B4FD4', bg: '#F0EFFD', border: '#DDD8FF' },
    { id: 'streak_30', icon: '💎', title: 'Monthly Master', desc: '30 day logging streak', unlocked: streak >= 30, color: '#5B4FD4', bg: '#F0EFFD', border: '#DDD8FF' },
    { id: 'calorie_goal', icon: '🎯', title: 'On Target', desc: 'Hit your calorie goal today', unlocked: totalCalories > 0 && totalCalories <= dailyGoal && totalCalories >= dailyGoal * 0.9, color: '#1D9E75', bg: '#EDFAF5', border: '#BAF0D8' },
    { id: 'protein_goal', icon: '💪', title: 'Protein King', desc: 'Hit your protein goal today', unlocked: totalProtein >= proteinGoal, color: '#5B4FD4', bg: '#F0EFFD', border: '#DDD8FF' },
    { id: 'hydration', icon: '💧', title: 'Hydration Hero', desc: 'Drank all 8 glasses of water', unlocked: water >= 8, color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
    { id: 'first_exercise', icon: '🏃', title: 'Fitness Starter', desc: 'Logged your first workout', unlocked: exerciseLogs.length > 0, color: '#E8820C', bg: '#FEF4E8', border: '#F5D4A8' },
    { id: 'burned_500', icon: '🔥', title: 'Calorie Crusher', desc: 'Burned 500+ calories in a day', unlocked: totalBurned >= 500, color: '#D85A30', bg: '#FEF0EC', border: '#F5C4A8' },
    { id: 'weight_logged', icon: '⚖️', title: 'Scale Master', desc: 'Logged your weight', unlocked: weightLogs.length > 0, color: '#1D9E75', bg: '#EDFAF5', border: '#BAF0D8' },
    { id: 'weight_loss', icon: '📉', title: 'Losing It', desc: 'Lost weight since you started', unlocked: weightLogs.length >= 2 && weightLogs[0].weightLbs < weightLogs[weightLogs.length - 1].weightLbs, color: '#1D9E75', bg: '#EDFAF5', border: '#BAF0D8' },
    { id: 'five_foods', icon: '🍽️', title: 'Food Tracker', desc: 'Logged 5+ foods in a day', unlocked: foodLogs.length >= 5, color: '#5B4FD4', bg: '#F0EFFD', border: '#DDD8FF' },
    { id: 'all_meals', icon: '🌟', title: 'Full Day', desc: 'Logged all 4 meal types today', unlocked: mealCategories.every(cat => foodLogs.some(f => f.mealType === cat.key)), color: '#E8820C', bg: '#FEF4E8', border: '#F5D4A8' },
    { id: 'bmi_normal', icon: '❤️', title: 'Healthy Range', desc: 'BMI in the normal range', unlocked: bmi && parseFloat(bmi) >= 18.5 && parseFloat(bmi) < 25, color: '#D85A30', bg: '#FEF0EC', border: '#F5C4A8' },
  ];
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const tooltipStyle = {
    contentStyle: { background: darkMode ? '#1a1a2e' : '#fff', border: darkMode ? '1px solid rgba(255,255,255,.1)' : '.5px solid #EBEBF0', borderRadius: '12px', fontSize: '12px' },
    labelStyle: { color: darkMode ? '#F0F0FF' : '#0A0A14', fontWeight: '600' },
  };

  const quickPrompts = [
    'What should I eat for dinner?',
    'Am I on track today?',
    'How can I improve my health score?',
    'Is my BMI healthy?',
    'What workout should I do today?',
  ];

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-logo">
            <span className="auth-logo-icon">💪</span>
            <h1 className="auth-logo-text">LifeOS</h1>
            <p className="auth-logo-sub">Your personal health intelligence</p>
          </div>
          <div className="auth-card">
            {authMode === 'forgot' ? (
              <>
                <h2 className="auth-title">Reset Password</h2>
                <p className="auth-subtitle">{resetStep === 1 ? 'Enter your email to receive a reset token' : 'Enter the token from your email'}</p>
                {resetStep === 1 && (<>
                  <div className="input-group"><label>Email</label>
                    <input className="auth-input" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)}/></div>
                  {resetMessage && <p className={resetMessage.startsWith('✅') ? 'auth-success' : 'auth-error'}>{resetMessage}</p>}
                  <button className="auth-btn" onClick={handleForgotPassword}>Send Reset Token</button>
                </>)}
                {resetStep === 2 && (<>
                  <div className="input-group"><label>Reset Token</label>
                    <input className="auth-input" placeholder="Paste token here" value={resetToken} onChange={e => setResetToken(e.target.value)}/></div>
                  <div className="input-group"><label>New Password</label>
                    <input className="auth-input" type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)}/></div>
                  {resetMessage && <p className={resetMessage.startsWith('✅') ? 'auth-success' : 'auth-error'}>{resetMessage}</p>}
                  <button className="auth-btn" onClick={handleResetPassword}>Reset Password</button>
                </>)}
                <p className="auth-switch">Remember it? <span onClick={() => { setAuthMode('login'); setResetStep(1); setResetMessage(''); }}>Sign In</span></p>
              </>
            ) : (
              <>
                <h2 className="auth-title">{authMode === 'login' ? 'Welcome back' : 'Create account'}</h2>
                <p className="auth-subtitle">{authMode === 'login' ? 'Sign in to continue your journey' : 'Start tracking your health today'}</p>
                {authMode === 'register' && (
                  <div className="input-group"><label>Full Name</label>
                    <input className="auth-input" placeholder="AJ Rayamajhi" value={authName} onChange={e => setAuthName(e.target.value)}/></div>
                )}
                <div className="input-group"><label>Email</label>
                  <input className="auth-input" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)}/></div>
                <div className="input-group"><label>Password</label>
                  <input className="auth-input" type="password" placeholder="••••••••" value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()}/></div>
                {authMessage && <p className="auth-error">{authMessage}</p>}
                <button className="auth-btn" onClick={handleAuth}>{authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
                {authMode === 'login' && <p className="forgot-link" onClick={() => { setAuthMode('forgot'); setResetStep(1); }}>Forgot Password?</p>}
                <p className="auth-switch">
                  {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
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
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L12.5 7L7 12.5L1.5 7L7 1.5Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="sidebar-logo-text">LifeOS</span>
        </div>

        <div className="nav-section-label">Main</div>
        {[
          { id: 'dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
          { id: 'log', icon: 'ti-salad', label: 'Nutrition', badge: foodLogs.length > 0 ? foodLogs.length : null },
          { id: 'exercise', icon: 'ti-run', label: 'Activity', badge: exerciseLogs.length > 0 ? exerciseLogs.length : null },
          { id: 'progress', icon: 'ti-chart-bar', label: 'Progress' },
          { id: 'achievements', icon: 'ti-trophy', label: 'Achievements', badge: unlockedCount > 0 ? `${unlockedCount}` : null },
          { id: 'coach', icon: 'ti-robot', label: 'AI Coach' },
        ].map(item => (
          <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}>
            <i className={`ti ${item.icon}`} aria-hidden="true"/>
            {item.label}
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </div>
        ))}

        <div className="nav-section-label">Account</div>
        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <i className="ti ti-user" aria-hidden="true"/>Profile
        </div>

        <div className="sidebar-bottom">
          <div className="score-card">
            <div className="score-label">Health Score</div>
            <div className="score-number">{healthScore}</div>
            <div className="score-sub">{healthLabel} · Top {Math.max(5, 100 - healthScore)}%</div>
            <div className="score-bar"><div className="score-bar-fill" style={{'--w':`${healthScore}%`}}/></div>
          </div>
          {streak > 0 && (
            <div className="streak-card">
              <div className="streak-info">
                <div className="streak-lbl">Streak</div>
                <div className="streak-val">{streak} 🔥</div>
              </div>
              <div className="streak-dots">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className={`streak-dot ${i % 3 === 0 && i > 0 ? 'off' : ''}`}/>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      <header className="topnav">
        <div className="topnav-greeting">
          <h2>{greeting}, {currentUser} {greetingEmoji}</h2>
          <p>"Every healthy choice compounds."</p>
        </div>
        <div className="topnav-right">
          <button className="dark-mode-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <div className="topnav-notif">
            <i className="ti ti-bell" style={{fontSize:'16px',color:'#8888A0'}} aria-hidden="true"/>
            <div className="topnav-notif-dot"/>
          </div>
          <div className="topnav-date">{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
          <div className="topnav-user">
            <div className="topnav-avatar">{currentUser?.charAt(0).toUpperCase()}</div>
            <span className="topnav-username">{currentUser}</span>
          </div>
          <button className="topnav-logout" onClick={logout}>Sign Out</button>
        </div>
      </header>

      <main className="main-content">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            {streak > 0 && (
              <div className="streak-banner">
                <span className="streak-fire">🔥</span>
                <span className="streak-num">{streak}</span>
                <span className="streak-text">Day Streak</span>
                {streak >= 30 && <span className="streak-badge">💎 Monthly Master</span>}
                {streak >= 7 && streak < 30 && <span className="streak-badge">⭐ Week Warrior</span>}
                {streak >= 3 && streak < 7 && <span className="streak-badge">🌱 On a Roll</span>}
              </div>
            )}
            <div className="date-nav">
              <button className="date-nav-btn" onClick={() => changeDate(-1)}>‹</button>
              <div className="date-nav-center">
                <span className="date-nav-label">{formatDateLabel(selectedDate)}</span>
                {!isToday && <button className="date-today-btn" onClick={goToToday}>Back to Today</button>}
              </div>
              <button className="date-nav-btn" onClick={() => changeDate(1)} disabled={isToday}>›</button>
            </div>
            <div className="calorie-card">
              <div className="calorie-ring-wrapper">
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r="54" fill="none" stroke="#F0F0F4" strokeWidth="10"/>
                  <circle cx="65" cy="65" r="54" fill="none" stroke="#5B4FD4" strokeWidth="10"
                    strokeDasharray={circumference} strokeDashoffset={strokeDash}
                    strokeLinecap="round" transform="rotate(-90 65 65)"
                    style={{transition:'stroke-dashoffset 0.8s ease'}}/>
                  <circle cx="65" cy="65" r="38" fill="none" stroke="#F0F0F4" strokeWidth="7"/>
                  <circle cx="65" cy="65" r="38" fill="none" stroke="#1D9E75" strokeWidth="7"
                    strokeDasharray={`${Math.min((totalProtein/proteinGoal)*100,100)*2.39} 239`}
                    strokeLinecap="round" transform="rotate(-90 65 65)"
                    style={{transition:'stroke-dasharray 0.8s ease'}}/>
                </svg>
                <div className="calorie-ring-text">
                  <span className="calorie-ring-num">{totalCalories}</span>
                  <span className="calorie-ring-label">eaten</span>
                </div>
              </div>
              <div className="calorie-stats">
                <div className="cal-stat-row">
                  <div className="cal-stat-dot" style={{background:'#5B4FD4'}}/>
                  <span className="cal-stat-label">Daily Goal</span>
                  <span className="cal-stat-val">{dailyGoal}</span>
                  <span className="cal-stat-badge badge-purple">{Math.round(caloriePercent)}%</span>
                </div>
                <div className="cal-sep"/>
                <div className="cal-stat-row">
                  <div className="cal-stat-dot" style={{background:'#1D9E75'}}/>
                  <span className="cal-stat-label">Remaining</span>
                  <span className="cal-stat-val" style={{color:remaining===0?'#D85A30':'#1D9E75'}}>{remaining}</span>
                  <span className="cal-stat-badge badge-green">kcal</span>
                </div>
                <div className="cal-sep"/>
                <div className="cal-stat-row">
                  <div className="cal-stat-dot" style={{background:'#E8820C'}}/>
                  <span className="cal-stat-label">Burned</span>
                  <span className="cal-stat-val" style={{color:'#E8820C'}}>{totalBurned}</span>
                  <span className="cal-stat-badge badge-orange">Exercise</span>
                </div>
                <div className="cal-sep"/>
                <div className="cal-stat-row">
                  <div className="cal-stat-dot" style={{background:'#A0A0B0'}}/>
                  <span className="cal-stat-label">Net Left</span>
                  <span className="cal-stat-val" style={{color:'#5B4FD4'}}>{remaining}</span>
                  <span className="cal-stat-badge badge-purple">kcal</span>
                </div>
              </div>
              {bmi && (
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:'10px',color:'#9898AA',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.5px'}}>BMI</div>
                  <div style={{fontSize:'28px',fontWeight:'700',color:'#1D9E75',letterSpacing:'-1px',lineHeight:1}}>{bmi}</div>
                  <div style={{fontSize:'10px',color:'#1D9E75',fontWeight:'600',background:'#EDFAF5',padding:'2px 8px',borderRadius:'20px',marginTop:'4px'}}>{bmiLabel}</div>
                </div>
              )}
            </div>
            <div className="macro-row">
              {[
                {label:'Protein',val:totalProtein,goal:proteinGoal,color:'#5B4FD4',pctBg:'#F0EFFD',pctColor:'#5B4FD4'},
                {label:'Carbs',val:totalCarbs,goal:carbsGoal,color:'#1D9E75',pctBg:'#EDFAF5',pctColor:'#1D9E75'},
                {label:'Fat',val:totalFat,goal:fatGoal,color:'#E8820C',pctBg:'#FEF4E8',pctColor:'#E8820C'},
              ].map(m => (
                <div key={m.label} className="macro-card">
                  <div className="macro-card-label">{m.label}</div>
                  <div className="macro-card-pct" style={{background:m.pctBg,color:m.pctColor}}>{Math.round((m.val/m.goal)*100)}%</div>
                  <div className="macro-card-val" style={{color:m.color}}>{m.val}g</div>
                  <div className="macro-card-goal">of {m.goal}g goal</div>
                  <div className="macro-card-bar"><div className="macro-card-fill" style={{'--w':`${Math.min((m.val/m.goal)*100,100)}%`,background:m.color}}/></div>
                </div>
              ))}
            </div>
            <div className="water-card">
              <div className="water-header">
                <span className="water-title">💧 Hydration</span>
                <span className="water-count">{water} / 8 glasses</span>
              </div>
              <div className="water-glasses">
                {[...Array(8)].map((_,i) => (
                  <button key={i} className={`glass ${i < water ? 'glass-full' : ''}`}
                    onClick={() => setWater(i < water ? i : i+1)}>💧</button>
                ))}
              </div>
            </div>
            {exerciseLogs.length > 0 && (
              <div className="foodlog-card">
                <div className="foodlog-header">
                  <h3 className="foodlog-title">💪 Today's Workouts</h3>
                  <span className="foodlog-count">🔥 {totalBurned} cal burned</span>
                </div>
                {exerciseLogs.map(e => (
                  <div key={e.id} className="food-item">
                    <div className="food-meal-dot" style={{background:'#E8820C'}}/>
                    <div style={{flex:1}}>
                      <p className="food-item-name">{e.exerciseName}</p>
                      <p className="food-item-macros">{e.category} · {e.durationMinutes} min</p>
                    </div>
                    <span className="food-item-cal" style={{color:'#E8820C',borderColor:'rgba(232,130,12,.2)',background:'#FEF4E8'}}>{e.caloriesBurned} cal</span>
                    <button className="food-delete-btn" onClick={() => deleteExercise(e.id)}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
            <div className="foodlog-card">
              <div className="foodlog-header">
                <h3 className="foodlog-title">{formatDateLabel(selectedDate)}'s Food Log</h3>
                <span className="foodlog-count">{foodLogs.length} items</span>
              </div>
              {foodLogs.length === 0 ? (
                <div className="empty-state">
                  <span>🍽️</span>
                  <p>No food logged {isToday ? 'yet today' : 'on this day'}</p>
                  {isToday && <button className="empty-btn" onClick={() => setActiveTab('log')}>Log your first meal →</button>}
                </div>
              ) : (
                mealCategories.map(cat => {
                  const items = foodLogs.filter(f => f.mealType === cat.key);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat.key} className="meal-section">
                      <div className="meal-section-header">
                        <span className="meal-section-name">{cat.label}</span>
                        <span className="meal-section-cal">{items.reduce((s,f)=>s+f.calories,0)} kcal</span>
                      </div>
                      {items.map(f => (
                        <div key={f.id} className="food-item">
                          <div className="food-meal-dot" style={{background:cat.color}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <p className="food-item-name">{f.foodName}</p>
                            <p className="food-item-macros">{f.protein}g P · {f.carbs}g C · {f.fat}g F</p>
                            {f.insight && f.insight !== 'A nutritious choice for your health!'
                              ? <p className="food-insight">✦ {f.insight}</p>
                              : <p className="food-insight-loading">⏳ Loading insight...</p>}
                          </div>
                          <span className="food-item-cal">{f.calories}</span>
                          <button className="food-delete-btn" onClick={() => deleteFood(f.id)}>🗑️</button>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* LOG FOOD */}
        {activeTab === 'log' && (
          <div className="tab-content">
            <div className="log-card">
              <h3 className="log-title">Search & Log Food</h3>
              <p className="log-sub">Search from 600,000+ real foods including restaurants</p>
              <div className="meal-selector">
                {mealCategories.map(m => (
                  <button key={m.key} className={`meal-btn ${mealType === m.key ? 'meal-btn-active' : ''}`}
                    onClick={() => setMealType(m.key)}>{m.label}</button>
                ))}
              </div>
              <div className="search-row">
                <input className="search-input" placeholder="Try: Big Mac, Banana, Grilled Chicken..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchFood()}/>
                <button className="search-btn" onClick={searchFood}>
                  {searching ? <span className="spinner"/> : '🔍'}
                </button>
              </div>
              {message && <div className="log-message">{message}</div>}
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((food,i) => (
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

        {/* EXERCISE */}
        {activeTab === 'exercise' && (
          <div className="tab-content">
            <div className="log-card">
              <h3 className="log-title">💪 Log Exercise</h3>
              <p className="log-sub">Track workouts and see calories burned update your ring in real time</p>
              <div className="exercise-category-row">
                {exerciseCategories.map(cat => (
                  <button key={cat.key} className={`meal-btn ${exerciseCategory === cat.key ? 'meal-btn-active' : ''}`}
                    onClick={() => setExerciseCategory(cat.key)}>{cat.label}</button>
                ))}
              </div>
              <div className="exercise-input-row">
                <input className="search-input" placeholder="Exercise name (e.g. Morning Run, Bench Press...)"
                  value={exerciseName} onChange={e => setExerciseName(e.target.value)}/>
              </div>
              <div className="exercise-input-row" style={{marginTop:'10px'}}>
                <input type="number" className="search-input" placeholder="Duration (minutes)"
                  value={exerciseDuration} onChange={e => setExerciseDuration(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && logExercise()}/>
                <button className="search-btn" onClick={logExercise} style={{marginLeft:'10px'}}>+ Log</button>
              </div>
              {exerciseDuration > 0 && (
                <div className="exercise-preview">
                  ⚡ Estimated burn: <strong>{estimatedBurn} cal</strong> for {exerciseDuration} min of {exerciseCategory}
                </div>
              )}
            </div>
            {exerciseLogs.length > 0 ? (
              <div className="progress-card">
                <h3>Today's Workouts</h3>
                <div className="exercise-total">🔥 Total Burned Today: <strong style={{color:'#E8820C'}}>{totalBurned} cal</strong></div>
                <div className="weight-list">
                  {exerciseLogs.map(e => (
                    <div key={e.id} className="weight-item">
                      <div>
                        <div style={{fontSize:'13px',fontWeight:'600',color:'#0A0A14'}}>{e.exerciseName}</div>
                        <div style={{fontSize:'11px',color:'#9898AA',marginTop:'2px'}}>{e.category} · {e.durationMinutes} min</div>
                      </div>
                      <span className="weight-val" style={{color:'#E8820C'}}>{e.caloriesBurned} cal</span>
                      <button onClick={() => deleteExercise(e.id)}
                        style={{background:'transparent',border:'none',color:'#E4E4EC',cursor:'pointer',fontSize:'14px'}}
                        onMouseOver={ev=>ev.target.style.color='#E85A5A'}
                        onMouseOut={ev=>ev.target.style.color='#E4E4EC'}>🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="progress-card">
                <div className="empty-state"><span>💪</span><p>No workouts logged today</p></div>
              </div>
            )}
          </div>
        )}

        {/* PROGRESS */}
        {activeTab === 'progress' && (
          <div className="tab-content">
            <div className="progress-card">
              <h3>Today's Summary</h3>
              <div className="progress-stats">
                <div className="progress-stat"><span className="progress-stat-num">{foodLogs.length}</span><span className="progress-stat-label">Foods Logged</span></div>
                <div className="progress-stat"><span className="progress-stat-num">{totalCalories}</span><span className="progress-stat-label">Calories Eaten</span></div>
                <div className="progress-stat"><span className="progress-stat-num">{totalProtein}g</span><span className="progress-stat-label">Total Protein</span></div>
                <div className="progress-stat"><span className="progress-stat-num">🔥{streak}</span><span className="progress-stat-label">Day Streak</span></div>
              </div>
            </div>
            <div className="progress-card">
              <h3>📈 Weekly Calories</h3>
              <p style={{fontSize:'12px',color:'#9898AA',marginBottom:'16px'}}>Last 7 days calorie intake</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F4" vertical={false}/>
                  <XAxis dataKey="day" tick={{fontSize:11,fill:'#9898AA'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:'#9898AA'}} axisLine={false} tickLine={false}/>
                  <Tooltip {...tooltipStyle}/>
                  <Line type="monotone" dataKey="calories" stroke="#5B4FD4" strokeWidth={2.5}
                    dot={{fill:'#5B4FD4',strokeWidth:0,r:4}} activeDot={{r:6}} name="Calories"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="progress-card">
              <h3>💪 Weekly Macros</h3>
              <p style={{fontSize:'12px',color:'#9898AA',marginBottom:'16px'}}>Protein, Carbs and Fat — last 7 days</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F4" vertical={false}/>
                  <XAxis dataKey="day" tick={{fontSize:11,fill:'#9898AA'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:'#9898AA'}} axisLine={false} tickLine={false}/>
                  <Tooltip {...tooltipStyle}/>
                  <Line type="monotone" dataKey="protein" stroke="#5B4FD4" strokeWidth={2.5} dot={{fill:'#5B4FD4',strokeWidth:0,r:3}} activeDot={{r:5}} name="Protein (g)"/>
                  <Line type="monotone" dataKey="carbs" stroke="#1D9E75" strokeWidth={2.5} dot={{fill:'#1D9E75',strokeWidth:0,r:3}} activeDot={{r:5}} name="Carbs (g)"/>
                  <Line type="monotone" dataKey="fat" stroke="#E8820C" strokeWidth={2.5} dot={{fill:'#E8820C',strokeWidth:0,r:3}} activeDot={{r:5}} name="Fat (g)"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            {weightLogs.length > 1 && (
              <div className="progress-card">
                <h3>⚖️ Weight Trend</h3>
                <p style={{fontSize:'12px',color:'#9898AA',marginBottom:'16px'}}>Your weight journey over time</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={[...weightLogs].reverse().slice(-7).map(w => ({
                    date: new Date(w.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}),
                    weight: w.weightLbs
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F4" vertical={false}/>
                    <XAxis dataKey="date" tick={{fontSize:11,fill:'#9898AA'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#9898AA'}} axisLine={false} tickLine={false} domain={['dataMin - 2','dataMax + 2']}/>
                    <Tooltip {...tooltipStyle}/>
                    <Line type="monotone" dataKey="weight" stroke="#1D9E75" strokeWidth={2.5}
                      dot={{fill:'#1D9E75',strokeWidth:0,r:4}} activeDot={{r:6}} name="Weight (lbs)"/>
                  </LineChart>
                </ResponsiveContainer>
                <div className="weight-change">
                  {weightLogs[0].weightLbs < weightLogs[weightLogs.length-1].weightLbs
                    ? `📉 Lost ${(weightLogs[weightLogs.length-1].weightLbs - weightLogs[0].weightLbs).toFixed(1)} lbs total`
                    : `📈 Gained ${(weightLogs[0].weightLbs - weightLogs[weightLogs.length-1].weightLbs).toFixed(1)} lbs total`}
                </div>
              </div>
            )}
            <div className="progress-card">
              <h3>Goal Progress</h3>
              {[
                {label:'Calories',val:totalCalories,goal:dailyGoal,unit:'cal'},
                {label:'Protein',val:totalProtein,goal:proteinGoal,unit:'g'},
                {label:'Carbs',val:totalCarbs,goal:carbsGoal,unit:'g'},
                {label:'Fat',val:totalFat,goal:fatGoal,unit:'g'},
              ].map(item => (
                <div key={item.label} className="progress-bar-section">
                  <div className="progress-bar-label"><span>{item.label}</span><span>{item.val} / {item.goal}{item.unit}</span></div>
                  <div className="progress-bar-bg"><div className="progress-bar-fill" style={{width:`${Math.min((item.val/item.goal)*100,100)}%`}}/></div>
                </div>
              ))}
            </div>
            <div className="progress-card">
              <h3>⚖️ Log Weight</h3>
              <div className="weight-input-row">
                <input type="number" className="weight-input" placeholder="Enter weight (lbs)"
                  value={weightLbs} onChange={e => setWeightLbs(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && logWeight()}/>
                <button className="weight-log-btn" onClick={logWeight}>Log</button>
              </div>
              {weightLogs.length === 0 ? (
                <div className="empty-state"><span>⚖️</span><p>No weight logged yet</p></div>
              ) : (
                <div className="weight-list">
                  {weightLogs.slice(0,5).map(w => (
                    <div key={w.id} className="weight-item">
                      <span className="weight-date">{new Date(w.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                      <span className="weight-val">{w.weightLbs} lbs</span>
                      <button onClick={() => deleteWeight(w.id)}
                        style={{background:'transparent',border:'none',color:'#E4E4EC',cursor:'pointer',fontSize:'14px'}}
                        onMouseOver={e=>e.target.style.color='#E85A5A'}
                        onMouseOut={e=>e.target.style.color='#E4E4EC'}>🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACHIEVEMENTS */}
        {activeTab === 'achievements' && (
          <div className="tab-content">
            <div className="progress-card">
              <h3>🏆 Achievements</h3>
              <p style={{fontSize:'12px',color:'#9898AA',marginBottom:'12px'}}>{unlockedCount} of {achievements.length} unlocked</p>
              <div className="achievements-progress-bar">
                <div className="achievements-progress-fill" style={{width:`${(unlockedCount/achievements.length)*100}%`}}/>
              </div>
              <div style={{fontSize:'11px',color:'#9898AA',marginTop:'6px',textAlign:'right'}}>{Math.round((unlockedCount/achievements.length)*100)}% complete</div>
            </div>
            <div className="achievements-grid">
              {achievements.map(a => (
                <div key={a.id} className={`achievement-card ${a.unlocked ? 'unlocked' : 'locked'}`}
                  style={a.unlocked ? {borderColor:a.border,background:a.bg} : {}}>
                  <div className="achievement-icon" style={a.unlocked ? {background:a.bg,border:`1px solid ${a.border}`} : {}}>
                    {a.unlocked ? a.icon : '🔒'}
                  </div>
                  <div className="achievement-info">
                    <div className="achievement-title" style={a.unlocked ? {color:a.color} : {}}>{a.title}</div>
                    <div className="achievement-desc">{a.desc}</div>
                  </div>
                  {a.unlocked && <div className="achievement-check">✓</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI COACH */}
        {activeTab === 'coach' && (
          <div className="tab-content">
            <div className="progress-card">
              <h3>🤖 AI Health Coach</h3>
              <p style={{fontSize:'12px',color:'#9898AA',marginBottom:'16px'}}>Powered by Gemini AI — ask anything about your health and nutrition</p>
              <div className="coach-context">
                <div className="coach-context-item"><span>🎯 Goal</span><strong>{profile.goal}</strong></div>
                <div className="coach-context-item"><span>🔥 Calories</span><strong>{totalCalories}/{dailyGoal}</strong></div>
                <div className="coach-context-item"><span>💪 Protein</span><strong>{totalProtein}g/{proteinGoal}g</strong></div>
                <div className="coach-context-item"><span>🏃 Burned</span><strong>{totalBurned} cal</strong></div>
              </div>
            </div>
            <div className="progress-card">
              <div className="chat-messages">
                {chatHistory.length === 0 && (
                  <div className="chat-welcome">
                    <div style={{fontSize:'40px',marginBottom:'12px'}}>🤖</div>
                    <div style={{fontSize:'15px',fontWeight:'700',color:'#0A0A14',marginBottom:'6px'}}>Hi {currentUser}! I'm your AI Coach</div>
                    <div style={{fontSize:'12px',color:'#9898AA',marginBottom:'20px'}}>Ask me anything about your nutrition, fitness goals, or health!</div>
                    <div className="quick-prompts">
                      {quickPrompts.map((p,i) => (
                        <button key={i} className="quick-prompt-btn" onClick={() => setAiMessage(p)}>{p}</button>
                      ))}
                    </div>
                  </div>
                )}
                {chatHistory.map((msg,i) => (
                  <div key={i} className={`chat-msg ${msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}>
                    {msg.role === 'ai' && <div className="chat-ai-icon">🤖</div>}
                    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="chat-msg chat-msg-ai">
                    <div className="chat-ai-icon">🤖</div>
                    <div className="chat-bubble chat-bubble-ai">
                      <span className="chat-typing"><span/><span/><span/></span>
                    </div>
                  </div>
                )}
              </div>
              <div className="chat-input-row">
                <input className="chat-input" placeholder="Ask your AI coach anything..."
                  value={aiMessage} onChange={e => setAiMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askAiCoach()}/>
                <button className="chat-send-btn" onClick={askAiCoach} disabled={aiLoading}>
                  {aiLoading ? <span className="spinner"/> : '→'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE */}
        {activeTab === 'profile' && (
          <div className="tab-content">
            <div className="profile-card">
              <h3 className="profile-title">My Profile</h3>
              <p className="profile-sub">Your stats power your personalized calorie goal</p>
              <div className="profile-goal-banner">
                <span className="profile-goal-label">Your Daily Calorie Goal</span>
                <span className="profile-goal-num">{dailyGoal}</span>
                <span className="profile-goal-sub">
                  {profile.goal==='lose'?'🔥 Weight Loss':profile.goal==='gain'?'💪 Muscle Gain':'⚖️ Maintain Weight'}
                </span>
              </div>
              <div className="profile-grid">
                <div className="profile-field"><label>Age</label>
                  <input type="number" className="profile-input" value={profile.age} onChange={e=>setProfile({...profile,age:parseInt(e.target.value)||0})}/></div>
                <div className="profile-field"><label>Weight (lbs)</label>
                  <input type="number" className="profile-input" value={profile.weightLbs} onChange={e=>setProfile({...profile,weightLbs:parseInt(e.target.value)||0})}/></div>
                <div className="profile-field"><label>Height (feet)</label>
                  <input type="number" className="profile-input" value={profile.heightFeet} onChange={e=>setProfile({...profile,heightFeet:parseInt(e.target.value)||0})}/></div>
                <div className="profile-field"><label>Height (inches)</label>
                  <input type="number" className="profile-input" value={profile.heightInches} onChange={e=>setProfile({...profile,heightInches:parseInt(e.target.value)||0})}/></div>
              </div>
              <div className="profile-field-full"><label>Sex</label>
                <div className="profile-options">
                  {['male','female'].map(s=>(
                    <button key={s} className={`profile-option ${profile.sex===s?'profile-option-active':''}`}
                      onClick={()=>setProfile({...profile,sex:s})}>{s==='male'?'♂ Male':'♀ Female'}</button>
                  ))}
                </div>
              </div>
              <div className="profile-field-full"><label>Activity Level</label>
                <div className="profile-options">
                  {[{val:'sedentary',label:'🪑 Sedentary'},{val:'light',label:'🚶 Light'},{val:'moderate',label:'🏃 Moderate'},{val:'active',label:'⚡ Active'},{val:'veryactive',label:'🔥 Very Active'}].map(a=>(
                    <button key={a.val} className={`profile-option ${profile.activity===a.val?'profile-option-active':''}`}
                      onClick={()=>setProfile({...profile,activity:a.val})}>{a.label}</button>
                  ))}
                </div>
              </div>
              <div className="profile-field-full"><label>Goal</label>
                <div className="profile-options">
                  {[{val:'lose',label:'🔥 Lose Weight'},{val:'maintain',label:'⚖️ Maintain'},{val:'gain',label:'💪 Gain Muscle'}].map(g=>(
                    <button key={g.val} className={`profile-option ${profile.goal===g.val?'profile-option-active':''}`}
                      onClick={()=>setProfile({...profile,goal:g.val})}>{g.label}</button>
                  ))}
                </div>
              </div>
              <button className="profile-save-btn" onClick={saveProfile}>{profileSaved ? '✅ Saved!' : 'Save Profile'}</button>
            </div>
          </div>
        )}
      </main>

      <div className="bottomnav">
        {[
          {id:'dashboard',icon:'🏠',label:'Home'},
          {id:'log',icon:'🍽️',label:'Food'},
          {id:'exercise',icon:'💪',label:'Activity'},
          {id:'progress',icon:'📊',label:'Progress'},
          {id:'achievements',icon:'🏆',label:'Awards'},
          {id:'coach',icon:'🤖',label:'Coach'},
        ].map(item=>(
          <button key={item.id} className={`bottomnav-btn ${activeTab===item.id?'bottomnav-active':''}`}
            onClick={()=>setActiveTab(item.id)}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;