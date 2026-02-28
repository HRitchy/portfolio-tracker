import { DATE_FMT } from './config';
import { AssetConfig } from './types';

export function tsToDate(ts: number): string {
  return DATE_FMT.format(new Date(ts * 1000));
}

export function fmtPrice(v: number | null | undefined, digits = 2): string {
  if (v == null) return '--';
  return v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null) return '--';
  const rounded = Math.round(v * 100) / 100;
  const sign = rounded > 0 ? '+' : '';
  return sign + rounded.toFixed(2) + '%';
}

export function chgClass(v: number | null | undefined): 'up' | 'down' | 'neutral' {
  if (v == null) return 'neutral';
  return v >= 0 ? 'up' : 'down';
}

export function getDigitsForAsset(config: AssetConfig | undefined): number {
  if (!config) return 2;
  const cls = config.assetClass.toLowerCase();
  if (cls === 'crypto') return 0;
  if (cls === 'devises') return 4;
  return 2;
}
