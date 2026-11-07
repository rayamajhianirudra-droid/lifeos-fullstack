import { describe, it, expect } from 'vitest';
import { weightIn, fmtWeight, fmtHeight, ftInFromInches, toInches, defaultUnits, kgToLb, cmToIn } from './units';

describe('units', () => {
  it('shows weight in kg or lbs', () => {
    expect(weightIn(132.3, 'metric')).toBe(60);
    expect(weightIn(132.3, 'imperial')).toBe(132.3);
    expect(fmtWeight(176.4, 'metric')).toBe('80 kg');
    expect(fmtWeight(null, 'metric')).toBe('—');
  });
  it('round-trips a typed kg value through the stored pounds', () => {
    const stored = Math.round(kgToLb(72.5) * 10) / 10;   // what the server keeps
    expect(weightIn(stored, 'metric')).toBe(72.5);
  });
  it('converts height both ways', () => {
    expect(fmtHeight(5, 10, 'metric')).toBe('178 cm');
    expect(fmtHeight(5, 10, 'imperial')).toBe('5\'10"');
    expect(ftInFromInches(cmToIn(160))).toEqual({ heightFeet: 5, heightInches: 3 });
    expect(ftInFromInches(cmToIn(183))).toEqual({ heightFeet: 6, heightInches: 0 });
  });
  it('converts tape measurements to inches for the server', () => {
    expect(toInches(86.36, 'metric')).toBeCloseTo(34, 5);
    expect(toInches(34, 'imperial')).toBe(34);
  });
  it('guesses units from the browser language', () => {
    expect(defaultUnits(['en-US'])).toBe('imperial');
    expect(defaultUnits(['en-GB'])).toBe('metric');
    expect(defaultUnits(['ne-NP'])).toBe('metric');
    expect(defaultUnits(['ja'])).toBe('metric');
    expect(defaultUnits(['en'])).toBe('imperial');
    expect(defaultUnits(['es-419'])).toBe('metric');
  });
});
