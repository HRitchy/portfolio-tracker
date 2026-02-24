import { AssetConfig, AssetKey } from './types';

export const ASSETS: Record<AssetKey, AssetConfig> = {
  mwre:   { symbol: 'MWRE.DE', name: 'MSCI World',      color: 'rgb(99,102,241)',  colorBg: 'rgba(99,102,241,0.1)',  hasRSI: true,  hasMM: true  },
  btc:    { symbol: 'BTC-EUR', name: 'Bitcoin',          color: 'rgb(247,147,26)',  colorBg: 'rgba(247,147,26,0.1)',  hasRSI: true,  hasMM: true  },
  glda:   { symbol: 'GLDA.DE', name: 'Or (GLDA)',        color: 'rgb(234,179,8)',   colorBg: 'rgba(234,179,8,0.1)',   hasRSI: true,  hasMM: true  },

  vix:    { symbol: '^VIX',    name: 'VIX',              color: 'rgb(239,68,68)',   colorBg: 'rgba(239,68,68,0.1)',   hasRSI: false, hasMM: false },
  eurusd: { symbol: 'EUR=X',   name: 'USD/EUR',          color: 'rgb(59,130,246)',  colorBg: 'rgba(59,130,246,0.1)',  hasRSI: false, hasMM: false },
};

export const TIMEZONE = 'Indian/Reunion';

export const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export const ASSET_KEYS: AssetKey[] = ['mwre', 'btc', 'glda', 'vix', 'eurusd'];
export const PORTFOLIO_KEYS: AssetKey[] = ['mwre', 'btc', 'glda'];
export const INDICATOR_KEYS: AssetKey[] = ['vix', 'eurusd'];
export const RSI_KEYS: AssetKey[] = ['mwre', 'btc', 'glda'];
