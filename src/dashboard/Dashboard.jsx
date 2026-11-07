import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  LineChart, Line,
} from 'recharts';
import Icon from '../components/Icon';
import { weightIn, weightUnit } from '../units';
import FoodThumb from '../components/FoodThumb';
import './Dashboard.css';

// Photos live in public/images/dash/<name>.jpg (Unsplash License). If a file is
// missing the card keeps its designed gradient, so nothing ever shows broken.
const photoUrl = (name) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/images/dash/${name}.jpg`;

export function DashPhoto({ name, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`dash-photo dash-photo-fallback dash-photo-${name} ${className}`} aria-hidden="true" />;
  return (
    <img className={`dash-photo ${className}`} src={photoUrl(name)} alt="" aria-hidden="true"
      loading={name === 'hero' ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
  );
}

const pct = (v, goal) => (goal > 0 ? Math.round((v / goal) * 100) : 0);
const clamp = (n) => Math.max(0, Math.min(n, 100));
const avg = (rows, key) => {
  const vals = rows.map(r => r[key]).filter(v => v != null);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
};
const round1 = (n) => Math.round(n * 10) / 10;

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', photo: 'meal-breakfast' },
  { key: 'lunch', label: 'Lunch', photo: 'meal-lunch' },
  { key: 'dinner', label: 'Dinner', photo: 'meal-dinner' },
  { key: 'snack', label: 'Snack', photo: 'food' },
];

function Sparkline({ data, dataKey, color, height = 34 }) {
  const points = data.filter(d => d[dataKey] != null);
  if (points.length < 2) return <div className="dash-spark-empty" style={{ height }} />;
  return (
    <div className="dash-spark" aria-hidden="true">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={points} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div className="dash-bar" role="presentation">
      <div className="dash-bar-fill" style={{ width: `${clamp(value)}%`, background: color }} />
    </div>
  );
}

function ScoreRing({ score, size = 132, stroke = 11 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="dash-ring">
      <defs>
        <linearGradient id="dashRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B9AEFF" />
          <stop offset="100%" stopColor="#6C5CE7" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#dashRingGrad)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${(clamp(score) / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} className="dash-ring-arc" />
    </svg>
  );
}

function Hexagon({ badge }) {
  const p = badge.unlocked ? 100 : Math.round(clamp((badge.progress || 0) * 100));
  return (
    <div className={`dash-hex ${badge.unlocked ? 'is-unlocked' : 'is-locked'}`} title={badge.desc || badge.title}>
      <div className="dash-hex-shape" style={{ '--hex': badge.unlocked ? badge.color : '#B8B8C8' }}>
        <span aria-hidden="true">{badge.unlocked ? badge.icon : <Icon name="lock" size={18} />}</span>
      </div>
      <div className="dash-hex-title">{badge.title}</div>
      {!badge.unlocked && <div className="dash-hex-pct">{p}%</div>}
      <span className="sr-only">{badge.unlocked ? 'Unlocked' : `${p}% progress`}</span>
    </div>
  );
}

/**
 * The dashboard, matching the LifeOS mockup. Pure presentation: App passes the
 * already-computed numbers in `d` and the actions it can perform in `on`.
 */
export default function Dashboard({ d, on }) {
  const [macroRange, setMacroRange] = useState('today');
  const [chartMetric, setChartMetric] = useState('calories');

  const history = d.history || [];
  const last7 = history.slice(-7);
  const last30 = history.slice(-30);

  const calPct = pct(d.calories, d.calorieGoal);
  const tip = d.calories === 0
    ? 'Log your first meal to start today’s progress.'
    : calPct < 90 ? `You're ${calPct}% through your calorie goal. Keep going, you're doing great!`
      : calPct <= 105 ? `You're at ${calPct}% of your calorie goal. Right on target today!`
        : `You're at ${calPct}% of your calorie goal. A walk helps balance the extra.`;

  const macroSource = macroRange === 'today' ? null : macroRange === 'week' ? last7 : last30;
  const macroVal = (key, today) => (macroSource ? avg(macroSource, key) : today);
  const macros = [
    { key: 'protein', label: 'Protein', icon: 'bolt', val: macroVal('protein', d.protein), goal: d.proteinGoal, color: '#6C5CE7', tint: 'rgba(108,92,231,.12)' },
    { key: 'carbs', label: 'Carbs', icon: 'wheat', val: macroVal('carbs', d.carbs), goal: d.carbsGoal, color: '#1D9E75', tint: 'rgba(29,158,117,.12)' },
    { key: 'fat', label: 'Fat', icon: 'drop', val: macroVal('fat', d.fat), goal: d.fatGoal, color: '#E8820C', tint: 'rgba(232,130,12,.12)' },
  ];
  const sparkRows = macroRange === 'month' ? last30 : last7;

  const weights = [...(d.weightLogs || [])].reverse();           // oldest first
  const fats = [...(d.bodyFatLogs || [])].reverse();
  const delta = (rows, key) => (rows.length >= 2 ? round1(rows[rows.length - 1][key] - rows[0][key]) : null);
  const weightDelta = delta(weights.slice(-10), 'weightLbs');
  const fatDelta = delta(fats.slice(-10), 'bodyFatPercent');

  const metricMeta = {
    calories: { label: 'Calories', goal: d.calorieGoal, unit: 'kcal' },
    protein: { label: 'Protein', goal: d.proteinGoal, unit: 'g' },
    carbs: { label: 'Carbs', goal: d.carbsGoal, unit: 'g' },
    fat: { label: 'Fat', goal: d.fatGoal, unit: 'g' },
  }[chartMetric];
  const weekday = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
  const chartRows = last7.map(r => ({ day: weekday(r.date), value: r[chartMetric] ?? 0, logged: r[chartMetric] != null }));
  // Keep the goal line visible even on days far below or above it.
  const chartMax = Math.ceil(Math.max(metricMeta.goal, ...chartRows.map(r => r.value)) * 1.12);

  const meals = MEALS.map(m => {
    const items = (d.foodLogs || []).filter(f => (f.mealType || 'snack') === m.key);
    const sum = (k) => Math.round(items.reduce((s, f) => s + (f[k] || 0), 0) * 10) / 10;
    const top = [...items].sort((a, b) => (b.calories || 0) - (a.calories || 0))[0];
    return { ...m, items, top, kcal: Math.round(sum('calories')), p: sum('protein'), c: sum('carbs'), f: sum('fat') };
  }).filter(m => m.items.length > 0 || m.key !== 'snack');

  const stats = [
    { key: 'cal', label: 'Calories', icon: 'utensils', color: '#6C5CE7', tint: 'rgba(108,92,231,.12)', photo: 'food',
      value: d.calories.toLocaleString(), goal: `/ ${d.calorieGoal.toLocaleString()}`, p: calPct, go: () => on.tab('log') },
    { key: 'ex', label: 'Exercise', icon: 'run', color: '#1D9E75', tint: 'rgba(29,158,117,.12)', photo: 'sneakers',
      value: d.burned, goal: 'kcal', p: pct(d.burned, d.burnGoal), go: () => on.tab('exercise') },
    { key: 'h2o', label: 'Hydration', icon: 'droplet', color: '#3B82F6', tint: 'rgba(59,130,246,.12)', photo: 'water',
      value: d.water, goal: `/ ${d.waterGoal} glasses`, p: pct(d.water, d.waterGoal), go: () => on.addWater() },
    { key: 'sl', label: 'Sleep', icon: 'moon', color: '#8B5CF6', tint: 'rgba(139,92,246,.12)', photo: 'bedroom',
      value: d.sleepHours ?? '—', goal: `/ ${d.sleepGoal} hrs`, p: pct(d.sleepHours || 0, d.sleepGoal), go: () => on.tab('sleep') },
  ];

  const quick = [
    { label: 'Log Food', icon: 'utensils', color: '#6C5CE7', bg: 'rgba(108,92,231,.10)', go: () => on.tab('log') },
    { label: 'Add Water', icon: 'droplet', color: '#3B82F6', bg: 'rgba(59,130,246,.10)', go: () => on.addWater() },
    { label: 'Log Exercise', icon: 'run', color: '#1D9E75', bg: 'rgba(29,158,117,.10)', go: () => on.tab('exercise') },
    { label: 'Log Sleep', icon: 'moon', color: '#8B5CF6', bg: 'rgba(139,92,246,.10)', go: () => on.tab('sleep') },
    { label: 'Log Mood', icon: 'smile', color: '#E8820C', bg: 'rgba(232,130,12,.12)', go: () => on.tab('mood') },
    { label: 'AI Coach', icon: 'sparkles', color: '#6C5CE7', bg: 'rgba(108,92,231,.10)', go: () => on.tab('coach') },
  ];

  return (
    <div className="tab-content dashx">
      {/* HERO */}
      <section className="dashx-hero" aria-label="Today overview">
        <DashPhoto name="hero" className="dashx-hero-bg" />
        <div className="dashx-hero-shade" aria-hidden="true" />
        <div className="dashx-hero-left">
          <div className="dashx-kicker">Your wellness journey</div>
          <h1 className="dashx-headline">Stronger choices,<br /><span>brighter days.</span></h1>
          <div className="dashx-tip"><Icon name="sparkles" size={16} /><span>{tip}</span></div>
        </div>
        <div className="dashx-glass">
          <div className="dashx-focus">
            <div className="dashx-glass-title">Today&apos;s Focus</div>
            <ul>
              {d.focus.map(f => (
                <li key={f.key}>
                  <button type="button" className={`dashx-focus-item ${f.done ? 'is-done' : ''}`} aria-pressed={f.done}
                    onClick={() => (f.key === 'water' ? on.addWater() : on.tab(f.tab))}>
                    <span className="dashx-check" aria-hidden="true">{f.done && <Icon name="check" size={13} strokeWidth={3} />}</span>
                    <span className="dashx-focus-label">{f.label}</span>
                    <Icon name="chevronRight" size={15} className="dashx-focus-chev" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="dashx-score" title={d.scoreTitle}>
            <div className="dashx-score-ring">
              <ScoreRing score={d.score} />
              <span className="dashx-score-num">{d.score}</span>
            </div>
            <div className="dashx-score-label">Health Score</div>
            <div className="dashx-score-sub">{d.scoreLabel}</div>
          </div>
        </div>
      </section>

      {/* STAT CARDS */}
      <div className="dashx-stats">
        {stats.map(s => (
          <button key={s.key} type="button" className="dashx-stat" onClick={s.go}
            aria-label={s.key === 'h2o' ? `Hydration ${d.water} of ${d.waterGoal} glasses. Add a glass` : `${s.label} details`}>
            <div className="dashx-stat-body">
              <div className="dashx-stat-head">
                <span className="dashx-chip" style={{ color: s.color, background: s.tint }}><Icon name={s.icon} size={18} /></span>
                <span className="dashx-stat-label">{s.label}</span>
              </div>
              <div className="dashx-stat-val">{s.value}<small> {s.goal}</small></div>
              <div className="dashx-stat-bar-row">
                <ProgressBar value={s.p} color={s.color} />
                <span className="dashx-stat-pct" style={{ color: s.color }}>{s.p}%</span>
              </div>
            </div>
            <div className="dashx-stat-photo"><DashPhoto name={s.photo} /></div>
          </button>
        ))}
      </div>

      {/* MACROS + BODY METRICS */}
      <div className="dashx-row dashx-row-macros">
        <section className="dashx-card" aria-label="Macronutrients">
          <div className="dashx-card-head">
            <h3>Macronutrients</h3>
            <div className="dashx-tabs" role="tablist" aria-label="Macro range">
              {[['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']].map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={macroRange === k}
                  className={macroRange === k ? 'is-active' : ''} onClick={() => setMacroRange(k)}>{l}</button>
              ))}
            </div>
          </div>
          {macroSource && <p className="dashx-note">Daily average over days you logged food.</p>}
          <div className="dashx-macros">
            {macros.map(m => (
              <div key={m.key} className="dashx-macro">
                <div className="dashx-macro-top">
                  <span className="dashx-chip dashx-chip-sm" style={{ color: m.color, background: m.tint }}><Icon name={m.icon} size={16} /></span>
                  <div>
                    <div className="dashx-macro-label">{m.label}</div>
                    <div className="dashx-macro-val">{m.val}g<small> / {m.goal}g</small></div>
                  </div>
                  <span className="dashx-macro-pct" style={{ color: m.color }}>{pct(m.val, m.goal)}%</span>
                </div>
                <ProgressBar value={pct(m.val, m.goal)} color={m.color} />
                <Sparkline data={sparkRows} dataKey={m.key} color={m.color} />
              </div>
            ))}
          </div>
        </section>

        <section className="dashx-card" aria-label="Body metrics">
          <div className="dashx-card-head">
            <h3>Body Metrics</h3>
            <button type="button" className="dashx-link" onClick={() => on.tab('progress')}>View Details <Icon name="arrowRight" size={14} /></button>
          </div>
          <div className="dashx-body">
            <div className="dashx-metric">
              <div className="dashx-metric-label">BMI</div>
              <div className="dashx-metric-val">{d.bmi || '—'}</div>
              {d.bmi && <span className="dashx-pill" style={{ color: d.bmiTone.color, background: d.bmiTone.bg }}>{d.bmiLabel}</span>}
              <Sparkline data={weights.slice(-10)} dataKey="weightLbs" color="#1D9E75" />
            </div>
            <button type="button" className="dashx-metric" onClick={() => on.tab('bodyfat')}>
              <div className="dashx-metric-label">Body Fat</div>
              <div className="dashx-metric-val">{d.bodyFat != null ? `${d.bodyFat}%` : '—'}</div>
              {fatDelta != null && <span className={`dashx-delta ${fatDelta <= 0 ? 'is-good' : 'is-up'}`}>{fatDelta <= 0 ? '↓' : '↑'} {Math.abs(fatDelta)}%</span>}
              <Sparkline data={fats.slice(-10)} dataKey="bodyFatPercent" color="#3B82F6" />
            </button>
            <button type="button" className="dashx-metric" onClick={() => on.tab('progress')}>
              <div className="dashx-metric-label">Weight</div>
              <div className="dashx-metric-val">{d.weight != null ? <>{weightIn(d.weight, d.units)}<small> {weightUnit(d.units)}</small></> : '—'}</div>
              {weightDelta != null && <span className="dashx-delta is-neutral">{weightDelta <= 0 ? '↓' : '↑'} {Math.abs(weightIn(weightDelta, d.units))} {weightUnit(d.units)}</span>}
              <Sparkline data={weights.slice(-10)} dataKey="weightLbs" color="#8B5CF6" />
            </button>
          </div>
        </section>
      </div>

      {/* SCHEDULE + CALORIE PROGRESS + AI COACH */}
      <div className="dashx-row dashx-row-three">
        <section className="dashx-card" aria-label="Today's meals">
          <div className="dashx-card-head">
            <h3>{d.isToday ? 'Today' : d.dateLabel}&apos;s Meals</h3>
            <span className="dashx-date-chip">{d.dateShort}</span>
          </div>
          <ol className="dashx-timeline">
            {meals.map(m => (
              <li key={m.key} className={m.items.length ? '' : 'is-empty'}>
                <span className="dashx-tl-dot" aria-hidden="true" />
                <span className="dashx-tl-time">{m.label}</span>
                <div className="dashx-tl-thumb">
                  {m.items.length && d.foodPhotos?.[m.top.foodName]
                    ? <FoodThumb photo={d.foodPhotos[m.top.foodName]} size={46} className="dashx-tl-photo" />
                    : <DashPhoto name={m.photo} />}
                </div>
                <div className="dashx-tl-main">
                  {m.items.length ? (
                    <>
                      <div className="dashx-tl-name">{m.top.foodName}{m.items.length > 1 && <small> +{m.items.length - 1} more</small>}</div>
                      <div className="dashx-tl-kcal-row">
                        <span className="dashx-tl-kcal">{m.kcal} kcal</span>
                        <span className="dashx-tl-macros"><span>P {m.p}g</span><span>C {m.c}g</span><span>F {m.f}g</span></span>
                      </div>
                    </>
                  ) : (
                    <button type="button" className="dashx-tl-add" onClick={() => on.tab('log')}>Not logged yet · Add</button>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="dashx-primary" onClick={() => on.tab('log')}><Icon name="plus" size={16} /> Log Meal</button>
        </section>

        <section className="dashx-card" aria-label="Calorie progress">
          <div className="dashx-card-head">
            <h3>{metricMeta.label} Progress</h3>
            <select className="dashx-select" value={chartMetric} onChange={e => setChartMetric(e.target.value)} aria-label="Metric">
              <option value="calories">Calories</option>
              <option value="protein">Protein</option>
              <option value="carbs">Carbs</option>
              <option value="fat">Fat</option>
            </select>
          </div>
          <div className="dashx-chart">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={chartRows} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B7CF6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#C4BBFF" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-ink-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, chartMax]} tick={{ fontSize: 11, fill: 'var(--color-ink-secondary)' }} axisLine={false} tickLine={false}
                  tickFormatter={v => (v >= 1000 ? `${Math.round(v / 100) / 10}K` : v)} />
                <Tooltip cursor={{ fill: 'rgba(108,92,231,.06)' }}
                  contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-ink)' }}
                  formatter={(v) => [`${v} ${metricMeta.unit}`, metricMeta.label]} />
                <ReferenceLine y={metricMeta.goal} stroke="#6C5CE7" strokeDasharray="6 4" strokeWidth={1.5} />
                <Bar dataKey="value" fill="url(#dashBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="dashx-legend">
            <span><i className="dashx-legend-bar" /> Consumed</span>
            <span><i className="dashx-legend-goal" /> Goal ({metricMeta.goal.toLocaleString()})</span>
          </div>
        </section>

        <section className="dashx-card dashx-coach" aria-label="AI coach insight">
          <div className="dashx-coach-photo"><DashPhoto name="plant" /></div>
          <div className="dashx-card-head">
            <h3>AI Coach Insight</h3>
            <span className="dashx-new">New</span>
          </div>
          <div className="dashx-coach-body">
            <span className="dashx-chip" style={{ color: '#1D9E75', background: 'rgba(29,158,117,.12)' }}><Icon name="sparkles" size={18} /></span>
            <p>{d.coachText}</p>
          </div>
          <button type="button" className="dashx-secondary" onClick={() => on.tab('coach')}>View More Insights <Icon name="arrowRight" size={14} /></button>
          <div className="dashx-prompts">
            {d.coachPrompts.map(p => (
              <button key={p} type="button" onClick={() => on.askCoach(p)} disabled={d.aiLoading}>
                <Icon name="bot" size={14} /> {p}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* QUICK ACTIONS + ACHIEVEMENTS */}
      <div className="dashx-row dashx-row-bottom">
        <section className="dashx-card" aria-label="Quick actions">
          <div className="dashx-card-head"><h3>Quick Actions</h3></div>
          <div className="dashx-quick">
            {quick.map(q => (
              <button key={q.label} type="button" className="dashx-quick-tile" style={{ background: q.bg, color: q.color }} onClick={q.go}>
                <Icon name={q.icon} size={24} />
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="dashx-card" aria-label="Recent achievements">
          <div className="dashx-card-head">
            <h3>Recent Achievements</h3>
            <button type="button" className="dashx-link" onClick={() => on.tab('achievements')}>See All <Icon name="arrowRight" size={14} /></button>
          </div>
          <div className="dashx-hexes">
            {d.badges.slice(0, 5).map(b => <Hexagon key={b.id} badge={b} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
