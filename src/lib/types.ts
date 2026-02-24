export interface AssetConfig {
  symbol: string;
  name: string;
  alloc: number;
  color: string;
  colorBg: string;
  hasRSI: boolean;
  hasMM: boolean;
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
}

export type AssetKey = 'mwre' | 'btc' | 'glda' | 'xeon' | 'vix' | 'eurusd';

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
