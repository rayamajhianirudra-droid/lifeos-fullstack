import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const USDA_KEY = process.env.REACT_APP_USDA_KEY || '';

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
  const [water, setWater] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const saved = JSON.parse(localStorage.getItem('waterLog') || '{}');
      return saved.date === today ? (saved.count || 0) : 0;
    } catch { return 0; }
  });
  const [mealType, setMealType] = useState('breakfast');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetStep, setResetStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [streak, setStreak] = useState(0);
  const [weightLbs, setWeightLbs] = useState('');
  const [weightLogs, setWeightLogs] = useState([]);
  const [waistInches, setWaistInches] = useState('');
  const [neckInches, setNeckInches] = useState('');
  const [hipInches, setHipInches] = useState('');
  const [bodyFatLogs, setBodyFatLogs] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [exerciseCategory, setExerciseCategory] = useState('cardio');
  const [totalBurned, setTotalBurned] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]);
  const [dailyHistory, setDailyHistory] = useState([]);
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
  // --- Supplement Tracker ---
  const [supplementLogs, setSupplementLogs] = useState([]);
  const [suppName, setSuppName] = useState('');
  const [suppDosage, setSuppDosage] = useState('');
  const [suppUnit, setSuppUnit] = useState('mg');
  const [suppTime, setSuppTime] = useState('morning');
  const [suppMsg, setSuppMsg] = useState('');

  // --- Sleep Tracker ---
  const [sleepLogs, setSleepLogs] = useState([]);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState('good');
  const [sleepBedtime, setSleepBedtime] = useState('');
  const [sleepWakeTime, setSleepWakeTime] = useState('');
  const [sleepNotes, setSleepNotes] = useState('');
  const [sleepMsg, setSleepMsg] = useState('');

  // --- Mood Tracker ---
  const [moodLogs, setMoodLogs] = useState([]);
  const [moodScore, setMoodScore] = useState(5);
  const [moodEnergy, setMoodEnergy] = useState('medium');
  const [moodStress, setMoodStress] = useState('low');
  const [moodNotes, setMoodNotes] = useState('');
  const [moodMsg, setMoodMsg] = useState('');

  // --- Custom Food ---
  const [customFoods, setCustomFoods] = useState([]);
  const [customFoodName, setCustomFoodName] = useState('');
  const [customFoodCal, setCustomFoodCal] = useState('');
  const [customFoodProtein, setCustomFoodProtein] = useState('');
  const [customFoodCarbs, setCustomFoodCarbs] = useState('');
  const [customFoodFat, setCustomFoodFat] = useState('');
  const [customFoodServing, setCustomFoodServing] = useState('100');
  const [customFoodUnit, setCustomFoodUnit] = useState('g');
  const [customFoodMsg, setCustomFoodMsg] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // --- Notifications ---
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [chartRange, setChartRange] = useState('7d');

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
  const heightInchesTotal = profile.heightFeet * 12 + profile.heightInches;

  useEffect(() => {
    if (token) {
      fetchFoodLogs(selectedDate);
      fetchStreak();
      fetchWeightLogs();
      fetchBodyFatLogs();
      fetchExerciseLogs(selectedDate);
      fetchWeeklyData();
      fetchDailyHistory();
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

  // Persist water intake daily — resets automatically at midnight via date key
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      localStorage.setItem('waterLog', JSON.stringify({ date: today, count: water }));
    } catch { /* storage full or blocked */ }
  }, [water]);

  // Helper: extract user ID from the JWT token payload
  const getUserIdFromToken = (jwt) => {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      return payload.userId || payload.id || payload.sub || null;
    } catch (e) {
      console.log('Could not decode token:', e);
      return null;
    }
  };

  // PUSH NOTIFICATIONS - subscribe on login
  useEffect(() => {
    if (!token) return;

    const subscribeToPush = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const userId = getUserIdFromToken(token);
      if (!userId) {
        console.log('Could not determine user ID from token — push subscription skipped.');
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription = existing || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.REACT_APP_VAPID_KEY || ''
          ),
        });

        await axios.post(`${API}/push/subscribe`, {
          userId: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.toJSON().keys.p256dh,
          auth: subscription.toJSON().keys.auth,
        }, { headers: { Authorization: `Bearer ${token}` } });

        console.log('Push subscription saved for user', userId);
      } catch (err) {
        console.log('Push subscription failed:', err);
      }
    };

    subscribeToPush();
  }, [token]); // eslint-disable-line
  // MEAL REMINDERS
  useEffect(() => {
    if (!token) return;

    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    };
    requestNotificationPermission();

    const checkAndNotify = () => {
      if (Notification.permission !== 'granted') return;
      const hour = new Date().getHours();
      const hasBreakfast = foodLogs.some(f => f.mealType === 'breakfast');
      const hasLunch = foodLogs.some(f => f.mealType === 'lunch');
      const hasDinner = foodLogs.some(f => f.mealType === 'dinner');

      if (hour === 8 && !hasBreakfast) {
        new Notification('🌅 LifeOS — Breakfast time!', {
          body: `Good morning ${currentUser}! Don't forget to log your breakfast.`,
          icon: '/favicon.ico'
        });
      }
      if (hour === 12 && !hasLunch) {
        new Notification('☀️ LifeOS — Lunch time!', {
          body: `Hey ${currentUser}! Log your lunch to stay on track.`,
          icon: '/favicon.ico'
        });
      }
      if (hour === 18 && !hasDinner) {
        new Notification('🌙 LifeOS — Dinner time!', {
          body: `${currentUser}, don't forget to log dinner. Keep your streak alive! 🔥`,
          icon: '/favicon.ico'
        });
      }
    };

    const interval = setInterval(checkAndNotify, 30 * 60 * 1000);
    checkAndNotify();
    return () => clearInterval(interval);
  }, [token, foodLogs]); // eslint-disable-line

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

  const fetchBodyFatLogs = async () => {
    try {
      const res = await axios.get(`${API}/bodyfat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBodyFatLogs(res.data);
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

  const fetchDailyHistory = async () => {
    try {
      const res = await axios.get(`${API}/foodlogs/history?days=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDailyHistory(res.data);
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

  const logBodyFat = async () => {
    if (!waistInches || !neckInches || (profile.sex === 'female' && !hipInches)) return;
    try {
      await axios.post(`${API}/bodyfat`, {
        sex: profile.sex,
        heightInches: heightInchesTotal,
        waistInches: parseFloat(waistInches),
        neckInches: parseFloat(neckInches),
        hipInches: profile.sex === 'female' ? parseFloat(hipInches) : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setWaistInches(''); setNeckInches(''); setHipInches('');
      fetchBodyFatLogs();
    } catch (err) { console.log(err); }
  };

  const deleteBodyFat = async (id) => {
    try {
      await axios.delete(`${API}/bodyfat/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBodyFatLogs();
    } catch (err) { console.log(err); }
  };

  const getBodyFatCategory = (pct, sex) => {
    if (sex === 'female') {
      if (pct < 14) return 'Essential Fat';
      if (pct < 21) return 'Athletic';
      if (pct < 25) return 'Fit';
      if (pct < 32) return 'Average';
      return 'Above Average';
    }
    if (pct < 6) return 'Essential Fat';
    if (pct < 14) return 'Athletic';
    if (pct < 18) return 'Fit';
    if (pct < 25) return 'Average';
    return 'Above Average';
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
    if (msg.includes('weight') || msg.includes('lose') || msg.includes('fat'))
      return `Stay in your calorie deficit consistently — that's the only thing that works. Protein keeps you full and preserves muscle. Log everything, even the small stuff. Consistency over perfection.`;
    if (msg.includes('bmi'))
      return `Your BMI is ${bmi} — ${bmiLabel}. ${parseFloat(bmi) < 25 ? 'You\'re in a healthy range. Focus on body composition now — build muscle, reduce fat.' : 'Focus on gradual weight loss through consistent deficit. 0.5-1 lb per week is sustainable and healthy.'}`;
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
      fetchFoodLogs(selectedDate); fetchStreak(); fetchWeeklyData(); fetchDailyHistory();
      setTimeout(() => fetchFoodLogs(selectedDate), 4000);
      setTimeout(() => setMessage(''), 3000);

      // Check if this food log pushed us past 80%/100% of calorie goal
      const userId = getUserIdFromToken(token);
      if (userId) {
        const newTotal = totalCalories + food.calories;
        axios.post(`${API}/push/check-threshold`, {
          userId: userId,
          totalCalories: newTotal,
          calorieGoal: dailyGoal,
        }, { headers: { Authorization: `Bearer ${token}` } }).catch(err => {
          console.log('Threshold check failed:', err);
        });
      }
    } catch (err) { setMessage('❌ Error logging food.'); }
  };

  const deleteFood = async (id) => {
    try {
      await axios.delete(`${API}/foodlogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFoodLogs(selectedDate); fetchStreak(); fetchWeeklyData(); fetchDailyHistory();
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

  // --- Smart Reminders ---
  const getSmartReminders = () => {
    const now = new Date();
    const hour = now.getHours();
    const reminders = [];

    const hasBreakfast = foodLogs.some(f => f.mealType === 'breakfast');
    const hasLunch = foodLogs.some(f => f.mealType === 'lunch');
    const hasDinner = foodLogs.some(f => f.mealType === 'dinner');
    const todayExercise = exerciseLogs.length > 0;
    const calorieRemaining = dailyGoal - totalCalories + totalBurned;
    const proteinRemaining = proteinGoal - totalProtein;

    // Breakfast reminder (6am–10am)
    if (hour >= 6 && hour < 10 && !hasBreakfast) {
      reminders.push({ icon: '🌅', title: 'Log Breakfast', desc: "Start the day right — you haven't logged breakfast yet.", color: '#5B4FD4' });
    }
    // Lunch reminder (11am–2pm)
    if (hour >= 11 && hour < 14 && !hasLunch) {
      reminders.push({ icon: '☀️', title: 'Log Lunch', desc: "It's lunchtime — don't forget to log your meal.", color: '#1D9E75' });
    }
    // Dinner reminder (5pm–9pm)
    if (hour >= 17 && hour < 21 && !hasDinner) {
      reminders.push({ icon: '🌙', title: 'Log Dinner', desc: "Evening coming up — log dinner to keep your streak.", color: '#D85A30' });
    }
    // Water reminder
    if (water < 4 && hour >= 12) {
      reminders.push({ icon: '💧', title: 'Drink More Water', desc: `Only ${water}/8 glasses so far. Aim for at least 8 today.`, color: '#3B82F6' });
    } else if (water < 8 && hour >= 18) {
      reminders.push({ icon: '💧', title: 'Almost There — Water', desc: `${water}/8 glasses. ${8 - water} more to hit your goal.`, color: '#3B82F6' });
    }
    // Calorie warning — under 20% by 8pm
    if (hour >= 20 && calorieRemaining > dailyGoal * 0.2) {
      reminders.push({ icon: '🎯', title: 'Low Calorie Day', desc: `Only ${totalCalories} of ${dailyGoal} calories logged. Consider a snack.`, color: '#E8820C' });
    }
    // Over calorie goal
    if (totalCalories > dailyGoal * 1.1) {
      reminders.push({ icon: '⚠️', title: 'Over Calorie Goal', desc: `You're ${totalCalories - dailyGoal} cal over today's goal. Stay mindful.`, color: '#D85A30' });
    }
    // Protein reminder
    if (proteinRemaining > 20 && hour >= 15) {
      reminders.push({ icon: '💪', title: 'Protein Goal', desc: `${Math.round(proteinRemaining)}g of protein left to hit your goal. Add a high-protein snack.`, color: '#1D9E75' });
    }
    // Exercise reminder (afternoon with no exercise)
    if (!todayExercise && hour >= 14 && hour < 20) {
      reminders.push({ icon: '🏃', title: 'No Exercise Logged', desc: "You haven't logged any activity today. Even a walk counts!", color: '#7C5CFC' });
    }
    // Streak at risk (end of day, nothing logged)
    if (streak > 0 && foodLogs.length === 0 && hour >= 20) {
      reminders.push({ icon: '🔥', title: 'Streak at Risk!', desc: `Your ${streak}-day streak will reset if you don't log anything today.`, color: '#D85A30' });
    }
    // All good message when nothing to remind
    if (reminders.length === 0) {
      reminders.push({ icon: '✅', title: "You're on track!", desc: 'All goals looking good today. Keep it up!', color: '#1D9E75' });
    }
    return reminders;
  };
  const smartReminders = getSmartReminders();
  const unreadCount = smartReminders.filter(r => r.icon !== '✅').length;

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

  const pieData = [
    { name: 'Protein', value: Math.round(totalProtein * 4), grams: totalProtein, pct: totalCalories > 0 ? Math.round((totalProtein * 4 / totalCalories) * 100) : 0 },
    { name: 'Carbs', value: Math.round(totalCarbs * 4), grams: totalCarbs, pct: totalCalories > 0 ? Math.round((totalCarbs * 4 / totalCalories) * 100) : 0 },
    { name: 'Fat', value: Math.round(totalFat * 9), grams: totalFat, pct: totalCalories > 0 ? Math.round((totalFat * 9 / totalCalories) * 100) : 0 },
  ];
  const pieColors = ['#5B4FD4', '#1D9E75', '#E8820C'];

  const quickPrompts = [
    'What should I eat for dinner?',
    'Am I on track today?',
    'How can I improve my health score?',
    'Is my BMI healthy?',
    'What workout should I do today?',
  ];


  // --- Supplement functions ---
  const fetchSupplements = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/supplements`, { headers: { Authorization: `Bearer ${token}` } });
      setSupplementLogs(res.data);
    } catch(e) {}
  };
  const logSupplement = async () => {
    if (!suppName.trim()) return setSuppMsg('Enter supplement name');
    try {
      await axios.post(`${API}/supplements`, {
        supplementName: suppName, dosage: suppDosage, unit: suppUnit, timeOfDay: suppTime
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuppName(''); setSuppDosage(''); setSuppMsg('✅ Logged!');
      fetchSupplements();
      setTimeout(() => setSuppMsg(''), 2000);
    } catch(e) { setSuppMsg('Error logging supplement'); }
  };
  const deleteSupplement = async (id) => {
    await axios.delete(`${API}/supplements/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    fetchSupplements();
  };

  // --- Sleep functions ---
  const fetchSleep = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/sleep`, { headers: { Authorization: `Bearer ${token}` } });
      setSleepLogs(res.data);
    } catch(e) {}
  };
  const logSleep = async () => {
    if (!sleepHours) return setSleepMsg('Enter hours slept');
    try {
      await axios.post(`${API}/sleep`, {
        hoursSlept: parseFloat(sleepHours), quality: sleepQuality,
        bedtime: sleepBedtime, wakeTime: sleepWakeTime, notes: sleepNotes
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSleepHours(''); setSleepBedtime(''); setSleepWakeTime(''); setSleepNotes('');
      setSleepMsg('✅ Sleep logged!');
      fetchSleep();
      setTimeout(() => setSleepMsg(''), 2000);
    } catch(e) { setSleepMsg('Error logging sleep'); }
  };
  const deleteSleep = async (id) => {
    await axios.delete(`${API}/sleep/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    fetchSleep();
  };

  // --- Mood functions ---
  const fetchMood = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/mood`, { headers: { Authorization: `Bearer ${token}` } });
      setMoodLogs(res.data);
    } catch(e) {}
  };
  const logMood = async () => {
    const labels = ['', 'Awful', 'Bad', 'Meh', 'Okay', 'Fine', 'Good', 'Great', 'Amazing', 'Fantastic', 'Perfect'];
    try {
      await axios.post(`${API}/mood`, {
        moodScore, moodLabel: labels[moodScore] || 'Good',
        energyLevel: moodEnergy, stressLevel: moodStress, notes: moodNotes
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMoodNotes(''); setMoodMsg('✅ Mood logged!');
      fetchMood();
      setTimeout(() => setMoodMsg(''), 2000);
    } catch(e) { setMoodMsg('Error logging mood'); }
  };
  const deleteMood = async (id) => {
    await axios.delete(`${API}/mood/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    fetchMood();
  };

  // --- Custom Food functions ---
  const fetchCustomFoods = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/custom-foods`, { headers: { Authorization: `Bearer ${token}` } });
      setCustomFoods(res.data);
    } catch(e) {}
  };
  const saveCustomFood = async () => {
    if (!customFoodName.trim() || !customFoodCal) return setCustomFoodMsg('Enter name and calories');
    try {
      await axios.post(`${API}/custom-foods`, {
        foodName: customFoodName, calories: parseFloat(customFoodCal),
        protein: parseFloat(customFoodProtein) || 0,
        carbs: parseFloat(customFoodCarbs) || 0,
        fat: parseFloat(customFoodFat) || 0,
        servingSize: parseFloat(customFoodServing) || 100,
        servingUnit: customFoodUnit
      }, { headers: { Authorization: `Bearer ${token}` } });
      setCustomFoodName(''); setCustomFoodCal(''); setCustomFoodProtein('');
      setCustomFoodCarbs(''); setCustomFoodFat('');
      setCustomFoodMsg('✅ Saved!'); setShowCustomForm(false);
      fetchCustomFoods();
      setTimeout(() => setCustomFoodMsg(''), 2000);
    } catch(e) { setCustomFoodMsg('Error saving food'); }
  };
  const logCustomFood = async (cf) => {
    try {
      await axios.post(`${API}/custom-foods/${cf.id}/log`, { mealType },
        { headers: { Authorization: `Bearer ${token}` } });
      setMessage(`✅ ${cf.foodName} logged!`);
      fetchFoodLogs(selectedDate);
      setTimeout(() => setMessage(''), 2000);
    } catch(e) {}
  };
  const deleteCustomFood = async (id) => {
    await axios.delete(`${API}/custom-foods/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    fetchCustomFoods();
  };


  useEffect(() => {
    if (token) {
      fetchSupplements();
      fetchSleep();
      fetchMood();
      fetchCustomFoods();
    }
  // eslint-disable-next-line
  }, [token]);

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
          { id: 'bodyfat', icon: 'ti-ruler', label: 'Body Fat' },
          { id: 'coach', icon: 'ti-robot', label: 'AI Coach' },
          { id: 'sleep', icon: 'ti-moon', label: 'Sleep' },
          { id: 'mood', icon: 'ti-mood-happy', label: 'Mood' },
          { id: 'supplements', icon: 'ti-pill', label: 'Supplements' },
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
                  <div key={i} className={`streak-dot ${i >= streak ? 'off' : ''}`} title={i < streak ? `Day ${i + 1} ✓` : `Day ${i + 1}`}/>
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
          <button className="dark-mode-btn" onClick={() => setDarkMode(!darkMode)} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            <i className={darkMode ? 'ti ti-sun' : 'ti ti-moon'} style={{fontSize:'16px', color: darkMode ? '#F5C842' : '#5B4FD4'}} aria-hidden="true"/>
          </button>
          <div className="topnav-notif" style={{position:'relative'}}>
            <button
              className="dark-mode-btn"
              onClick={() => setShowNotifDropdown(p => !p)}
              title="Smart reminders"
              style={{position:'relative'}}
            >
              <i className="ti ti-bell" style={{fontSize:'16px', color: unreadCount > 0 ? '#5B4FD4' : '#8888A0'}} aria-hidden="true"/>
              {unreadCount > 0 && (
                <span style={{
                  position:'absolute', top:'4px', right:'4px',
                  width:'8px', height:'8px', borderRadius:'50%',
                  background:'#D85A30', border:'1.5px solid var(--bg,#fff)'
                }}/>
              )}
            </button>
            {showNotifDropdown && (
              <>
                <div onClick={() => setShowNotifDropdown(false)} style={{position:'fixed',inset:0,zIndex:999}}/>
                <div style={{
                  position:'absolute', top:'calc(100% + 8px)', right:0,
                  width:'280px', background: darkMode ? '#1a1a2e' : '#fff',
                  border: darkMode ? '1px solid rgba(255,255,255,.1)' : '1px solid #E4E4EC',
                  borderRadius:'14px', boxShadow:'0 8px 32px rgba(0,0,0,.15)',
                  zIndex:1000, overflow:'hidden'
                }}>
                  <div style={{padding:'12px 16px 8px', borderBottom: darkMode ? '1px solid rgba(255,255,255,.07)' : '1px solid #F0F0F4'}}>
                    <span style={{fontSize:'13px', fontWeight:'700', color: darkMode ? '#F0F0FF' : '#0A0A14'}}>Smart Reminders</span>
                    <span style={{fontSize:'11px', color:'#8888A0', marginLeft:'6px'}}>{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
                  </div>
                  <div style={{maxHeight:'320px', overflowY:'auto'}}>
                    {smartReminders.map((r, i) => (
                      <div key={i} style={{
                        display:'flex', gap:'10px', alignItems:'flex-start',
                        padding:'10px 16px',
                        borderBottom: i < smartReminders.length - 1
                          ? (darkMode ? '1px solid rgba(255,255,255,.04)' : '1px solid #F7F7FA')
                          : 'none'
                      }}>
                        <span style={{
                          width:'32px', height:'32px', borderRadius:'10px', flexShrink:0,
                          background: r.color + '18', display:'flex', alignItems:'center',
                          justifyContent:'center', fontSize:'15px'
                        }}>{r.icon}</span>
                        <div>
                          <div style={{fontSize:'12px', fontWeight:'700', color: darkMode ? '#F0F0FF' : '#0A0A14', marginBottom:'2px'}}>{r.title}</div>
                          <div style={{fontSize:'11px', color:'#8888A0', lineHeight:'1.4'}}>{r.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
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

            {/* HERO SECTION */}
            <div className="dash-hero">
              <div className="hero-top">
                <div>
                  <div className="hero-greeting">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</div>
                  <div className="hero-name">{profile?.firstName || 'there'} 👋</div>
                  <div className="hero-date">{formatDateLabel(selectedDate)}</div>
                </div>
                <div className="hero-score-ring">
                  <svg width="58" height="58" viewBox="0 0 58 58">
                    <circle cx="29" cy="29" r="24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="6"/>
                    <circle cx="29" cy="29" r="24" fill="none" stroke="#fff" strokeWidth="6"
                      strokeDasharray={`${Math.min(healthScore, 100) * 1.508} 150.8`}
                      strokeLinecap="round" transform="rotate(-90 29 29)"
                      style={{transition:'stroke-dasharray .8s ease'}}/>
                    <text x="29" y="33" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">{healthScore}</text>
                  </svg>
                  <div className="hero-score-label">Score</div>
                </div>
              </div>
              <div className="hero-stats-row">
                <div className="hero-stat">
                  <div className="hero-stat-val">{totalCalories}</div>
                  <div className="hero-stat-label">Calories Eaten</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-val">{Math.round(caloriePercent)}%</div>
                  <div className="hero-stat-label">Goal Reached</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-val">{streak > 0 ? `🔥 ${streak}` : '—'}</div>
                  <div className="hero-stat-label">Day Streak</div>
                </div>
              </div>
            </div>

            {streak >= 3 && (
              <div className="streak-banner">
                <span className="streak-fire">🔥</span>
                <span className="streak-num">{streak}</span>
                <span className="streak-text">Day Streak</span>
                {streak >= 30 && <span className="streak-badge">💎 Monthly Master</span>}
                {streak >= 7 && streak < 30 && <span className="streak-badge">⭐ Week Warrior</span>}
                {streak >= 3 && streak < 7 && <span className="streak-badge">🌱 On a Roll</span>}
              </div>
            )}

            {/* QUICK ACTIONS */}
            <div className="quick-actions">
              <button className="quick-action-btn" onClick={() => setActiveTab('log')}>
                <span className="quick-action-icon">🍽️</span>
                <span className="quick-action-label">Log Food</span>
              </button>
              <button className="quick-action-btn" onClick={() => setActiveTab('exercise')}>
                <span className="quick-action-icon">💪</span>
                <span className="quick-action-label">Log Exercise</span>
              </button>
              <button className="quick-action-btn" onClick={() => setActiveTab('coach')}>
                <span className="quick-action-icon">🤖</span>
                <span className="quick-action-label">AI Coach</span>
              </button>
            </div>

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
                  <span className="cal-stat-label">Net Eaten</span>
                  <span className="cal-stat-val" style={{color: (totalCalories - totalBurned) > dailyGoal ? '#D85A30' : '#5B4FD4'}}>{Math.max(totalCalories - totalBurned, 0)}</span>
                  <span className="cal-stat-badge badge-purple">net kcal</span>
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
              <div className="water-progress">
                <div className="water-progress-fill" style={{width:`${Math.min(water/8*100,100)}%`}}/>
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
            {/* WELLNESS STRIP */}
            <div className="wellness-strip">
              <div className="wellness-tile" onClick={() => setActiveTab('sleep')}>
                <span className="wellness-tile-icon">😴</span>
                <div className="wellness-tile-val">{sleepLogs && sleepLogs.length > 0 ? sleepLogs[0]?.hoursSlept || '—' : '—'}</div>
                <div className="wellness-tile-label">Hrs Sleep</div>
                <div className="wellness-tile-bar"><div className="wellness-tile-fill" style={{width:`${Math.min(((sleepLogs && sleepLogs.length > 0 ? sleepLogs[0]?.hoursSlept : 0)/8)*100,100)}%`,background:'#7C5CFC'}}/></div>
              </div>
              <div className="wellness-tile" onClick={() => setActiveTab('mood')}>
                <span className="wellness-tile-icon">😊</span>
                <div className="wellness-tile-val">{moodLogs && moodLogs.length > 0 ? moodLogs[0]?.mood || '—' : '—'}</div>
                <div className="wellness-tile-label">Today's Mood</div>
                <div className="wellness-tile-bar"><div className="wellness-tile-fill" style={{width:'80%',background:'#1D9E75'}}/></div>
              </div>
              <div className="wellness-tile" onClick={() => setActiveTab('activity')}>
                <span className="wellness-tile-icon">🔥</span>
                <div className="wellness-tile-val">{totalBurned}</div>
                <div className="wellness-tile-label">Cal Burned</div>
                <div className="wellness-tile-bar"><div className="wellness-tile-fill" style={{width:`${Math.min((totalBurned/500)*100,100)}%`,background:'#E8820C'}}/></div>
              </div>
            </div>

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

            {/* CUSTOM FOODS */}
            <div className="log-card" style={{marginTop:'16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <div>
                  <h3 className="log-title" style={{marginBottom:'2px'}}>My Custom Foods</h3>
                  <p className="log-sub">Foods you created with your own macros</p>
                </div>
                <button className="search-btn" style={{padding:'8px 14px',fontSize:'12px'}}
                  onClick={() => setShowCustomForm(!showCustomForm)}>+ Create</button>
              </div>
              {customFoodMsg && <div className="log-message">{customFoodMsg}</div>}
              {showCustomForm && (
                <div style={{background:'#F7F7FA',borderRadius:'12px',padding:'14px',marginBottom:'14px',border:'.5px solid #EBEBF0'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                    <input className="search-input" placeholder="Food name *" value={customFoodName} onChange={e=>setCustomFoodName(e.target.value)} style={{gridColumn:'1/-1'}}/>
                    <input type="number" className="search-input" placeholder="Calories *" value={customFoodCal} onChange={e=>setCustomFoodCal(e.target.value)}/>
                    <input type="number" className="search-input" placeholder="Protein (g)" value={customFoodProtein} onChange={e=>setCustomFoodProtein(e.target.value)}/>
                    <input type="number" className="search-input" placeholder="Carbs (g)" value={customFoodCarbs} onChange={e=>setCustomFoodCarbs(e.target.value)}/>
                    <input type="number" className="search-input" placeholder="Fat (g)" value={customFoodFat} onChange={e=>setCustomFoodFat(e.target.value)}/>
                    <input type="number" className="search-input" placeholder="Serving size" value={customFoodServing} onChange={e=>setCustomFoodServing(e.target.value)}/>
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    {['g','oz','ml','cup','tbsp','serving'].map(u=>(
                      <button key={u} onClick={()=>setCustomFoodUnit(u)}
                        style={{padding:'4px 10px',borderRadius:'8px',border:'.5px solid #DDDDE4',background:customFoodUnit===u?'#5B4FD4':'#fff',color:customFoodUnit===u?'#fff':'#555',fontSize:'11px',cursor:'pointer',fontWeight:customFoodUnit===u?'600':'400'}}>
                        {u}
                      </button>
                    ))}
                  </div>
                  <button className="log-btn" style={{marginTop:'10px',width:'100%',padding:'10px'}} onClick={saveCustomFood}>Save Custom Food</button>
                </div>
              )}
              {customFoods.length === 0 ? (
                <div className="empty-state"><span>🍱</span><p>No custom foods yet. Create one above!</p></div>
              ) : (
                <div className="search-results">
                  {customFoods.map(cf => (
                    <div key={cf.id} className="result-item">
                      <div className="result-left">
                        <p className="result-name">{cf.foodName}</p>
                        <p className="result-macros">{cf.calories} cal · {cf.protein}g P · {cf.carbs}g C · {cf.fat}g F · per {cf.servingSize}{cf.servingUnit}</p>
                      </div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button className="log-btn" onClick={()=>logCustomFood(cf)}>+ Log</button>
                        <button onClick={()=>deleteCustomFood(cf.id)}
                          className="delete-btn">🗑️</button>
                      </div>
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
                        <div style={{fontSize:'13px',fontWeight:'600',color: darkMode ? '#F0F0FF' : '#0A0A14'}}>{e.exerciseName}</div>
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

            {/* ── ANALYTICS HEADER ── */}
            <div className="analytics-header">
              <div className="analytics-title-row">
                <div>
                  <div className="analytics-title">Analytics</div>
                  <div className="analytics-subtitle">Track your health journey</div>
                </div>
                <div className="range-tabs">
                  {['7D','30D','90D'].map(r => (
                    <button key={r}
                      className={`range-tab${chartRange === r ? ' range-tab-active' : ''}`}
                      onClick={() => setChartRange(r)}>{r}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SUMMARY STAT ROW ── */}
            <div className="analytics-summary-row">
              <div className="analytics-stat">
                <div className="analytics-stat-val">{foodLogs.length}</div>
                <div className="analytics-stat-label">Foods Logged</div>
              </div>
              <div className="analytics-stat analytics-stat-divider">
                <div className="analytics-stat-val" style={{color:'var(--color-primary)'}}>{totalCalories}</div>
                <div className="analytics-stat-label">Calories</div>
              </div>
              <div className="analytics-stat analytics-stat-divider">
                <div className="analytics-stat-val" style={{color:'var(--color-nutrition)'}}>{totalProtein}g</div>
                <div className="analytics-stat-label">Protein</div>
              </div>
              <div className="analytics-stat analytics-stat-divider">
                <div className="analytics-stat-val" style={{color:'var(--color-activity)'}}>🔥{streak}</div>
                <div className="analytics-stat-label">Day Streak</div>
              </div>
            </div>

            {/* ── CALORIE TREND ── */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <div className="analytics-card-title">📊 Calorie Trend</div>
                  <div className="analytics-card-sub">Daily intake — last {chartRange === '7D' ? '7' : chartRange === '30D' ? '30' : '90'} days</div>
                </div>
                <div className="analytics-card-badge">{dailyHistory.length} days</div>
              </div>
              {dailyHistory.length === 0 ? (
                <div className="empty-state"><span>📊</span><p>Log food to see your trend</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartRange === '7D' ? dailyHistory.slice(-7) : chartRange === '30D' ? dailyHistory.slice(-30) : dailyHistory}>
                    <defs>
                      <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5B4FD4" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#5B4FD4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false}/>
                    <XAxis dataKey="day" tick={{fontSize:10,fill:'var(--color-ink-tertiary)'}} axisLine={false} tickLine={false}
                      interval={Math.max(0, Math.floor(dailyHistory.length / 6))}/>
                    <YAxis tick={{fontSize:10,fill:'var(--color-ink-tertiary)'}} axisLine={false} tickLine={false} width={36}/>
                    <Tooltip {...tooltipStyle}
                      formatter={(v) => [`${v} cal`, 'Calories']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}/>
                    <Area type="monotone" dataKey="calories" stroke="#5B4FD4" strokeWidth={2.5}
                      fill="url(#calGrad)" dot={false} activeDot={{r:5,fill:'#5B4FD4'}} name="Calories"/>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── MACRO DONUT ── */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <div className="analytics-card-title">🥧 Macro Breakdown</div>
                  <div className="analytics-card-sub">Today's distribution</div>
                </div>
              </div>
              {totalCalories === 0 ? (
                <div className="empty-state"><span>🥧</span><p>Log food to see macros</p></div>
              ) : (
                <div className="macro-donut-layout">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                        paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                        {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]}/>)}
                      </Pie>
                      <Tooltip
                        formatter={(v, n, p) => [`${p.payload.grams}g (${v} cal)`, n]}
                        contentStyle={{background:'var(--color-surface)',border:'.5px solid var(--color-border)',borderRadius:'12px',fontSize:'12px'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="macro-donut-legend">
                    {pieData.map((m, i) => (
                      <div key={m.name} className="macro-legend-row">
                        <div className="macro-legend-dot" style={{background:pieColors[i]}}/>
                        <div className="macro-legend-info">
                          <div className="macro-legend-name">{m.name}</div>
                          <div className="macro-legend-val">{m.grams}g · {m.pct}%</div>
                        </div>
                        <div className="macro-legend-bar-wrap">
                          <div className="macro-legend-bar" style={{width:`${m.pct}%`,background:pieColors[i]}}/>
                        </div>
                      </div>
                    ))}
                    <div className="macro-total-pill">
                      <span className="macro-total-label">Total</span>
                      <span className="macro-total-val">{totalCalories} kcal</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── WEEKLY MULTI-MACRO CHART ── */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <div className="analytics-card-title">💪 Macro Trends</div>
                  <div className="analytics-card-sub">Protein · Carbs · Fat — last {chartRange === '7D' ? '7' : chartRange === '30D' ? '30' : '90'} days</div>
                </div>
                <div className="chart-legend-pills">
                  <span className="legend-pill" style={{background:'rgba(91,79,212,.1)',color:'#5B4FD4'}}>P</span>
                  <span className="legend-pill" style={{background:'rgba(29,158,117,.1)',color:'#1D9E75'}}>C</span>
                  <span className="legend-pill" style={{background:'rgba(232,130,12,.1)',color:'#E8820C'}}>F</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartRange === '7D' ? weeklyData : chartRange === '30D' ? dailyHistory.slice(-30) : dailyHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false}/>
                  <XAxis dataKey="day" tick={{fontSize:10,fill:'var(--color-ink-tertiary)'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'var(--color-ink-tertiary)'}} axisLine={false} tickLine={false} width={28}/>
                  <Tooltip {...tooltipStyle}/>
                  <Line type="monotone" dataKey="protein" stroke="#5B4FD4" strokeWidth={2} dot={false} activeDot={{r:4}} name="Protein (g)"/>
                  <Line type="monotone" dataKey="carbs" stroke="#1D9E75" strokeWidth={2} dot={false} activeDot={{r:4}} name="Carbs (g)"/>
                  <Line type="monotone" dataKey="fat" stroke="#E8820C" strokeWidth={2} dot={false} activeDot={{r:4}} name="Fat (g)"/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── WEIGHT TREND ── */}
            {weightLogs.length > 1 && (
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <div className="analytics-card-title">⚖️ Weight Trend</div>
                    <div className="analytics-card-sub">Your journey over time</div>
                  </div>
                  <div className={`weight-delta-badge ${weightLogs[0].weightLbs <= weightLogs[weightLogs.length-1].weightLbs ? 'weight-delta-down' : 'weight-delta-up'}`}>
                    {weightLogs[0].weightLbs <= weightLogs[weightLogs.length-1].weightLbs
                      ? `📉 −${(weightLogs[weightLogs.length-1].weightLbs - weightLogs[0].weightLbs).toFixed(1)} lbs`
                      : `📈 +${(weightLogs[0].weightLbs - weightLogs[weightLogs.length-1].weightLbs).toFixed(1)} lbs`}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={[...weightLogs].reverse().slice(-(chartRange === '7D' ? 7 : chartRange === '30D' ? 30 : 90)).map(w => ({
                    date: new Date(w.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}),
                    weight: w.weightLbs
                  }))}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false}/>
                    <XAxis dataKey="date" tick={{fontSize:10,fill:'var(--color-ink-tertiary)'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'var(--color-ink-tertiary)'}} axisLine={false} tickLine={false} domain={['dataMin - 2','dataMax + 2']} width={36}/>
                    <Tooltip {...tooltipStyle}/>
                    <Area type="monotone" dataKey="weight" stroke="#1D9E75" strokeWidth={2.5}
                      fill="url(#weightGrad)" dot={false} activeDot={{r:5,fill:'#1D9E75'}} name="Weight (lbs)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── GOAL PROGRESS ── */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div className="analytics-card-title">🎯 Today's Goals</div>
              </div>
              {[
                {label:'Calories',val:totalCalories,goal:dailyGoal,unit:'cal',color:'var(--color-primary)'},
                {label:'Protein',val:totalProtein,goal:proteinGoal,unit:'g',color:'#5B4FD4'},
                {label:'Carbs',val:totalCarbs,goal:carbsGoal,unit:'g',color:'var(--color-nutrition)'},
                {label:'Fat',val:totalFat,goal:fatGoal,unit:'g',color:'var(--color-activity)'},
              ].map(item => {
                const pct = Math.min(Math.round((item.val / item.goal) * 100), 100);
                return (
                  <div key={item.label} className="goal-bar-row">
                    <div className="goal-bar-meta">
                      <span className="goal-bar-name">{item.label}</span>
                      <span className="goal-bar-nums">{item.val} / {item.goal}{item.unit}</span>
                      <span className="goal-bar-pct" style={{color:item.color}}>{pct}%</span>
                    </div>
                    <div className="goal-bar-track">
                      <div className="goal-bar-fill" style={{width:`${pct}%`,background:item.color}}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── LOG WEIGHT ── */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div className="analytics-card-title">⚖️ Log Weight</div>
              </div>
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
                        className="weight-delete-btn"
                        onMouseOver={e=>e.currentTarget.style.color='var(--color-danger)'}
                        onMouseOut={e=>e.currentTarget.style.color='var(--color-border)'}>🗑️</button>
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
              <p className="tab-sub-label">{unlockedCount} of {achievements.length} unlocked</p>
              <div className="achievements-progress-bar">
                <div className="achievements-progress-fill" style={{width:`${(unlockedCount/achievements.length)*100}%`}}/>
              </div>
              <div className="tab-micro-label" style={{textAlign:'right'}}>{Math.round((unlockedCount/achievements.length)*100)}% complete</div>
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

        {/* BODY FAT */}
        {activeTab === 'bodyfat' && (
          <div className="tab-content">
            <div className="log-card">
              <h3 className="log-title">📏 Body Fat Calculator</h3>
              <p className="log-sub">Uses the U.S. Navy method — just a tape measure, no photos needed or stored.</p>
              <div className="profile-grid">
                <div className="profile-field"><label>Waist (inches)</label>
                  <input type="number" className="profile-input" placeholder="e.g. 34"
                    value={waistInches} onChange={e => setWaistInches(e.target.value)}/></div>
                <div className="profile-field"><label>Neck (inches)</label>
                  <input type="number" className="profile-input" placeholder="e.g. 15"
                    value={neckInches} onChange={e => setNeckInches(e.target.value)}/></div>
                {profile.sex === 'female' && (
                  <div className="profile-field"><label>Hip (inches)</label>
                    <input type="number" className="profile-input" placeholder="e.g. 38"
                      value={hipInches} onChange={e => setHipInches(e.target.value)}/></div>
                )}
              </div>
              <button className="profile-save-btn" onClick={logBodyFat}>Calculate & Log</button>
            </div>

            {bodyFatLogs.length > 0 && (
              <div className="progress-card">
                <h3>Latest Reading</h3>
                <div style={{textAlign:'center',padding:'12px 0'}}>
                  <div className="bf-reading-val">{bodyFatLogs[0].bodyFatPercent}%</div>
                  <div className="bf-reading-cat">
                    {getBodyFatCategory(bodyFatLogs[0].bodyFatPercent, profile.sex)}
                  </div>
                </div>
              </div>
            )}

            <div className="progress-card">
              <h3>History</h3>
              {bodyFatLogs.length === 0 ? (
                <div className="empty-state"><span>📏</span><p>No body fat readings yet</p></div>
              ) : (
                <div className="weight-list">
                  {bodyFatLogs.map(b => (
                    <div key={b.id} className="weight-item">
                      <span className="weight-date">{new Date(b.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                      <span className="weight-val">{b.bodyFatPercent}%</span>
                      <button onClick={() => deleteBodyFat(b.id)} className="delete-btn">🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI COACH */}
        {activeTab === 'coach' && (
          <div className="tab-content">

            {/* ── COACH HERO ── */}
            <div className="coach-hero">
              <div className="coach-hero-left">
                <div className="coach-avatar">🤖</div>
                <div>
                  <div className="coach-hero-title">AI Health Coach</div>
                  <div className="coach-hero-sub">Powered by Gemini AI</div>
                </div>
              </div>
              <div className="coach-hero-score">
                <div className="coach-score-num">{healthScore}</div>
                <div className="coach-score-label">Health Score</div>
              </div>
            </div>

            {/* ── INSIGHT CHIPS ── */}
            <div className="coach-insights">
              <div className={`coach-insight-chip ${caloriePercent >= 90 && caloriePercent <= 110 ? 'chip-green' : caloriePercent > 110 ? 'chip-orange' : 'chip-purple'}`}>
                {caloriePercent >= 90 && caloriePercent <= 110 ? '✅' : caloriePercent > 110 ? '⚠️' : '📊'}
                <span>{Math.round(caloriePercent)}% of calorie goal</span>
              </div>
              <div className={`coach-insight-chip ${totalProtein >= proteinGoal ? 'chip-green' : 'chip-purple'}`}>
                {totalProtein >= proteinGoal ? '💪' : '🥩'}
                <span>{totalProtein}g / {proteinGoal}g protein</span>
              </div>
              {streak > 0 && (
                <div className="coach-insight-chip chip-orange">
                  🔥<span>{streak} day streak</span>
                </div>
              )}
            </div>

            {/* ── CONTEXT GRID ── */}
            <div className="coach-context">
              <div className="coach-context-item">
                <span className="coach-ctx-icon">🎯</span>
                <div className="coach-ctx-body">
                  <div className="coach-ctx-label">Goal</div>
                  <div className="coach-ctx-val">{profile.goal === 'lose' ? 'Lose Weight' : profile.goal === 'gain' ? 'Gain Muscle' : 'Maintain'}</div>
                </div>
              </div>
              <div className="coach-context-item">
                <span className="coach-ctx-icon">🔥</span>
                <div className="coach-ctx-body">
                  <div className="coach-ctx-label">Calories</div>
                  <div className="coach-ctx-val">{totalCalories} / {dailyGoal}</div>
                </div>
              </div>
              <div className="coach-context-item">
                <span className="coach-ctx-icon">💪</span>
                <div className="coach-ctx-body">
                  <div className="coach-ctx-label">Protein</div>
                  <div className="coach-ctx-val">{totalProtein}g / {proteinGoal}g</div>
                </div>
              </div>
              <div className="coach-context-item">
                <span className="coach-ctx-icon">🏃</span>
                <div className="coach-ctx-body">
                  <div className="coach-ctx-label">Burned</div>
                  <div className="coach-ctx-val">{totalBurned} cal</div>
                </div>
              </div>
            </div>

            {/* ── CHAT PANEL ── */}
            <div className="coach-chat-panel">
              <div className="chat-messages" id="chatMessages">
                {chatHistory.length === 0 && (
                  <div className="chat-welcome">
                    <div className="chat-welcome-avatar">🤖</div>
                    <div className="chat-welcome-title">Hi {profile?.firstName || currentUser}! I'm your AI Coach</div>
                    <div className="chat-welcome-sub">Ask me anything about your nutrition, fitness, or health journey. I have full context of your today's stats.</div>
                    <div className="quick-prompts">
                      {[
                        `Am I on track for my ${profile.goal === 'lose' ? 'weight loss' : profile.goal === 'gain' ? 'muscle gain' : 'maintenance'} goal today?`,
                        totalCalories < dailyGoal * 0.5 ? 'What should I eat to hit my calorie goal?' : 'How can I balance my remaining macros?',
                        totalProtein < proteinGoal ? `I'm ${proteinGoal - totalProtein}g short on protein — what should I eat?` : 'What high-protein snacks would you recommend?',
                        streak > 2 ? `I have a ${streak}-day streak — how do I keep it going?` : 'How do I build a consistent healthy habit?',
                        'Give me a quick workout for today',
                        "What's a healthy meal I can make tonight?",
                      ].map((p, i) => (
                        <button key={i} className="quick-prompt-btn" onClick={() => { setAiMessage(p); setTimeout(askAiCoach, 50); }}>{p}</button>
                      ))}
                    </div>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`chat-msg ${msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}>
                    {msg.role === 'ai' && <div className="chat-ai-avatar">🤖</div>}
                    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                      {msg.text.split('\n').map((line, li) => (
                        <span key={li}>
                          {line.split(/(\*\*[^*]+\*\*)/).map((part, pi) =>
                            part.startsWith('**') && part.endsWith('**')
                              ? <strong key={pi}>{part.slice(2,-2)}</strong>
                              : part
                          )}
                          {li < msg.text.split('\n').length - 1 && <br/>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="chat-msg chat-msg-ai">
                    <div className="chat-ai-avatar">🤖</div>
                    <div className="chat-bubble chat-bubble-ai">
                      <span className="chat-typing"><span/><span/><span/></span>
                    </div>
                  </div>
                )}
              </div>

              {chatHistory.length > 0 && (
                <div className="coach-suggestion-chips">
                  {['Tell me more', 'What should I eat next?', 'Give me a workout'].map((s,i) => (
                    <button key={i} className="suggestion-chip" onClick={() => { setAiMessage(s); setTimeout(askAiCoach, 50); }}>{s}</button>
                  ))}
                </div>
              )}

              <div className="chat-input-row">
                <input className="chat-input" placeholder="Ask your AI coach anything..."
                  value={aiMessage} onChange={e => setAiMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !aiLoading && askAiCoach()}/>
                <button className="chat-send-btn" onClick={askAiCoach} disabled={aiLoading || !aiMessage.trim()}>
                  {aiLoading ? <span className="chat-spinner"/> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
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
              <div className="profile-field-full" style={{marginTop:'8px'}}>
  <label>Meal Reminders</label>
  <div className="notif-settings-card">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div>
        <div className="notif-settings-title">Push Notifications</div>
        <div className="tab-micro-label">Breakfast 8AM · Lunch 12PM · Dinner 6PM</div>
      </div>
      <button
        onClick={async () => {
          if ('Notification' in window) {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              new Notification('✅ LifeOS Reminders On!', {
                body: "You'll get meal reminders at 8AM, 12PM and 6PM.",
                icon: '/favicon.ico'
              });
            }
          }
        }}
        className="notif-enable-btn">
        {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? '✅ Enabled' : 'Enable'}
      </button>
    </div>
  </div>
</div>
              <button className="profile-save-btn" onClick={saveProfile}>{profileSaved ? '✅ Saved!' : 'Save Profile'}</button>
            </div>
          </div>
        )}

        {/* SLEEP TRACKER */}
        {activeTab === 'sleep' && (
          <div className="tab-content">
            <div className="log-card">
              <h3 className="log-title">😴 Sleep Tracker</h3>
              <p className="log-sub">Track your sleep quality and patterns for better recovery</p>
              <div className="profile-grid">
                <div className="profile-field"><label>Hours Slept *</label>
                  <input type="number" step="0.5" className="profile-input" placeholder="e.g. 7.5"
                    value={sleepHours} onChange={e=>setSleepHours(e.target.value)}/></div>
                <div className="profile-field"><label>Bedtime</label>
                  <input type="time" className="profile-input"
                    value={sleepBedtime} onChange={e=>setSleepBedtime(e.target.value)}/></div>
                <div className="profile-field"><label>Wake Time</label>
                  <input type="time" className="profile-input"
                    value={sleepWakeTime} onChange={e=>setSleepWakeTime(e.target.value)}/></div>
              </div>
              <div className="profile-field-full" style={{marginTop:'8px'}}><label>Sleep Quality</label>
                <div className="profile-options" style={{flexWrap:'wrap'}}>
                  {[{val:'poor',label:'😣 Poor'},{val:'fair',label:'😐 Fair'},{val:'good',label:'😊 Good'},{val:'great',label:'😴 Great'},{val:'excellent',label:'⭐ Excellent'}].map(q=>(
                    <button key={q.val} className={`profile-option ${sleepQuality===q.val?'profile-option-active':''}`}
                      onClick={()=>setSleepQuality(q.val)}>{q.label}</button>
                  ))}
                </div>
              </div>
              <div className="profile-field-full" style={{marginTop:'8px'}}><label>Notes (optional)</label>
                <input className="search-input" placeholder="Anything that affected your sleep?"
                  value={sleepNotes} onChange={e=>setSleepNotes(e.target.value)}/></div>
              {sleepMsg && <div className="log-message">{sleepMsg}</div>}
              <button className="profile-save-btn" onClick={logSleep}>Log Sleep</button>
            </div>
            {sleepLogs.length > 0 && (
              <div className="progress-card">
                <h3>😴 Sleep History</h3>
                <div className="stat-tile-row">
                  <div className="stat-tile stat-tile-purple">
                    <div className="stat-tile-val">{(sleepLogs.slice(0,7).reduce((s,l)=>s+l.hoursSlept,0)/Math.min(sleepLogs.length,7)).toFixed(1)}</div>
                    <div className="stat-tile-label">Avg Hours</div>
                  </div>
                  <div className="stat-tile stat-tile-green">
                    <div className="stat-tile-val">{sleepLogs.length}</div>
                    <div className="stat-tile-label">Days Logged</div>
                  </div>
                  <div className="stat-tile stat-tile-orange">
                    <div className="stat-tile-val">{sleepLogs[0]?.hoursSlept}h</div>
                    <div className="stat-tile-label">Last Night</div>
                  </div>
                </div>
                <div className="weight-list">
                  {sleepLogs.slice(0,10).map(s => (
                    <div key={s.id} className="weight-item">
                      <div>
                        <div style={{fontSize:'13px',fontWeight:'600'}}>{s.hoursSlept}h · {s.quality}</div>
                        <div className="tab-micro-label">
                          {new Date(s.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                          {s.bedtime && ` · ${s.bedtime}–${s.wakeTime}`}
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <span className={`sleep-badge ${s.hoursSlept>=7?'sleep-badge-good':'sleep-badge-short'}`}>
                          {s.hoursSlept>=7?'✅ Good':'⚠️ Short'}
                        </span>
                        <button onClick={()=>deleteSleep(s.id)} className="delete-btn">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MOOD TRACKER */}
        {activeTab === 'mood' && (
          <div className="tab-content">
            <div className="log-card">
              <h3 className="log-title">😊 Mood Tracker</h3>
              <p className="log-sub">Track your emotional wellbeing alongside your physical health</p>
              <div style={{marginBottom:'16px'}}>
                <label className="mood-slider-label">How are you feeling today? ({moodScore}/10)</label>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'28px'}}>{['','😭','😢','😟','😕','😐','🙂','😊','😄','🤩','🥳'][moodScore]}</span>
                  <input type="range" min="1" max="10" value={moodScore}
                    onChange={e=>setMoodScore(parseInt(e.target.value))}
                    style={{flex:1,accentColor:'var(--color-primary)',height:'6px',cursor:'pointer'}}/>
                  <span style={{fontSize:'16px',fontWeight:'700',color:'var(--color-primary)',minWidth:'20px'}}>{moodScore}</span>
                </div>
              </div>
              <div className="profile-field-full"><label>Energy Level</label>
                <div className="profile-options">
                  {[{val:'low',label:'🪫 Low'},{val:'medium',label:'⚡ Medium'},{val:'high',label:'🔋 High'},{val:'very_high',label:'🚀 Very High'}].map(e=>(
                    <button key={e.val} className={`profile-option ${moodEnergy===e.val?'profile-option-active':''}`}
                      onClick={()=>setMoodEnergy(e.val)}>{e.label}</button>
                  ))}
                </div>
              </div>
              <div className="profile-field-full" style={{marginTop:'8px'}}><label>Stress Level</label>
                <div className="profile-options">
                  {[{val:'low',label:'😌 Low'},{val:'moderate',label:'😤 Moderate'},{val:'high',label:'😰 High'},{val:'very_high',label:'🤯 Very High'}].map(s=>(
                    <button key={s.val} className={`profile-option ${moodStress===s.val?'profile-option-active':''}`}
                      onClick={()=>setMoodStress(s.val)}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div className="profile-field-full" style={{marginTop:'8px'}}><label>Notes (optional)</label>
                <input className="search-input" placeholder="What's on your mind?"
                  value={moodNotes} onChange={e=>setMoodNotes(e.target.value)}/></div>
              {moodMsg && <div className="log-message">{moodMsg}</div>}
              <button className="profile-save-btn" onClick={logMood}>Log Mood</button>
            </div>
            {moodLogs.length > 0 && (
              <div className="progress-card">
                <h3>📈 Mood History</h3>
                <div className="stat-tile-row">
                  <div className="stat-tile stat-tile-purple">
                    <div className="stat-tile-val">{(moodLogs.slice(0,7).reduce((s,m)=>s+m.moodScore,0)/Math.min(moodLogs.length,7)).toFixed(1)}</div>
                    <div className="stat-tile-label">Avg Mood</div>
                  </div>
                  <div className="stat-tile stat-tile-green">
                    <div className="stat-tile-val" style={{fontSize:'28px'}}>{['','😭','😢','😟','😕','😐','🙂','😊','😄','🤩','🥳'][moodLogs[0]?.moodScore||5]}</div>
                    <div className="stat-tile-label">Latest</div>
                  </div>
                  <div className="stat-tile stat-tile-orange">
                    <div className="stat-tile-val">{moodLogs.length}</div>
                    <div className="stat-tile-label">Days Logged</div>
                  </div>
                </div>
                <div className="weight-list">
                  {moodLogs.slice(0,10).map(m => (
                    <div key={m.id} className="weight-item">
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{fontSize:'20px'}}>{['','😭','😢','😟','😕','😐','🙂','😊','😄','🤩','🥳'][m.moodScore]}</span>
                          <span style={{fontSize:'13px',fontWeight:'600'}}>{m.moodLabel} ({m.moodScore}/10)</span>
                        </div>
                        <div className="tab-micro-label">
                          {new Date(m.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · Energy: {m.energyLevel} · Stress: {m.stressLevel}
                        </div>
                        {m.notes && <div className="tab-micro-label" style={{fontStyle:'italic'}}>"{m.notes}"</div>}
                      </div>
                      <button onClick={()=>deleteMood(m.id)} className="delete-btn">🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUPPLEMENT TRACKER */}
        {activeTab === 'supplements' && (
          <div className="tab-content">
            <div className="log-card">
              <h3 className="log-title">💊 Supplement Tracker</h3>
              <p className="log-sub">Track your vitamins, minerals and supplements</p>
              <div className="profile-grid">
                <div className="profile-field" style={{gridColumn:'1/-1'}}><label>Supplement Name *</label>
                  <input className="profile-input" placeholder="e.g. Vitamin D, Creatine, Whey Protein..."
                    value={suppName} onChange={e=>setSuppName(e.target.value)}/></div>
                <div className="profile-field"><label>Dosage</label>
                  <input type="number" className="profile-input" placeholder="e.g. 500"
                    value={suppDosage} onChange={e=>setSuppDosage(e.target.value)}/></div>
                <div className="profile-field"><label>Unit</label>
                  <select className="profile-input" value={suppUnit} onChange={e=>setSuppUnit(e.target.value)}>
                    {['mg','g','mcg','IU','ml','oz','serving','capsule','tablet','scoop'].map(u=>(
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="profile-field-full" style={{marginTop:'8px'}}><label>Time of Day</label>
                <div className="profile-options">
                  {[{val:'morning',label:'🌅 Morning'},{val:'pre_workout',label:'🏋️ Pre-Workout'},{val:'post_workout',label:'💪 Post-Workout'},{val:'evening',label:'🌙 Evening'},{val:'with_meal',label:'🍽️ With Meal'}].map(t=>(
                    <button key={t.val} className={`profile-option ${suppTime===t.val?'profile-option-active':''}`}
                      onClick={()=>setSuppTime(t.val)}>{t.label}</button>
                  ))}
                </div>
              </div>
              {suppMsg && <div className="log-message">{suppMsg}</div>}
              <button className="profile-save-btn" onClick={logSupplement}>Log Supplement</button>
            </div>
            {supplementLogs.length > 0 && (
              <div className="progress-card">
                <h3>💊 Today's Supplements</h3>
                <p className="tab-sub-label">
                  {supplementLogs.filter(s=>s.date===new Date().toISOString().split('T')[0]).length} taken today
                </p>
                <div className="weight-list">
                  {supplementLogs.slice(0,20).map(s => (
                    <div key={s.id} className="weight-item">
                      <div>
                        <div style={{fontSize:'13px',fontWeight:'600'}}>{s.supplementName}</div>
                        <div className="tab-micro-label">
                          {s.dosage}{s.unit} · {s.timeOfDay?.replace('_',' ')} · {new Date(s.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <span className="supp-logged-pill">
                          ✓ Logged
                        </span>
                        <button onClick={()=>deleteSupplement(s.id)}
                          className="delete-btn">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {supplementLogs.length === 0 && (
              <div className="progress-card">
                <div className="empty-state"><span>💊</span><p>No supplements logged yet</p></div>
              </div>
            )}
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
          {id:'bodyfat',icon:'📏',label:'Body Fat'},
          {id:'coach',icon:'🤖',label:'Coach'},
          {id:'sleep',icon:'😴',label:'Sleep'},
          {id:'mood',icon:'😊',label:'Mood'},
          {id:'supplements',icon:'💊',label:'Supplements'},
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
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
export default App;