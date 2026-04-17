import { AssetConfig } from './types';

export const DEFAULT_ASSETS: Record<string, AssetConfig> = {
  mwre:   { symbol: 'MWRE.DE', name: 'MSCI World',      assetClass: 'Actions',    type: 'portfolio',  color: 'rgb(99,102,241)',  colorBg: 'rgba(99,102,241,0.1)',  hasRSI: true,  hasMM: true,  hasDrawdown: true,  hasBollinger: true  },
  btc:    { symbol: 'BTC-EUR', name: 'Bitcoin',          assetClass: 'Crypto',     type: 'portfolio',  color: 'rgb(247,147,26)',  colorBg: 'rgba(247,147,26,0.1)',  hasRSI: true,  hasMM: true,  hasDrawdown: true,  hasBollinger: true  },
  glda:   { symbol: 'GLDA.DE', name: 'Or (GLDA)',        assetClass: 'Métaux',     type: 'portfolio',  color: 'rgb(234,179,8)',   colorBg: 'rgba(234,179,8,0.1)',   hasRSI: true,  hasMM: true,  hasDrawdown: true,  hasBollinger: true  },

  vix:    { symbol: '^VIX',    name: 'VIX',              assetClass: 'Volatilité', type: 'indicator',  color: 'rgb(239,68,68)',   colorBg: 'rgba(239,68,68,0.1)',   hasRSI: false, hasMM: true, hasMM200: false, hasDrawdown: false, hasBollinger: false },
  eurusd: { symbol: 'EUR=X',   name: 'USD/EUR',          assetClass: 'Devises',    type: 'indicator',  color: 'rgb(59,130,246)',  colorBg: 'rgba(59,130,246,0.1)',  hasRSI: false, hasMM: false, hasDrawdown: false, hasBollinger: false },
};

// Assets actually fetched and displayed by the market dashboard.
// The dashboard is focused on three macro indicators (VIX, Fear & Greed, HY Spread).
// Only VIX is sourced from Yahoo; F&G and HY Spread come from dedicated APIs.
export const DISPLAYED_ASSETS: Record<string, AssetConfig> = {
  vix: DEFAULT_ASSETS.vix,
};

export const COLOR_PALETTE = [
  // Verts
  { color: 'rgb(16,185,129)',  colorBg: 'rgba(16,185,129,0.1)' },
  { color: 'rgb(34,197,94)',   colorBg: 'rgba(34,197,94,0.1)' },
  { color: 'rgb(20,184,166)',  colorBg: 'rgba(20,184,166,0.1)' },
  { color: 'rgb(132,204,22)',  colorBg: 'rgba(132,204,22,0.1)' },
  // Bleus
  { color: 'rgb(14,165,233)',  colorBg: 'rgba(14,165,233,0.1)' },
  { color: 'rgb(6,182,212)',   colorBg: 'rgba(6,182,212,0.1)' },
  { color: 'rgb(59,130,246)',  colorBg: 'rgba(59,130,246,0.1)' },
  { color: 'rgb(99,102,241)',  colorBg: 'rgba(99,102,241,0.1)' },
  // Violets & roses
  { color: 'rgb(168,85,247)',  colorBg: 'rgba(168,85,247,0.1)' },
  { color: 'rgb(124,58,237)',  colorBg: 'rgba(124,58,237,0.1)' },
  { color: 'rgb(217,70,239)',  colorBg: 'rgba(217,70,239,0.1)' },
  { color: 'rgb(236,72,153)',  colorBg: 'rgba(236,72,153,0.1)' },
  // Rouges & oranges
  { color: 'rgb(244,63,94)',   colorBg: 'rgba(244,63,94,0.1)' },
  { color: 'rgb(239,68,68)',   colorBg: 'rgba(239,68,68,0.1)' },
  { color: 'rgb(249,115,22)',  colorBg: 'rgba(249,115,22,0.1)' },
  { color: 'rgb(245,158,11)',  colorBg: 'rgba(245,158,11,0.1)' },
  // Jaune & neutres
  { color: 'rgb(234,179,8)',   colorBg: 'rgba(234,179,8,0.1)' },
  { color: 'rgb(163,230,53)',  colorBg: 'rgba(163,230,53,0.1)' },
  { color: 'rgb(100,116,139)', colorBg: 'rgba(100,116,139,0.1)' },
  { color: 'rgb(107,114,128)', colorBg: 'rgba(107,114,128,0.1)' },
];

export const TIMEZONE = 'Indian/Reunion';

export const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
