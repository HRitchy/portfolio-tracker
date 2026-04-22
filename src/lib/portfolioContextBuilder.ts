import type { Store, AssetAdvice, MarketContext } from '@/lib/types';
import type { AssetConfig } from '@/lib/types';

export function buildPortfolioContext(
  store: Store,
  assets: Record<string, AssetConfig>,
  portfolioKeys: string[],
  advices: AssetAdvice[],
  marketContext: MarketContext,
): string {
  const lines: string[] = [];

  lines.push('### Régime de marché');
  lines.push(`- Régime actuel: **${marketContext.regime}** (${marketContext.regimeConfirmed ? 'confirmé 2/3' : 'non confirmé'}, score: ${marketContext.regimeScore > 0 ? '+' : ''}${marketContext.regimeScore}/10)`);
  if (marketContext.fearGreed !== null) lines.push(`- Fear & Greed Index: ${Math.round(marketContext.fearGreed)}/100`);
  if (marketContext.vixLevel !== null) lines.push(`- VIX: ${marketContext.vixLevel.toFixed(2)} (MA50: ${marketContext.vixMA50?.toFixed(2) ?? 'N/A'})`);
  if (marketContext.hySpread !== null) lines.push(`- HY Spread: ${marketContext.hySpread.toFixed(2)}%`);
  if (marketContext.regimeReasons.length > 0) {
    lines.push(`- Signaux: ${marketContext.regimeReasons.join(' | ')}`);
  }

  lines.push('');
  lines.push('### Actifs du portefeuille');

  for (const key of portfolioKeys) {
    const asset = assets[key];
    const data = store[key];
    if (!asset || !data) continue;

    const lastPoint = data.series[data.series.length - 1];
    const advice = advices.find((a) => a.key === key);
    const m = advice?.metrics;

    lines.push(`\n**${asset.name}** (${asset.assetClass} — ${asset.symbol})`);
    if (lastPoint) {
      lines.push(`- Prix actuel: ${lastPoint.close.toFixed(2)}`);
      if (lastPoint.variation !== null) lines.push(`- Variation journalière: ${lastPoint.variation > 0 ? '+' : ''}${lastPoint.variation.toFixed(2)}%`);
    }
    if (advice) {
      lines.push(`- Recommandation algo: **${advice.advice}** | Conviction: ${advice.conviction} | Score: ${advice.score > 0 ? '+' : ''}${advice.score}/16`);
    }
    if (m) {
      if (m.drawdown !== null) lines.push(`- Drawdown depuis sommet: ${m.drawdown.toFixed(1)}%`);
      if (m.rsi7 !== null && m.rsi14 !== null && m.rsi28 !== null) {
        lines.push(`- RSI: 7j=${m.rsi7.toFixed(1)} | 14j=${m.rsi14.toFixed(1)} | 28j=${m.rsi28.toFixed(1)}`);
      }
      if (m.distFromMA50Pct !== null && m.distFromMA200Pct !== null) {
        lines.push(`- Distance MM50: ${m.distFromMA50Pct > 0 ? '+' : ''}${m.distFromMA50Pct.toFixed(1)}% | Distance MM200: ${m.distFromMA200Pct > 0 ? '+' : ''}${m.distFromMA200Pct.toFixed(1)}%`);
      }
      if (m.trendMA50vs200) {
        lines.push(`- Signal MA: ${m.trendMA50vs200 === 'golden_cross' ? 'Golden Cross (haussier)' : 'Death Cross (baissier)'}`);
      }
      if (m.bollingerPctB !== null) lines.push(`- Bollinger %B: ${m.bollingerPctB.toFixed(0)}% (0=bande inf, 100=bande sup)`);
      if (m.perf30d !== null) lines.push(`- Perf 30j: ${m.perf30d > 0 ? '+' : ''}${m.perf30d.toFixed(2)}%`);
      if (m.perf90d !== null) lines.push(`- Perf 90j: ${m.perf90d > 0 ? '+' : ''}${m.perf90d.toFixed(2)}%`);
      if (m.volatility30d !== null) lines.push(`- Volatilité 30j annualisée: ${m.volatility30d}%`);
      if (m.rsiDivergence) {
        lines.push(`- Divergence RSI: ${m.rsiDivergence === 'bullish' ? 'Haussière (signal achat)' : 'Baissière (signal vente)'}`);
      }
      if (advice?.reasons.length) lines.push(`- Signaux algo: ${advice.reasons.join(' | ')}`);
    }
  }

  return lines.join('\n');
}
