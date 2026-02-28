import { AssetConfig } from './types';

export const DEFAULT_ASSETS: Record<string, AssetConfig> = {
  mwre:   { symbol: 'MWRE.DE', name: 'MSCI World',      assetClass: 'Actions',    type: 'portfolio',  color: 'rgb(99,102,241)',  colorBg: 'rgba(99,102,241,0.1)',  hasRSI: true,  hasMM: true,  hasDrawdown: true,  hasBollinger: true  },
  btc:    { symbol: 'BTC-EUR', name: 'Bitcoin',          assetClass: 'Crypto',     type: 'portfolio',  color: 'rgb(247,147,26)',  colorBg: 'rgba(247,147,26,0.1)',  hasRSI: true,  hasMM: true,  hasDrawdown: true,  hasBollinger: true  },
  glda:   { symbol: 'GLDA.DE', name: 'Or (GLDA)',        assetClass: 'Métaux',     type: 'portfolio',  color: 'rgb(234,179,8)',   colorBg: 'rgba(234,179,8,0.1)',   hasRSI: true,  hasMM: true,  hasDrawdown: true,  hasBollinger: true  },

  vix:    { symbol: '^VIX',    name: 'VIX',              assetClass: 'Volatilité', type: 'indicator',  color: 'rgb(239,68,68)',   colorBg: 'rgba(239,68,68,0.1)',   hasRSI: false, hasMM: true, hasMM200: false, hasDrawdown: false, hasBollinger: false },
  eurusd: { symbol: 'EUR=X',   name: 'USD/EUR',          assetClass: 'Devises',    type: 'indicator',  color: 'rgb(59,130,246)',  colorBg: 'rgba(59,130,246,0.1)',  hasRSI: false, hasMM: false, hasDrawdown: false, hasBollinger: false },
};

export const COLOR_PALETTE = [
  { color: 'rgb(16,185,129)',  colorBg: 'rgba(16,185,129,0.1)' },
  { color: 'rgb(168,85,247)',  colorBg: 'rgba(168,85,247,0.1)' },
  { color: 'rgb(236,72,153)',  colorBg: 'rgba(236,72,153,0.1)' },
  { color: 'rgb(14,165,233)',  colorBg: 'rgba(14,165,233,0.1)' },
  { color: 'rgb(245,158,11)',  colorBg: 'rgba(245,158,11,0.1)' },
  { color: 'rgb(34,197,94)',   colorBg: 'rgba(34,197,94,0.1)' },
  { color: 'rgb(244,63,94)',   colorBg: 'rgba(244,63,94,0.1)' },
  { color: 'rgb(99,102,241)',  colorBg: 'rgba(99,102,241,0.1)' },
];

export const TIMEZONE = 'Indian/Reunion';

export const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
