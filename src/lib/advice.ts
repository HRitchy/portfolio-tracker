import { calcPerfFromCalendarDays, detectRSIDivergence } from './calculations';
import {
  Advice,
  AssetAdvice,
  AssetConfig,
  AssetMetrics,
  Conviction,
  MarketContext,
  MarketRegime,
  Store,
} from './types';

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function last<T>(arr: (T | null)[] | undefined): T | null {
  if (!arr) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return arr[i] as T;
  }
  return null;
}

function pct(a: number, b: number): number {
  return b !== 0 ? ((a - b) / b) * 100 : 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/* ─────────────────────────────────────────────
   1. Market Context  (macro contrarian signals)
   ───────────────────────────────────────────── */

export function buildMarketContext(
  store: Store,
  fearGreed: number | null,
  hySpread: number | null,
): MarketContext {
  const vixData = store.vix;
  const vixLevel = vixData?.series?.length
    ? vixData.series[vixData.series.length - 1].close
    : null;
  const vixMA50 = last(vixData?.mm50);

  let regimeScore = 0;
  const regimeReasons: string[] = [];

  // ── Fear & Greed (contrarian: fear = buy, greed = sell) ──
  if (fearGreed != null) {
    if (fearGreed <= 20) {
      regimeScore += 4;
      regimeReasons.push(`Fear & Greed à ${Math.round(fearGreed)} : peur extrême — forte opportunité contrarienne.`);
    } else if (fearGreed <= 35) {
      regimeScore += 2;
      regimeReasons.push(`Fear & Greed à ${Math.round(fearGreed)} : peur significative — zone d'accumulation.`);
    } else if (fearGreed <= 50) {
      regimeScore += 1;
      regimeReasons.push(`Fear & Greed à ${Math.round(fearGreed)} : sentiment prudent, léger biais acheteur.`);
    } else if (fearGreed <= 65) {
      regimeReasons.push(`Fear & Greed à ${Math.round(fearGreed)} : sentiment neutre/optimiste.`);
    } else if (fearGreed <= 80) {
      regimeScore -= 2;
      regimeReasons.push(`Fear & Greed à ${Math.round(fearGreed)} : avidité — prudence recommandée.`);
    } else {
      regimeScore -= 4;
      regimeReasons.push(`Fear & Greed à ${Math.round(fearGreed)} : avidité extrême — le marché est dangereux.`);
    }
  }

  // ── VIX (contrarian: high VIX = buy, low VIX = complacency) ──
  if (vixLevel != null) {
    if (vixLevel >= 35) {
      regimeScore += 3;
      regimeReasons.push(`VIX à ${vixLevel.toFixed(1)} : panique — historiquement, les meilleurs points d'entrée.`);
    } else if (vixLevel >= 25) {
      regimeScore += 2;
      regimeReasons.push(`VIX à ${vixLevel.toFixed(1)} : stress élevé, opportunité pour les patients.`);
    } else if (vixLevel >= 20) {
      regimeScore += 1;
      regimeReasons.push(`VIX à ${vixLevel.toFixed(1)} : volatilité modérée, vigilance mais pas de panique.`);
    } else if (vixLevel <= 12) {
      regimeScore -= 3;
      regimeReasons.push(`VIX à ${vixLevel.toFixed(1)} : complaisance extrême — risque sous-estimé.`);
    } else if (vixLevel <= 15) {
      regimeScore -= 1;
      regimeReasons.push(`VIX à ${vixLevel.toFixed(1)} : volatilité basse, possible complaisance.`);
    }

    // VIX vs its own MA50 (spike detection)
    if (vixMA50 != null && vixLevel > vixMA50 * 1.3) {
      regimeScore += 1;
      regimeReasons.push('VIX 30%+ au-dessus de sa MM50 : spike de peur = signal acheteur.');
    }
  }

  // ── HY Spread (contrarian: wide spread = credit stress = buy quality) ──
  if (hySpread != null) {
    if (hySpread >= 7) {
      regimeScore += 3;
      regimeReasons.push(`HY Spread à ${hySpread.toFixed(2)}% : stress crédit majeur — achat agressif des actifs qualité.`);
    } else if (hySpread >= 5) {
      regimeScore += 2;
      regimeReasons.push(`HY Spread à ${hySpread.toFixed(2)}% : stress crédit élevé — zone d'opportunité.`);
    } else if (hySpread >= 4) {
      regimeScore += 1;
      regimeReasons.push(`HY Spread à ${hySpread.toFixed(2)}% : vigilance crédit, pas de panique.`);
    } else if (hySpread <= 2.5) {
      regimeScore -= 2;
      regimeReasons.push(`HY Spread à ${hySpread.toFixed(2)}% : spreads très comprimés — euphorie crédit.`);
    } else if (hySpread <= 3) {
      regimeScore -= 1;
      regimeReasons.push(`HY Spread à ${hySpread.toFixed(2)}% : spreads faibles, complaisance possible.`);
    }
  }

  regimeScore = clamp(regimeScore, -10, 10);

  let regime: MarketRegime;
  if (regimeScore >= 6) regime = 'Capitulation';
  else if (regimeScore >= 2) regime = 'Peur';
  else if (regimeScore > -2) regime = 'Neutre';
  else if (regimeScore > -6) regime = 'Euphorie';
  else regime = 'Exubérance';

  return { fearGreed, vixLevel, vixMA50, hySpread, regime, regimeScore, regimeReasons };
}

/* ─────────────────────────────────────────────
   2. Per-asset metrics extraction
   ───────────────────────────────────────────── */

export function extractMetrics(store: Store, key: string, assetConfig?: AssetConfig): AssetMetrics {
  const data = store[key];
  if (!data?.series?.length) {
    return {
      drawdown: null, rsi14: null, rsi7: null, rsi28: null,
      distFromMA200Pct: null, distFromMA50Pct: null,
      bollingerPctB: null, perf30d: null, perf90d: null, volatility30d: null,
      trendMA50vs200: null, rsiDivergence: null,
    };
  }

  const idx = data.series.length - 1;
  const price = data.series[idx].close;

  const mm200 = last(data.mm200);
  const mm50 = last(data.mm50);
  const bbUpper = last(data.bollingerUpper);
  const bbLower = last(data.bollingerLower);

  // Perf 30d / 90d (calendar days, not data-point indices)
  const perf30d = calcPerfFromCalendarDays(data.series, 30);
  const perf90d = calcPerfFromCalendarDays(data.series, 90);

  // 30-day realized volatility (annualized)
  let volatility30d: number | null = null;
  if (idx >= 30) {
    const returns: number[] = [];
    for (let i = idx - 29; i <= idx; i++) {
      const prev = data.series[i - 1].close;
      if (prev > 0) returns.push(Math.log(data.series[i].close / prev));
    }
    if (returns.length > 0) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
      const annualFactor = assetConfig?.assetClass === 'Crypto' ? 365 : 252;
      volatility30d = Math.sqrt(variance * annualFactor) * 100;
    }
  }

  // Bollinger %B = (price - lower) / (upper - lower)
  let bollingerPctB: number | null = null;
  if (bbUpper != null && bbLower != null && bbUpper !== bbLower) {
    bollingerPctB = ((price - bbLower) / (bbUpper - bbLower)) * 100;
  }

  // Trend: Golden Cross (MM50 > MM200) vs Death Cross
  const trendMA50vs200: 'golden_cross' | 'death_cross' | null =
    mm50 != null && mm200 != null
      ? mm50 > mm200 ? 'golden_cross' : 'death_cross'
      : null;

  // RSI divergence detection
  const rsiDivergence = data.rsi14
    ? detectRSIDivergence(data.series, data.rsi14, 30)
    : null;

  return {
    drawdown: last(data.drawdown),
    rsi14: last(data.rsi14),
    rsi7: last(data.rsi7),
    rsi28: last(data.rsi28),
    distFromMA200Pct: mm200 != null ? pct(price, mm200) : null,
    distFromMA50Pct: mm50 != null ? pct(price, mm50) : null,
    bollingerPctB,
    perf30d: perf30d != null ? +perf30d.toFixed(2) : null,
    perf90d: perf90d != null ? +perf90d.toFixed(2) : null,
    volatility30d: volatility30d != null ? +volatility30d.toFixed(1) : null,
    trendMA50vs200,
    rsiDivergence,
  };
}

