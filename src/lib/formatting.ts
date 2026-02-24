import { DATE_FMT } from './config';
import { AssetKey } from './types';

export function tsToDate(ts: number): string {
  return DATE_FMT.format(new Date(ts * 1000));
}

export function fmtPrice(v: number | null | undefined, digits = 2): string {
  if (v == null) return '--';
  return v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null) return '--';
  const sign = v >= 0 ? '+' : '';
  return sign + v.toFixed(2) + '%';
}

export function chgClass(v: number | null | undefined): 'up' | 'down' | 'neutral' {
  if (v == null) return 'neutral';
  return v >= 0 ? 'up' : 'down';
}

export function getDigitsForKey(key: AssetKey): number {
  if (key === 'btc') return 0;
  if (key === 'eurusd') return 4;
  return 2;
}
