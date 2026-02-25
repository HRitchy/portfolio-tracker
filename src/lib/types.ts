export interface AssetConfig {
  symbol: string;
  name: string;
  assetClass: string;

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

export type AssetKey = 'mwre' | 'btc' | 'glda' | 'vix' | 'eurusd';

export type Advice = 'Achat' | 'Vente' | 'Conservation';

export interface AssetAdvice {
  key: AssetKey;
  advice: Advice;
  score: number;
  reasons: string[];
}

export type Store = Partial<Record<AssetKey, ProcessedAsset | null>>;

export interface YahooQuote {
  close: (number | null)[];
}

export interface YahooResult {
  timestamp: number[];
  indicators: {
    quote: YahooQuote[];
  };
}