/* ─────────────────────────────────────────────
   3. Contrarian scoring per asset
   ───────────────────────────────────────────── */

/* ── Asset-class-specific threshold multipliers ── */

const ASSET_CLASS_THRESHOLDS: Record<string, {
  drawdownScale: number;
  maDistScale: number;
  perfScale: number;
}> = {
  'Crypto':  { drawdownScale: 2.0, maDistScale: 1.8, perfScale: 1.5 },
  'Actions': { drawdownScale: 1.0, maDistScale: 1.0, perfScale: 1.0 },
  'Métaux':  { drawdownScale: 0.8, maDistScale: 0.8, perfScale: 0.8 },
};
const DEFAULT_THRESHOLDS = { drawdownScale: 1.0, maDistScale: 1.0, perfScale: 1.0 };

export function scoreAsset(
  metrics: AssetMetrics,
  mkt: MarketContext,
  assetConfig?: AssetConfig,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const t = assetConfig?.assetClass
    ? (ASSET_CLASS_THRESHOLDS[assetConfig.assetClass] ?? DEFAULT_THRESHOLDS)
    : DEFAULT_THRESHOLDS;

  // ── A. Macro regime contributes to each asset ──
  const macroContribution = Math.round(mkt.regimeScore * 0.4);
  if (macroContribution !== 0) {
    score += macroContribution;
    if (macroContribution > 0) {
      reasons.push(`Régime macro « ${mkt.regime} » : biais contrariant acheteur (+${macroContribution}).`);
    } else {
      reasons.push(`Régime macro « ${mkt.regime} » : biais contrariant vendeur (${macroContribution}).`);
    }
  }

  // ── B. Drawdown depth (opportunité en phase de stress) ──
  if (metrics.drawdown != null) {
    if (metrics.drawdown <= -35 * t.drawdownScale) {
      score += 4;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : territoire de capitulation — « sang dans les rues ».`);
    } else if (metrics.drawdown <= -25 * t.drawdownScale) {
      score += 3;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : correction majeure — forte décote pour un contrariant.`);
    } else if (metrics.drawdown <= -15 * t.drawdownScale) {
      score += 2;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : correction significative — décote attractive.`);
    } else if (metrics.drawdown <= -8 * t.drawdownScale) {
      score += 1;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : recul modéré, début de zone d'intérêt.`);
    } else if (metrics.drawdown > -1) {
      score -= 2;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : quasiment à l'ATH — risque asymétrique élevé.`);
    } else if (metrics.drawdown > -3) {
      score -= 1;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : proche des sommets — peu de marge de sécurité.`);
    }
  }

  // ── C. Distance from MA200 (ancrage de valorisation long terme) ──
  if (metrics.distFromMA200Pct != null) {
    const d = metrics.distFromMA200Pct;
    if (d <= -25 * t.maDistScale) {
      score += 3;
      reasons.push(`Prix ${d.toFixed(1)}% sous la MM200 : décote majeure vs tendance long terme.`);
    } else if (d <= -15 * t.maDistScale) {
      score += 2;
      reasons.push(`Prix ${d.toFixed(1)}% sous la MM200 : zone de valeur pour un investisseur patient.`);
    } else if (d <= -8 * t.maDistScale) {
      score += 1;
      reasons.push(`Prix ${d.toFixed(1)}% sous la MM200 : léger discount long terme.`);
    } else if (d >= 40 * t.maDistScale) {
      score -= 3;
      reasons.push(`Prix +${d.toFixed(1)}% au-dessus de la MM200 : bulle potentielle, dislocation extrême.`);
    } else if (d >= 30 * t.maDistScale) {
      score -= 2;
      reasons.push(`Prix +${d.toFixed(1)}% au-dessus de la MM200 : surchauffe, loin de la valeur moyenne.`);
    } else if (d >= 20 * t.maDistScale) {
      score -= 1;
      reasons.push(`Prix +${d.toFixed(1)}% au-dessus de la MM200 : extension possible, prudence.`);
    }
  }

  // ── D. Multi-timeframe RSI (contrarian oversold/overbought) ──
  if (metrics.rsi7 != null && metrics.rsi14 != null && metrics.rsi28 != null) {
    const allOversold = metrics.rsi7 < 30 && metrics.rsi14 < 30 && metrics.rsi28 < 35;
    const allOverbought = metrics.rsi7 > 70 && metrics.rsi14 > 70 && metrics.rsi28 > 65;

    if (allOversold) {
      score += 3;
      reasons.push(`RSI survendu sur 3 horizons (${metrics.rsi7.toFixed(0)}/${metrics.rsi14.toFixed(0)}/${metrics.rsi28.toFixed(0)}) : excès vendeur confirmé.`);
    } else if (metrics.rsi14 < 30) {
      score += 2;
      reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : actif survendu, rebond probable.`);
    } else if (metrics.rsi14 < 40) {
      score += 1;
      reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : momentum faible, approche de zone survendue.`);
    } else if (allOverbought) {
      score -= 3;
      reasons.push(`RSI suracheté sur 3 horizons (${metrics.rsi7.toFixed(0)}/${metrics.rsi14.toFixed(0)}/${metrics.rsi28.toFixed(0)}) : excès acheteur confirmé.`);
    } else if (metrics.rsi14 > 75) {
      score -= 2;
      reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : actif suracheté, risque de correction.`);
    } else if (metrics.rsi14 > 65) {
      score -= 1;
      reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : momentum élevé, extension possible.`);
    }
  } else if (metrics.rsi14 != null) {
    if (metrics.rsi14 < 30) { score += 2; reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : survendu.`); }
    else if (metrics.rsi14 > 75) { score -= 2; reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : suracheté.`); }
  }

  // ── D2. RSI Divergence (momentum reversal confirmation) ──
  if (metrics.rsiDivergence != null) {
    if (metrics.rsiDivergence === 'bullish') {
      score += 2;
      reasons.push('Divergence haussière RSI : le prix fait un plus bas, le RSI un plus haut — épuisement vendeur.');
    } else if (metrics.rsiDivergence === 'bearish') {
      score -= 2;
      reasons.push('Divergence baissière RSI : le prix fait un plus haut, le RSI un plus bas — essoufflement acheteur.');
    }
  }

  // ── E. Bollinger %B (mean-reversion signal) ──
  if (metrics.bollingerPctB != null) {
    if (metrics.bollingerPctB <= 0) {
      score += 2;
      reasons.push(`Prix sous la bande basse Bollinger (%B=${metrics.bollingerPctB.toFixed(0)}%) : excès vendeur statistique.`);
    } else if (metrics.bollingerPctB <= 15) {
      score += 1;
      reasons.push(`Prix près de la bande basse Bollinger (%B=${metrics.bollingerPctB.toFixed(0)}%) : zone de survente.`);
    } else if (metrics.bollingerPctB >= 100) {
      score -= 2;
      reasons.push(`Prix au-dessus de la bande haute Bollinger (%B=${metrics.bollingerPctB.toFixed(0)}%) : excès acheteur statistique.`);
    } else if (metrics.bollingerPctB >= 85) {
      score -= 1;
      reasons.push(`Prix près de la bande haute Bollinger (%B=${metrics.bollingerPctB.toFixed(0)}%) : zone de surachat.`);
    }
  }

  // ── F. Short-term pain = long-term gain (perf 30d) ──
  if (metrics.perf30d != null) {
    if (metrics.perf30d <= -20 * t.perfScale) {
      score += 2;
      reasons.push(`Perf 30j de ${metrics.perf30d.toFixed(1)}% : chute brutale — potentiel de réversion.`);
    } else if (metrics.perf30d <= -10 * t.perfScale) {
      score += 1;
      reasons.push(`Perf 30j de ${metrics.perf30d.toFixed(1)}% : baisse marquée, intérêt contrariant.`);
    } else if (metrics.perf30d >= 30 * t.perfScale) {
      score -= 2;
      reasons.push(`Perf 30j de +${metrics.perf30d.toFixed(1)}% : rally parabolique, risque de correction brutale.`);
    } else if (metrics.perf30d >= 20 * t.perfScale) {
      score -= 1;
      reasons.push(`Perf 30j de +${metrics.perf30d.toFixed(1)}% : rally vertical, risque de prise de profit.`);
    }
  }

  // ── G. Distance from MA50 (short-term discount) ──
  if (metrics.distFromMA50Pct != null) {
    const d = metrics.distFromMA50Pct;
    if (d <= -15 * t.maDistScale) {
      score += 2;
      reasons.push(`Prix ${d.toFixed(1)}% sous la MM50 : dislocation court terme, opportunité tactique.`);
    } else if (d <= -8 * t.maDistScale) {
      score += 1;
      reasons.push(`Prix ${d.toFixed(1)}% sous la MM50 : discount court terme.`);
    } else if (d >= 20 * t.maDistScale) {
      score -= 2;
      reasons.push(`Prix +${d.toFixed(1)}% au-dessus de la MM50 : extension court terme extrême.`);
    } else if (d >= 15 * t.maDistScale) {
      score -= 1;
      reasons.push(`Prix +${d.toFixed(1)}% au-dessus de la MM50 : surchauffe court terme.`);
    }
  }

  // ── H. Trend filter (Golden Cross / Death Cross) ──
  if (metrics.trendMA50vs200 != null) {
    if (metrics.trendMA50vs200 === 'death_cross' && score > 0) {
      const penalty = -1;
      score += penalty;
      reasons.push(`Death Cross (MM50 < MM200) : tendance baissière confirmée, conviction d'achat réduite (${penalty}).`);
    } else if (metrics.trendMA50vs200 === 'death_cross' && score < 0) {
      const bonus = -1;
      score += bonus;
      reasons.push(`Death Cross (MM50 < MM200) : tendance baissière renforce le signal de vente (${bonus}).`);
    } else if (metrics.trendMA50vs200 === 'golden_cross' && score > 0) {
      const bonus = 1;
      score += bonus;
      reasons.push(`Golden Cross (MM50 > MM200) : tendance haussière renforce le signal d'achat (+${bonus}).`);
    } else if (metrics.trendMA50vs200 === 'golden_cross' && score < 0) {
      const penalty = 1;
      score += penalty;
      reasons.push(`Golden Cross (MM50 > MM200) : tendance haussière, conviction de vente réduite (+${penalty}).`);
    }
  }

  // ── I. Intermediate-term trend (perf 90d) ──
  if (metrics.perf90d != null) {
    if (metrics.perf90d <= -35 * t.perfScale) {
      score += 2;
      reasons.push(`Perf 90j de ${metrics.perf90d.toFixed(1)}% : baisse intermédiaire majeure — zone de capitulation.`);
    } else if (metrics.perf90d <= -20 * t.perfScale) {
      score += 1;
      reasons.push(`Perf 90j de ${metrics.perf90d.toFixed(1)}% : correction intermédiaire significative, intérêt contrariant.`);
    } else if (metrics.perf90d >= 40 * t.perfScale) {
      score -= 2;
      reasons.push(`Perf 90j de +${metrics.perf90d.toFixed(1)}% : rally parabolique, risque d'essoufflement majeur.`);
    } else if (metrics.perf90d >= 25 * t.perfScale) {
      score -= 1;
      reasons.push(`Perf 90j de +${metrics.perf90d.toFixed(1)}% : tendance haussière prolongée, prudence.`);
    }
  }

  // ── J. Volatility conviction adjustment ──
  if (metrics.volatility30d != null) {
    if (metrics.volatility30d >= 80) {
      const dampen = score > 0 ? -1 : score < 0 ? 1 : 0;
      if (dampen !== 0) {
        score += dampen;
        reasons.push(`Volatilité extrême (${metrics.volatility30d.toFixed(0)}%) : signaux moins fiables, conviction réduite (${dampen > 0 ? '+' : ''}${dampen}).`);
      }
    } else if (metrics.volatility30d <= 10) {
      const amplify = score > 0 ? 1 : score < 0 ? -1 : 0;
      if (amplify !== 0) {
        score += amplify;
        reasons.push(`Volatilité très faible (${metrics.volatility30d.toFixed(0)}%) : signaux plus fiables, conviction renforcée (${amplify > 0 ? '+' : ''}${amplify}).`);
      }
    }
  }

  return { score, reasons };
}

