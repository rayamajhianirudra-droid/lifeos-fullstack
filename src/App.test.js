import { render, screen, fireEvent } from '@testing-library/react';
import App, { AdminDashboard, fmtBytes, fmtUptime } from './App';

// recharts' ResponsiveContainer needs a real layout engine; jsdom has none.
jest.mock('recharts', () => {
  const Original = jest.requireActual('recharts');
  return { ...Original, ResponsiveContainer: ({ children }) => <div style={{ width: 600, height: 200 }}>{children}</div> };
});

beforeEach(() => localStorage.clear());

describe('signed out', () => {
  test('shows the sign-in form, not the app', () => {
    render(<App />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  test('switches to sign-up step 1', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/sign up/i));
    expect(screen.getByText('Create account')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 2/)).toBeInTheDocument();
  });
});

describe('admin dashboard', () => {
  const day = (date, count) => ({ date, count });
  const stats = {
    users: { total: 42, newLast7Days: 5, newLast30Days: 12, activeToday: 7, activeLast7Days: 20, activeLast30Days: 30 },
    signupsByDay: [day('2026-11-01', 2), day('2026-11-02', 3)],
    logsByDay: { food_logs: [day('2026-11-01', 10), day('2026-11-02', 4)] },
    logTotals: { food_logs: 900, water_logs: 300 },
    popularFoods: [{ food: 'banana, raw', logs: 25, people: 9 }],
    popularFoodsMinPeople: 3,
    usageSinceRestart: { foodSearches: 50, foodSearchFailures: 1, coachMessages: 8, coachFallbacks: 0 },
    system: { databaseBytes: 450 * 1048576, databaseFreeLimitBytes: 512 * 1048576, heapUsedBytes: 100 * 1048576, heapMaxBytes: 280 * 1048576, uptimeSeconds: 3700, javaVersion: '21' },
  };

  test('shows totals and the privacy note', () => {
    render(<AdminDashboard stats={stats} loading={false} error="" onRefresh={() => {}} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('5 new this week')).toBeInTheDocument();
    expect(screen.getByText(/No names, emails or individual logs/)).toBeInTheDocument();
    expect(screen.getByText('banana, raw')).toBeInTheDocument();
  });

  test('warns when the database is above 80% of the free plan', () => {
    render(<AdminDashboard stats={stats} loading={false} error="" onRefresh={() => {}} />);
    expect(screen.getByText(/above 80% of Neon's free storage/)).toBeInTheDocument();
  });

  test('explains an empty popular-foods list instead of showing nothing', () => {
    render(<AdminDashboard stats={{ ...stats, popularFoods: [] }} loading={false} error="" onRefresh={() => {}} />);
    expect(screen.getByText(/at least 3 different people/)).toBeInTheDocument();
  });

  test('refresh button calls back', () => {
    const onRefresh = jest.fn();
    render(<AdminDashboard stats={stats} loading={false} error="" onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('shows a loading state before data arrives', () => {
    render(<AdminDashboard stats={null} loading error="" onRefresh={() => {}} />);
    expect(screen.getByText(/Loading admin stats/)).toBeInTheDocument();
  });
});

describe('formatting helpers', () => {
  test('fmtBytes', () => {
    expect(fmtBytes(null)).toBe('-');
    expect(fmtBytes(2048)).toBe('2 KB');
    expect(fmtBytes(5 * 1048576)).toBe('5.0 MB');
  });
  test('fmtUptime', () => {
    expect(fmtUptime(120)).toBe('2m');
    expect(fmtUptime(3700)).toBe('1h 1m');
    expect(fmtUptime(90000)).toBe('1d 1h');
  });
});
