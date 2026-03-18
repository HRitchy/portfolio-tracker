import { describe, it, expect } from 'vitest';
import { buildPortfolioContext } from '../portfolioContextBuilder';
import type { Store, AssetAdvice, MarketContext } from '../types';
import type { AssetConfig } from '../types';

const baseMarketContext: MarketContext = {
  regime: 'Neutre',
  regimeScore: 0,
  fearGreed: null,
  vixLevel: null,
  vixMA50: null,
  hySpread: null,
  regimeReasons: [],
};

describe('buildPortfolioContext', () => {
  it('includes regime section', () => {
    const result = buildPortfolioContext({}, {}, [], [], baseMarketContext);
    expect(result).toContain('### Régime de marché');
    expect(result).toContain('Neutre');
  });

  it('includes fear & greed when present', () => {
    const ctx = { ...baseMarketContext, fearGreed: 72 };
    const result = buildPortfolioContext({}, {}, [], [], ctx);
    expect(result).toContain('Fear & Greed Index: 72/100');
  });

  it('omits fear & greed when null', () => {
    const result = buildPortfolioContext({}, {}, [], [], baseMarketContext);
    expect(result).not.toContain('Fear & Greed');
  });

  it('includes VIX and HY Spread when present', () => {
    const ctx = { ...baseMarketContext, vixLevel: 25.5, vixMA50: 20.0, hySpread: 3.75 };
    const result = buildPortfolioContext({}, {}, [], [], ctx);
    expect(result).toContain('VIX: 25.50');
    expect(result).toContain('HY Spread: 3.75%');
  });

  it('includes regime reasons when present', () => {
    const ctx = { ...baseMarketContext, regimeReasons: ['RSI survendu', 'Drawdown -30%'] };
    const result = buildPortfolioContext({}, {}, [], [], ctx);
    expect(result).toContain('RSI survendu');
    expect(result).toContain('Drawdown -30%');
  });

  it('includes portfolio asset section header', () => {
    const result = buildPortfolioContext({}, {}, [], [], baseMarketContext);
    expect(result).toContain('### Actifs du portefeuille');
  });

  it('includes asset name and symbol when data available', () => {
    const store: Store = {
      btc: {
        series: [{ ts: 1700000000, dateObj: new Date(), close: 45000, variation: 2.5 }],
      } as Store[string],
    };
    const assets: Record<string, AssetConfig> = {
      btc: { name: 'Bitcoin', symbol: 'BTC-USD', assetClass: 'Crypto', type: 'portfolio', color: '#f7931a', colorBg: '', hasRSI: true, hasMM: true, hasDrawdown: true, hasBollinger: true },
    };
    const result = buildPortfolioContext(store, assets, ['btc'], [], baseMarketContext);
    expect(result).toContain('Bitcoin');
    expect(result).toContain('BTC-USD');
    expect(result).toContain('45000.00');
    expect(result).toContain('+2.50%');
  });

  it('includes advice recommendation when provided', () => {
    const store: Store = {
      btc: {
        series: [{ ts: 1700000000, dateObj: new Date(), close: 30000, variation: null }],
      } as Store[string],
    };
    const assets: Record<string, AssetConfig> = {
      btc: { name: 'Bitcoin', symbol: 'BTC-USD', assetClass: 'Crypto', type: 'portfolio', color: '#f7931a', colorBg: '', hasRSI: true, hasMM: true, hasDrawdown: true, hasBollinger: true },
    };
    const advices: AssetAdvice[] = [{
      key: 'btc',
      advice: 'Renforcer',
      conviction: 'Forte',
      score: 8,
      reasons: ['RSI survendu', 'Death Cross'],
      metrics: { drawdown: null, rsi14: null, rsi7: null, rsi28: null, distFromMA200Pct: null, distFromMA50Pct: null, bollingerPctB: null, perf30d: null, perf90d: null, volatility30d: null, trendMA50vs200: null, rsiDivergence: null },
    }];
    const result = buildPortfolioContext(store, assets, ['btc'], advices, baseMarketContext);
    expect(result).toContain('Renforcer');
    expect(result).toContain('Forte');
    expect(result).toContain('+8/16');
    // reasons appear when metrics object is present (even with all-null values)
    expect(result).toContain('RSI survendu');
  });

  it('skips asset with missing store data', () => {
    const assets: Record<string, AssetConfig> = {
      eth: { name: 'Ethereum', symbol: 'ETH-USD', assetClass: 'Crypto', type: 'portfolio', color: '#627eea', colorBg: '', hasRSI: true, hasMM: true, hasDrawdown: true, hasBollinger: true },
    };
    const result = buildPortfolioContext({}, assets, ['eth'], [], baseMarketContext);
    expect(result).not.toContain('Ethereum');
  });
});
