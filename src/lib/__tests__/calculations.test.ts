import { describe, it, expect } from 'vitest';
import { calcSMA, calcRSI, calcDrawdown, calcBollinger, extractCleanSeries } from '../calculations';
import type { SeriesPoint } from '../types';

function makeSeries(closes: number[]): SeriesPoint[] {
  return closes.map((close, i) => ({
    ts: 1700000000 + i * 86400,
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    dateObj: new Date((1700000000 + i * 86400) * 1000),
    close,
    variation: null,
  }));
}

describe('calcSMA', () => {
  it('returns null for indices before window is filled', () => {
    const sma = calcSMA(makeSeries([1, 2, 3, 4, 5]), 3);
    expect(sma[0]).toBeNull();
    expect(sma[1]).toBeNull();
  });

  it('calculates correct 3-period SMA', () => {
    const sma = calcSMA(makeSeries([1, 2, 3, 4, 5]), 3);
    expect(sma[2]).toBeCloseTo(2.0);
    expect(sma[3]).toBeCloseTo(3.0);
    expect(sma[4]).toBeCloseTo(4.0);
  });

  it('handles window equal to series length', () => {
    const sma = calcSMA(makeSeries([10, 20, 30]), 3);
    expect(sma[0]).toBeNull();
    expect(sma[1]).toBeNull();
    expect(sma[2]).toBeCloseTo(20.0);
  });
});

describe('calcDrawdown', () => {
  it('returns 0 at the first peak', () => {
    const dd = calcDrawdown(makeSeries([100, 110, 120, 110]));
    expect(dd[2]).toBeCloseTo(0);
  });

  it('calculates correct drawdown percentage', () => {
    const dd = calcDrawdown(makeSeries([100, 120, 80]));
    // peak = 120, current = 80 → (80-120)/120 * 100 = -33.33%
    expect(dd[2]).toBeCloseTo(-33.33, 1);
  });

  it('never returns positive values', () => {
    const dd = calcDrawdown(makeSeries([50, 100, 80, 95, 110]));
    dd.forEach((v) => {
      if (v !== null) expect(v).toBeLessThanOrEqual(0);
    });
  });

  it('returns 0 when price reaches a new all-time high', () => {
    const dd = calcDrawdown(makeSeries([100, 90, 110]));
    expect(dd[2]).toBeCloseTo(0);
  });
});

describe('calcRSI', () => {
  it('returns all null when series is too short', () => {
    const rsi = calcRSI(makeSeries([10, 11, 12]), 14);
    expect(rsi.every((v) => v === null)).toBe(true);
  });

  it('returns 100 when there are only gains', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
    const rsi = calcRSI(makeSeries(prices), 14);
    const lastRsi = rsi.filter((v) => v !== null).pop();
    expect(lastRsi).toBe(100);
  });

  it('returns values between 0 and 100', () => {
    const prices = [100,102,98,105,103,101,107,104,99,108,106,103,110,108,112,105,113,111,109,115];
    const rsi = calcRSI(makeSeries(prices), 14);
    rsi.filter((v) => v !== null).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  it('first non-null value is at index equal to period', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + (i % 3 === 0 ? -2 : 1));
    const rsi = calcRSI(makeSeries(prices), 14);
    expect(rsi[14]).not.toBeNull();
    expect(rsi[13]).toBeNull();
  });
});

describe('calcBollinger', () => {
  it('returns null for indices before window is filled', () => {
    const series = makeSeries(Array.from({ length: 25 }, (_, i) => 100 + i));
    const { upper, middle, lower } = calcBollinger(series, 20);
    expect(upper[0]).toBeNull();
    expect(middle[18]).toBeNull();
    expect(lower[19]).not.toBeNull();
  });

  it('upper > middle > lower for a volatile series', () => {
    const prices = [100,105,95,110,90,108,92,112,88,115,85,118,82,120,80,115,95,105,100,102];
    const { upper, middle, lower } = calcBollinger(makeSeries(prices), 20);
    const last = prices.length - 1;
    expect(upper[last]).toBeGreaterThan(middle[last]!);
    expect(middle[last]).toBeGreaterThan(lower[last]!);
  });

  it('bands are symmetric around the middle', () => {
    const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i) * 10);
    const { upper, middle, lower } = calcBollinger(makeSeries(prices), 20);
    const last = prices.length - 1;
    const upperDiff = upper[last]! - middle[last]!;
    const lowerDiff = middle[last]! - lower[last]!;
    expect(upperDiff).toBeCloseTo(lowerDiff, 4);
  });
});

describe('extractCleanSeries', () => {
  it('filters out null close values', () => {
    const result = {
      timestamp: [1, 2, 3, 4],
      indicators: { quote: [{ close: [null, null, 50.5, 60.0] }] },
    };
    // @ts-expect-error — partial data for test
    const series = extractCleanSeries(result);
    expect(series).toHaveLength(2);
    expect(series[0].close).toBe(50.5);
    expect(series[1].close).toBe(60.0);
  });

  it('filters out zero close values', () => {
    const result = {
      timestamp: [1, 2, 3],
      indicators: { quote: [{ close: [0, 100, 200] }] },
    };
    // @ts-expect-error — partial data for test
    const series = extractCleanSeries(result);
    expect(series).toHaveLength(2);
  });

  it('returns empty array for empty timestamps', () => {
    const result = { timestamp: [], indicators: { quote: [{ close: [] }] } };
    // @ts-expect-error — partial data for test
    const series = extractCleanSeries(result);
    expect(series).toHaveLength(0);
  });

  it('preserves timestamps correctly', () => {
    const result = {
      timestamp: [1700000000, 1700086400],
      indicators: { quote: [{ close: [42.5, 43.0] }] },
    };
    // @ts-expect-error — partial data for test
    const series = extractCleanSeries(result);
    expect(series[0].ts).toBe(1700000000);
    expect(series[1].ts).toBe(1700086400);
  });
});
