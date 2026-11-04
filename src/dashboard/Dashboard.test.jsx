import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from './Dashboard';

vi.mock('recharts', async () => {
  const Original = await vi.importActual('recharts');
  return { ...Original, ResponsiveContainer: ({ children }) => <div style={{ width: 600, height: 200 }}>{children}</div> };
});

const day = (date, calories) => ({ date, day: date.slice(5), calories, protein: calories ? 60 : null, carbs: calories ? 150 : null, fat: calories ? 40 : null });
const base = {
  calories: 662, calorieGoal: 2065, protein: 53, carbs: 70, fat: 20, proteinGoal: 120, carbsGoal: 252, fatGoal: 64,
  burned: 180, burnGoal: 500, water: 4, waterGoal: 8, sleepHours: 6.5, sleepGoal: 8,
  score: 44, scoreLabel: 'Fair', scoreTitle: '',
  focus: [
    { key: 'meals', label: 'Log 3 meals', done: false, tab: 'log' },
    { key: 'water', label: 'Drink 8 glasses', done: false, tab: null },
    { key: 'move', label: 'Move your body', done: true, tab: 'exercise' },
  ],
  history: [day('2026-10-28', 1800), day('2026-10-29', null), day('2026-10-30', 2100)],
  weightLogs: [{ weightLbs: 150, date: '2026-11-03' }, { weightLbs: 152.8, date: '2026-10-20' }],
  bodyFatLogs: [{ bodyFatPercent: 14.2, date: '2026-11-03' }, { bodyFatPercent: 15.3, date: '2026-10-24' }],
  weight: 150, bodyFat: 14.2, bmi: '22.8', bmiLabel: 'Normal', bmiTone: { color: '#1D9E75', bg: '#EDFAF5' },
  foodLogs: [
    { id: 1, foodName: 'Greek Yogurt Bowl', calories: 320, protein: 18, carbs: 42, fat: 8, mealType: 'breakfast' },
    { id: 2, foodName: 'Chicken Salad', calories: 342, protein: 35, carbs: 28, fat: 12, mealType: 'lunch' },
  ],
  isToday: true, dateLabel: 'Today', dateShort: 'Tue, Nov 3',
  coachText: 'Consider adding more protein.', coachPrompts: ['What should I eat next?'], aiLoading: false,
  badges: [{ id: 'first_food', icon: '🌱', title: 'First Step', unlocked: true, color: '#1D9E75' }, { id: 'streak_7', icon: '⭐', title: 'Week Warrior', unlocked: false, progress: 0.43, color: '#5B4FD4' }],
};
const actions = () => ({ tab: vi.fn(), addWater: vi.fn(), askCoach: vi.fn() });

describe('Dashboard', () => {
  test('hero, score and calorie tip come from the data', () => {
    render(<Dashboard d={base} on={actions()} />);
    expect(screen.getByText(/brighter days/)).toBeInTheDocument();
    expect(screen.getByText('44')).toBeInTheDocument();
    expect(screen.getByText(/32% through your calorie goal/)).toBeInTheDocument();
  });

  test('empty day asks for the first meal instead of showing 0%', () => {
    render(<Dashboard d={{ ...base, calories: 0, foodLogs: [] }} on={actions()} />);
    expect(screen.getByText(/Log your first meal/)).toBeInTheDocument();
    expect(screen.getAllByText(/Not logged yet/).length).toBeGreaterThan(0);
  });

  test('meals timeline shows logged foods with macros', () => {
    render(<Dashboard d={base} on={actions()} />);
    expect(screen.getByText('Greek Yogurt Bowl')).toBeInTheDocument();
    expect(screen.getByText('320 kcal')).toBeInTheDocument();
    expect(screen.getByText('P 35g')).toBeInTheDocument();
  });

  test('body metric deltas compare oldest and newest entries', () => {
    render(<Dashboard d={base} on={actions()} />);
    expect(screen.getByText('↓ 2.8 lbs')).toBeInTheDocument();
    expect(screen.getByText('↓ 1.1%')).toBeInTheDocument();
  });

  test('locked achievements show progress', () => {
    render(<Dashboard d={base} on={actions()} />);
    expect(screen.getByText('43%')).toBeInTheDocument();
  });

  test('actions call back: hydration adds water, quick action and coach prompt', () => {
    const on = actions();
    render(<Dashboard d={base} on={on} />);
    fireEvent.click(screen.getByRole('button', { name: /Hydration 4 of 8 glasses/ }));
    expect(on.addWater).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Log Exercise' }));
    expect(on.tab).toHaveBeenCalledWith('exercise');
    fireEvent.click(screen.getByRole('button', { name: /What should I eat next/ }));
    expect(on.askCoach).toHaveBeenCalledWith('What should I eat next?');
  });

  test('macro range tabs switch to averages', () => {
    render(<Dashboard d={base} on={actions()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'This Week' }));
    expect(screen.getByText(/Daily average over days you logged food/)).toBeInTheDocument();
    expect(screen.getByText('60g')).toBeInTheDocument();   // protein average of logged days
  });
});
