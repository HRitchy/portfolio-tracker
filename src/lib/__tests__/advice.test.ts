import { describe, it, expect } from 'vitest';
import { extractMetrics, scoreAsset, buildMarketContext } from '../advice';
import type { Store, AssetConfig, SeriesPoint, ProcessedAsset } from '../types';
import { DEFAULT_ASSETS } from '../config';

/* ── Helpers ── */

function makeSeriesWithDates(
  closes: number[],
  options: { startDate: Date; dailySpacingMs: number },
): SeriesPoint[] {
  return closes.map((close, i) => {
    const dateObj = new Date(options.startDate.getTime() + i * options.dailySpacingMs);
    return {
      ts: Math.floor(dateObj.getTime() / 1000),
      date: dateObj.toISOString().slice(0, 10),
      dateObj,
      close,
      variation: i === 0 ? null : ((close - closes[i - 1]) / closes[i - 1]) * 100,
    };
  });
}

function makeStore(key: string, series: SeriesPoint[]): Store {
  const asset: ProcessedAsset = { series, key };
  return { [key]: asset };
}

/* ── extractMetrics – BUG 1: perf30d uses calendar days ── */

describe('extractMetrics – perf30d uses calendar days', () => {
  it('computes perf30d based on calendar days, not index count', () => {
    // 60 data points spaced 2 calendar days apart (simulates weekday-only gaps)
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
    const series = makeSeriesWithDates(closes, {
      startDate: new Date('2024-01-01T00:00:00Z'),
      dailySpacingMs: 2 * 86_400_000,
    });
    const store = makeStore('mwre', series);
    const metrics = extractMetrics(store, 'mwre', DEFAULT_ASSETS['mwre']);

    expect(metrics.perf30d).not.toBeNull();

    // Last point: index 59, close = 129.5, date = 2024-01-01 + 118 days = 2024-04-28
    // 30 calendar-day cutoff → 2024-03-29 → ~index 44, close = 122.0
    // Expected perf ≈ (129.5 - 122) / 122 * 100 ≈ 6.15%
    // Under the OLD buggy code (idx - 30 = index 29, close = 114.5):
    // buggy perf ≈ (129.5 - 114.5) / 114.5 * 100 ≈ 13.1%
    expect(metrics.perf30d!).toBeLessThan(10);
  });

  it('uses earliest available point when series is shorter than 30 calendar days', () => {
    // 5 points covering 4 calendar days — cutoff falls before the series start,
    // so calcPerfFromCalendarDays uses the first available point as reference.
    const closes = [100, 101, 102, 103, 104];
    const series = makeSeriesWithDates(closes, {
      startDate: new Date('2024-01-01T00:00:00Z'),
      dailySpacingMs: 86_400_000,
    });
    const store = makeStore('mwre', series);
    const metrics = extractMetrics(store, 'mwre', DEFAULT_ASSETS['mwre']);
    // (104 - 100) / 100 * 100 = 4%
    expect(metrics.perf30d).toBeCloseTo(4.0, 1);
  });
});

/* ── extractMetrics – BUG 2: volatility annualization factor ── */

describe('extractMetrics – volatility annualization', () => {
  it('uses 365 annualization factor for crypto (btc)', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 50000 + Math.sin(i) * 1000);
    const series = makeSeriesWithDates(closes, {
      startDate: new Date('2024-01-01T00:00:00Z'),
      dailySpacingMs: 86_400_000,
    });
    const store = makeStore('btc', series);
    const metrics = extractMetrics(store, 'btc', DEFAULT_ASSETS['btc']);
    expect(metrics.volatility30d).not.toBeNull();

    // Manually compute expected volatility with factor 365
    const idx = series.length - 1;
    const returns: number[] = [];
    for (let i = idx - 29; i <= idx; i++) {
      returns.push(Math.log(series[i].close / series[i - 1].close));
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
    const expected365 = +(Math.sqrt(variance * 365) * 100).toFixed(1);

    expect(metrics.volatility30d).toBeCloseTo(expected365, 0);
  });

  it('uses 252 annualization factor for equities (mwre)', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i) * 5);
    const series = makeSeriesWithDates(closes, {
      startDate: new Date('2024-01-01T00:00:00Z'),
      dailySpacingMs: 86_400_000,
    });
    const store = makeStore('mwre', series);
    const metrics = extractMetrics(store, 'mwre', DEFAULT_ASSETS['mwre']);
    expect(metrics.volatility30d).not.toBeNull();

    const idx = series.length - 1;
    const returns: number[] = [];
    for (let i = idx - 29; i <= idx; i++) {
      returns.push(Math.log(series[i].close / series[i - 1].close));
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
    const expected252 = +(Math.sqrt(variance * 252) * 100).toFixed(1);

    expect(metrics.volatility30d).toBeCloseTo(expected252, 0);
  });
});

/* ── buildMarketContext ── */

describe('buildMarketContext', () => {
  it('returns Capitulation regime for extreme fear signals', () => {
    const store: Store = {
      vix: {
        series: [{ ts: 0, date: '', dateObj: new Date(), close: 40, variation: null }],
        key: 'vix',
        mm50: [20],
      },
    };
    const ctx = buildMarketContext(store, 10, 8);
    expect(ctx.regime).toBe('Capitulation');
    expect(ctx.regimeScore).toBeGreaterThanOrEqual(6);
  });

  it('returns Exubérance regime for extreme greed signals', () => {
    const store: Store = {
      vix: {
        series: [{ ts: 0, date: '', dateObj: new Date(), close: 10, variation: null }],
        key: 'vix',
        mm50: [12],
      },
    };
    const ctx = buildMarketContext(store, 90, 2);
    expect(ctx.regime).toBe('Exubérance');
    expect(ctx.regimeScore).toBeLessThanOrEqual(-6);
  });

  it('returns Neutre with null inputs', () => {
    const ctx = buildMarketContext({}, null, null);
    expect(ctx.regime).toBe('Neutre');
    expect(ctx.regimeScore).toBe(0);
  });
});

/* ── scoreAsset ── */

describe('scoreAsset', () => {
  it('produces positive score for deeply oversold asset in fearful market', () => {
    const metrics = {
      drawdown: -40, rsi14: 20, rsi7: 22, rsi28: 28,
      distFromMA200Pct: -30, distFromMA50Pct: -20,
      bollingerPctB: -5, perf30d: -25, perf90d: -40,
      volatility30d: 50,
    };
    const mkt = buildMarketContext({}, 15, 7);
    const { score } = scoreAsset(metrics, mkt);
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it('produces negative score for overbought asset in greedy market', () => {
    const metrics = {
      drawdown: -0.5, rsi14: 80, rsi7: 82, rsi28: 72,
      distFromMA200Pct: 35, distFromMA50Pct: 18,
      bollingerPctB: 105, perf30d: 25, perf90d: 50,
      volatility30d: 15,
    };
    const mkt = buildMarketContext({}, 85, 2);
    const { score } = scoreAsset(metrics, mkt);
    expect(score).toBeLessThanOrEqual(-4);
  });

  it('returns non-empty reasons for a non-neutral asset', () => {
    const metrics = {
      drawdown: -10, rsi14: 50, rsi7: 50, rsi28: 50,
      distFromMA200Pct: 0, distFromMA50Pct: 0,
      bollingerPctB: 50, perf30d: 0, perf90d: 0,
      volatility30d: 20,
    };
    const mkt = buildMarketContext({}, 50, 3.5);
    const { reasons } = scoreAsset(metrics, mkt);
    // drawdown at -10 triggers "recul modéré" reason
    expect(reasons.length).toBeGreaterThan(0);
  });
});
