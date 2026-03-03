export interface AssetConfig {
  symbol: string;
  name: string;
  assetClass: string;
  type: 'portfolio' | 'indicator';

  color: string;
  colorBg: string;
  hasRSI: boolean;
  hasMM: boolean;
  hasMM200?: boolean;
  hasDrawdown: boolean;
  hasBollinger: boolean;
}

export interface SeriesPoint {
  ts: number;
  date: string;
  dateObj: Date;
  close: number;
  variation: number | null;
}

export interface ProcessedAsset {
  series: SeriesPoint[];
  key: string;
  mm50?: (number | null)[];
  mm200?: (number | null)[];
  rsi7?: (number | null)[];
  rsi14?: (number | null)[];
  rsi28?: (number | null)[];
  drawdown?: (number | null)[];
  bollingerUpper?: (number | null)[];
  bollingerMiddle?: (number | null)[];
  bollingerLower?: (number | null)[];
}

export type AssetKey = string;

export type Advice = 'Renforcer' | 'Alléger' | 'Conserver';
export type Conviction = 'Faible' | 'Moyenne' | 'Forte' | 'Très forte';
export type MarketRegime = 'Capitulation' | 'Peur' | 'Neutre' | 'Euphorie' | 'Exubérance';

export interface MarketContext {
  fearGreed: number | null;
  vixLevel: number | null;
  vixMA50: number | null;
  hySpread: number | null;
  regime: MarketRegime;
  regimeScore: number;
  regimeReasons: string[];
}

export interface AssetMetrics {
  drawdown: number | null;
  rsi14: number | null;
  rsi7: number | null;
  rsi28: number | null;
  distFromMA200Pct: number | null;
  distFromMA50Pct: number | null;
  bollingerPctB: number | null;
  perf30d: number | null;
  perf90d: number | null;
  volatility30d: number | null;
}

export interface AssetAdvice {
  key: AssetKey;
  advice: Advice;
  score: number;
  conviction: Conviction;
  reasons: string[];
  metrics: AssetMetrics;
}

export type Store = Record<string, ProcessedAsset | null>;

export interface YahooQuote {
  close: (number | null)[];
}

export interface YahooResult {
  timestamp: number[];
  indicators: {
    quote: YahooQuote[];
  };
}
