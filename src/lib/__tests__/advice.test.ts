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

/* ── scoreAsset – MA50 calibration (Bug fix: maDistMult must apply to section G) ── */

describe('scoreAsset – MA50 calibration for crypto vs equities', () => {
  const neutralMkt = buildMarketContext({}, null, null);

  it('does NOT trigger MA50 signal for crypto at -15% (below equities threshold, above crypto threshold)', () => {
    // -15% below MA50 → +2 for equities, but crypto threshold is -30% → no signal
    const metrics = {
      drawdown: null, rsi14: null, rsi7: null, rsi28: null,
      distFromMA200Pct: null, distFromMA50Pct: -15,
      bollingerPctB: null, perf30d: null, perf90d: null, volatility30d: null,
    };
    const { score: equitiesScore } = scoreAsset(metrics, neutralMkt, 'Actions');
    const { score: cryptoScore } = scoreAsset(metrics, neutralMkt, 'Crypto');
    expect(equitiesScore).toBeGreaterThan(0);   // equities: -15% below MA50 triggers +2
    expect(cryptoScore).toBe(0);                // crypto: -15% is inside normal range, no signal
  });

  it('triggers MA50 signal for crypto only at deeper discount (-35%)', () => {
    // -35% below MA50: below equities threshold (-15%) and crypto threshold (-30%)
    const metrics = {
      drawdown: null, rsi14: null, rsi7: null, rsi28: null,
      distFromMA200Pct: null, distFromMA50Pct: -35,
      bollingerPctB: null, perf30d: null, perf90d: null, volatility30d: null,
    };
    const { score: equitiesScore } = scoreAsset(metrics, neutralMkt, 'Actions');
    const { score: cryptoScore } = scoreAsset(metrics, neutralMkt, 'Crypto');
    expect(equitiesScore).toBeGreaterThan(0);
    expect(cryptoScore).toBeGreaterThan(0);
  });

  it('does NOT suppress crypto score above MA50 at +15% (below crypto overbought threshold of +30%)', () => {
    // +15% above MA50 → -1 for equities, but crypto threshold is +30% → no signal
    const metrics = {
      drawdown: null, rsi14: null, rsi7: null, rsi28: null,
      distFromMA200Pct: null, distFromMA50Pct: 15,
      bollingerPctB: null, perf30d: null, perf90d: null, volatility30d: null,
    };
    const { score: equitiesScore } = scoreAsset(metrics, neutralMkt, 'Actions');
    const { score: cryptoScore } = scoreAsset(metrics, neutralMkt, 'Crypto');
    expect(equitiesScore).toBeLessThan(0);  // equities: +15% above MA50 → -1
    expect(cryptoScore).toBe(0);            // crypto: +15% is normal, no signal
  });
});

/* ── scoreAsset – MA cross calibration (Bug fix: maDistMult must apply to section J) ── */

describe('scoreAsset – Golden/Death cross calibration for crypto vs equities', () => {
  const neutralMkt = buildMarketContext({}, null, null);

  // A 7% MA50/MA200 gap triggers a STRONG golden cross (+2) for equities but only a MILD one (+1) for crypto.
  // Before the fix both classes got +2; now crypto requires a larger gap (>12%) for the strong signal.
  it('downgrades a 7% golden cross from strong (+2) to mild (+1) for crypto', () => {
    // MA50 is ~7% above MA200:
    // price = 100, MA200 = 100, MA50 ≈ 107.5 → distFromMA50 ≈ -6.98%
    // ratio = (1 - 0.0698) / 1 ≈ 0.9302
    // Equities: gcStrong = 1 - 0.06*1 = 0.94  → 0.9302 < 0.94 → +2 (strong)
    // Crypto:   gcStrong = 1 - 0.06*2 = 0.88  → 0.9302 > 0.88 → not strong
    //           gcMild   = 1 - 0.02*2 = 0.96  → 0.9302 < 0.96 → +1 (mild)
    const metrics = {
      drawdown: null, rsi14: null, rsi7: null, rsi28: null,
      distFromMA200Pct: 0, distFromMA50Pct: -6.98,
      bollingerPctB: null, perf30d: null, perf90d: null, volatility30d: null,
    };
    const { score: equitiesScore } = scoreAsset(metrics, neutralMkt, 'Actions');
    const { score: cryptoScore } = scoreAsset(metrics, neutralMkt, 'Crypto');
    expect(equitiesScore).toBe(2);  // equities: strong golden cross
    expect(cryptoScore).toBe(1);    // crypto: only mild golden cross — properly downgraded
  });

  it('counts 14% golden cross as significant for both equities and crypto', () => {
    // MA50 is ~14.9% above MA200: ratio ≈ 0.87, below both thresholds (0.94 equity, 0.88 crypto)
    // price = 100, MA200 = 100, MA50 ≈ 114.9 → distFromMA50 ≈ -12.97%
    const metrics = {
      drawdown: null, rsi14: null, rsi7: null, rsi28: null,
      distFromMA200Pct: 0, distFromMA50Pct: -12.97,
      bollingerPctB: null, perf30d: null, perf90d: null, volatility30d: null,
    };
    const { score: equitiesScore } = scoreAsset(metrics, neutralMkt, 'Actions');
    const { score: cryptoScore } = scoreAsset(metrics, neutralMkt, 'Crypto');
    expect(equitiesScore).toBeGreaterThan(0);
    expect(cryptoScore).toBeGreaterThan(0);
  });
});
