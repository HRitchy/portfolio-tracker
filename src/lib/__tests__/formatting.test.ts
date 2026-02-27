import { describe, it, expect } from 'vitest';
import { fmtPct } from '../formatting';

describe('fmtPct', () => {
  it('returns "--" for null', () => {
    expect(fmtPct(null)).toBe('--');
  });

  it('returns "--" for undefined', () => {
    expect(fmtPct(undefined)).toBe('--');
  });

  it('shows "+" prefix for positive values', () => {
    expect(fmtPct(5.123)).toBe('+5.12%');
  });

  it('shows no prefix for negative values (minus is inherent)', () => {
    expect(fmtPct(-3.456)).toBe('-3.46%');
  });

  it('shows "0.00%" without sign for exact zero', () => {
    expect(fmtPct(0)).toBe('0.00%');
  });

  it('shows "0.00%" without "+" for small positive near zero', () => {
    expect(fmtPct(0.003)).toBe('0.00%');
  });

  it('shows "0.00%" without "-" for small negative near zero', () => {
    expect(fmtPct(-0.003)).toBe('0.00%');
  });

  it('rounds correctly at the boundary', () => {
    expect(fmtPct(0.005)).toBe('+0.01%');
  });

  it('formats large values correctly', () => {
    expect(fmtPct(123.456)).toBe('+123.46%');
  });
});
