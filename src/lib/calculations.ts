import { AssetKey, ProcessedAsset, SeriesPoint, YahooResult } from './types';
import { ASSETS } from './config';
import { tsToDate } from './formatting';

export function extractCleanSeries(result: YahooResult): SeriesPoint[] {
  const ts = result.timestamp || [];
  const cl = result.indicators?.quote?.[0]?.close || [];
  const out: SeriesPoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = Number(cl[i]);
    if (Number.isFinite(c) && c !== 0) {
      out.push({
        ts: ts[i],
        date: tsToDate(ts[i]),
        dateObj: new Date(ts[i] * 1000),
        close: c,
        variation: null,
      });
    }
  }
  return out;
}

export function calcVariation(series: SeriesPoint[]): SeriesPoint[] {
  for (let i = 0; i < series.length; i++) {
    if (i === 0) {
      series[i].variation = null;
      continue;
    }
    const prev = series[i - 1].close;
    series[i].variation = prev > 0 ? ((series[i].close - prev) / prev) * 100 : null;
  }
  return series;
}

export function calcSMA(series: SeriesPoint[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(series.length).fill(null);
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i].close;
    if (i >= window) sum -= series[i - window].close;
    if (i >= window - 1) out[i] = +(sum / window).toFixed(6);
  }
  return out;
}

export function calcRSI(series: SeriesPoint[], period: number): (number | null)[] {
  const prices = series.map((s) => s.close);
  const L = prices.length;
  const out: (number | null)[] = new Array(L).fill(null);
  if (L <= period) return out;

  let sumGain = 0;
  let sumLoss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = prices[i] - prices[i - 1];
    if (ch >= 0) sumGain += ch;
    else sumLoss += -ch;
  }
  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;
  out[period] = avgLoss === 0 ? 100 : +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(2);

  for (let i = period + 1; i < L; i++) {
    const ch = prices[i] - prices[i - 1];
    let g = 0;
    let l = 0;
    if (ch >= 0) g = ch;
    else l = -ch;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(2);
  }
  return out;
}

/**
 * Calculates drawdown from peak for each point in the series.
 * Returns an array of negative percentages (0 = at peak, -X% = X% below peak).
 */
export function calcDrawdown(series: SeriesPoint[]): (number | null)[] {
  const out: (number | null)[] = new Array(series.length).fill(null);
  let peak = -Infinity;
  for (let i = 0; i < series.length; i++) {
    const c = series[i].close;
    if (c > peak) peak = c;
    out[i] = +((c - peak) / peak * 100).toFixed(2);
  }
  return out;
}

/**
 * Calculates Bollinger Bands (middle = SMA, upper/lower = SMA +/- k*stddev).
 * Default: 20-period SMA with 2 standard deviations.
 */
export function calcBollinger(series: SeriesPoint[], window = 20, k = 2): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const L = series.length;
  const upper: (number | null)[] = new Array(L).fill(null);
  const middle: (number | null)[] = new Array(L).fill(null);
  const lower: (number | null)[] = new Array(L).fill(null);

  for (let i = window - 1; i < L; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += series[j].close;
    }
    const mean = sum / window;

    let sqSum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      const diff = series[j].close - mean;
      sqSum += diff * diff;
    }
    const stddev = Math.sqrt(sqSum / window);

    middle[i] = +mean.toFixed(6);
    upper[i] = +(mean + k * stddev).toFixed(6);
    lower[i] = +(mean - k * stddev).toFixed(6);
  }
  return { upper, middle, lower };
}

export function processAsset(key: AssetKey, result: YahooResult): ProcessedAsset | null {
  const series = extractCleanSeries(result);
  if (series.length === 0) return null;
  calcVariation(series);

  const cfg = ASSETS[key];
  const data: ProcessedAsset = { series, key };

  if (cfg.hasMM) {
    data.mm50 = calcSMA(series, 50);
    if (cfg.hasMM200 !== false) {
      data.mm200 = calcSMA(series, 200);
    }
  }
  if (cfg.hasRSI) {
    data.rsi7 = calcRSI(series, 7);
    data.rsi14 = calcRSI(series, 14);
    data.rsi28 = calcRSI(series, 28);
  }
  if (cfg.hasDrawdown) {
    data.drawdown = calcDrawdown(series);
  }
  if (cfg.hasBollinger) {
    const bb = calcBollinger(series, 20, 2);
    data.bollingerUpper = bb.upper;
    data.bollingerMiddle = bb.middle;
    data.bollingerLower = bb.lower;
  }
  return data;
}