/* ─────────────────────────────────────────────
   4. Score → Advice + Conviction
   ───────────────────────────────────────────── */

function scoreToAdvice(score: number): Advice {
  if (score >= 4) return 'Renforcer';
  if (score <= -4) return 'Alléger';
  return 'Conserver';
}

function scoreToConviction(score: number): Conviction {
  const abs = Math.abs(score);
  if (abs >= 10) return 'Très forte';
  if (abs >= 7) return 'Forte';
  if (abs >= 4) return 'Moyenne';
  return 'Faible';
}

/* ─────────────────────────────────────────────
   5. Public API
   ───────────────────────────────────────────── */

export function getAssetAdvice(
  store: Store,
  portfolioKeys: string[],
  assets: Record<string, AssetConfig>,
  fearGreed: number | null = null,
  hySpread: number | null = null,
): { advices: AssetAdvice[]; marketContext: MarketContext } {
  const mkt = buildMarketContext(store, fearGreed, hySpread);

  const advices: AssetAdvice[] = portfolioKeys.map((key) => {
    const data = store[key];
    const metrics = extractMetrics(store, key, assets[key]);

    if (!data?.series?.length) {
      return {
        key,
        advice: 'Conserver' as Advice,
        score: 0,
        conviction: 'Faible' as Conviction,
        reasons: ['Données insuffisantes pour émettre un signal fiable.'],
        metrics,
      };
    }

    const { score, reasons } = scoreAsset(metrics, mkt, assets[key]);

    if (reasons.length === 0) {
      reasons.push('Signaux techniques et macro mitigés : neutralité privilégiée.');
    }

    const advice = scoreToAdvice(score);
    const conviction = scoreToConviction(score);

    return { key, advice, score, conviction, reasons, metrics };
  });

  // ── Cross-asset signal aggregation ──
  const total = advices.length;
  if (total >= 2) {
    const buyCount = advices.filter(a => a.score >= 4).length;
    const sellCount = advices.filter(a => a.score <= -4).length;
    const buyRatio = buyCount / total;
    const sellRatio = sellCount / total;

    if (buyRatio >= 0.8) {
      if (mkt.regimeScore >= 4) {
        for (const a of advices) {
          if (a.score > 0) {
            a.score += 1;
            a.crossAssetAdjustment = 1;
            a.reasons.push("Signal d'achat unanime + macro en capitulation : opportunité systémique exceptionnelle (+1).");
            a.conviction = scoreToConviction(a.score);
          }
        }
      } else if (mkt.regimeScore < 2) {
        for (const a of advices) {
          if (a.score > 0) {
            a.score -= 1;
            a.crossAssetAdjustment = -1;
            a.reasons.push("Signal d'achat unanime SANS confirmation macro : corrélation suspecte, prudence (-1).");
            a.advice = scoreToAdvice(a.score);
            a.conviction = scoreToConviction(a.score);
          }
        }
      }
    }

    if (sellRatio >= 0.8 && mkt.regimeScore <= -4) {
      for (const a of advices) {
        if (a.score < 0) {
          a.score -= 1;
          a.crossAssetAdjustment = -1;
          a.reasons.push('Signal de vente unanime + macro en euphorie : excès systémique confirmé (-1).');
          a.conviction = scoreToConviction(a.score);
        }
      }
    }
  }

  return { advices, marketContext: mkt };
}

