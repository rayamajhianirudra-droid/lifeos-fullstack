import { describe, it, expect } from 'vitest';
import { dateLocale } from './dates';

describe('dateLocale', () => {
  it('keeps English words but uses the regional date order', () => {
    expect(dateLocale(['en-US'])).toBe('en-US');
    expect(dateLocale(['en-GB'])).toBe('en-GB');
    expect(new Date(2026, 10, 8, 12).toLocaleDateString(dateLocale(['ne-NP']), { month: 'short', day: 'numeric' })).toBe('8 Nov');
    expect(dateLocale(['de-DE'])).toBe('en-DE');
    expect(dateLocale(['ja'])).toBe('en-GB');
    expect(dateLocale(['en'])).toBe('en-US');
    expect(dateLocale(['en-AS'])).toMatch(/^en-(AS|GB)$/);
  });
  it('formats day-first outside the US', () => {
    const d = new Date(2026, 10, 8, 12);
    expect(d.toLocaleDateString(dateLocale(['en-GB']), { month: 'short', day: 'numeric' })).toBe('8 Nov');
    expect(d.toLocaleDateString(dateLocale(['en-US']), { month: 'short', day: 'numeric' })).toBe('Nov 8');
  });
});