/* ─────────────────────────────────────────────
   6. Display helpers
   ───────────────────────────────────────────── */

export function adviceTone(advice: Advice): string {
  if (advice === 'Renforcer') return 'text-[var(--success)] bg-[var(--success-soft)] border border-[var(--success)]/30';
  if (advice === 'Alléger') return 'text-[var(--danger)] bg-[var(--danger-soft)] border border-[var(--danger)]/30';
  return 'text-[var(--text)] bg-[var(--panel-hover)] border border-[var(--border)]';
}

export function getAdviceDescription(advice: Advice): string {
  if (advice === 'Renforcer')
    return "Stratégie contrarienne : les conditions de peur et de décote créent une fenêtre d'accumulation.";
  if (advice === 'Alléger')
    return "Stratégie contrarienne : l'euphorie et la surchauffe imposent un allègement défensif.";
  return '';
}

export function getAssetClassLabel(key: string, assets: Record<string, AssetConfig>): string {
  return assets[key]?.assetClass ?? '';
}

export function regimeColor(regime: MarketRegime): string {
  switch (regime) {
    case 'Capitulation': return '#10b981';
    case 'Peur': return '#34d399';
    case 'Neutre': return '#eab308';
    case 'Euphorie': return '#f97316';
    case 'Exubérance': return '#ef4444';
  }
}

export function regimeContrarianLabel(regime: MarketRegime): string {
  switch (regime) {
    case 'Capitulation': return 'Opportunité majeure';
    case 'Peur': return "Zone d'accumulation";
    case 'Neutre': return 'Patience';
    case 'Euphorie': return 'Prudence';
    case 'Exubérance': return 'Danger — alléger';
  }
}
