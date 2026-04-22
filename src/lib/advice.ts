import { calcPerfFromCalendarDays, detectRSIDivergence } from './calculations';
import {
  Advice,
  AssetAdvice,
  AssetConfig,
  AssetMetrics,
  Conviction,
  IndicatorVote,
  MarketContext,
  MarketRegime,
  Store,
} from './types';

/* ─────────────────────────────────────────────
   Regime classification thresholds
   (cf. tableau de référence du dashboard :
   PANIQUE / STRESS / CALME / EUPHORIE)
   ───────────────────────────────────────────── */

export function classifyVix(v: number | null): MarketRegime | null {
  if (v == null) return null;
  if (v > 30) return 'Panique';
  if (v >= 20) return 'Stress';
  if (v >= 15) return 'Calme';
  return 'Euphorie';
}

export function classifyHYSpread(v: number | null): MarketRegime | null {
  if (v == null) return null;
  if (v > 4.5) return 'Panique';
  if (v >= 3.5) return 'Stress';
  if (v >= 2.75) return 'Calme';
  return 'Euphorie';
}

export function classifyFearGreed(v: number | null): MarketRegime | null {
  if (v == null) return null;
  if (v >= 76) return 'Euphorie';
  if (v >= 56) return 'Calme';
  if (v >= 45) return null; // zone tampon entre Stress et Calme (45-55)
  if (v >= 25) return 'Stress';
  return 'Panique'; // 0-24
}

const REGIME_BASE_SCORE: Record<Exclude<MarketRegime, 'Indéterminé'>, number> = {
  Panique: 4,
  Stress: 2,
  Calme: 0,
  Euphorie: -4,
};

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

  const reasons: string[] = [];

  // ── Per-indicator regime classification (4 régimes) ──
  const vixRegime = classifyVix(vixLevel);
  const hyRegime = classifyHYSpread(hySpread);
  const fgRegime = classifyFearGreed(fearGreed);

  if (vixLevel != null) {
    reasons.push(
      `VIX à ${vixLevel.toFixed(1)} → ${vixRegime ?? 'Indéterminé'} (Euphorie <15, Calme 15-20, Stress 20-30, Panique >30).`,
    );
    if (vixMA50 != null && vixLevel > vixMA50 * 1.3) {
      reasons.push('VIX 30%+ au-dessus de sa MM50 : spike de peur, biais acheteur renforcé.');
    }
  }
  if (hySpread != null) {
    reasons.push(
      `HY OAS à ${hySpread.toFixed(2)}% → ${hyRegime ?? 'Indéterminé'} (Euphorie <2.75, Calme 2.75-3.50, Stress 3.50-4.50, Panique >4.50).`,
    );
  }
  if (fearGreed != null) {
    const fgLabel = fgRegime ?? 'Transition (45-55)';
    reasons.push(
      `Fear & Greed à ${Math.round(fearGreed)} → ${fgLabel} (Panique 0-24, Stress 25-44, Calme 56-75, Euphorie 76-100).`,
    );
  }

  // ── 2-of-3 convergence rule ──
  const indicatorVotes: IndicatorVote[] = [
    { indicator: 'vix', regime: vixRegime },
    { indicator: 'fearGreed', regime: fgRegime },
    { indicator: 'hySpread', regime: hyRegime },
  ];

  const counts = new Map<MarketRegime, number>();
  for (const vote of indicatorVotes) {
    if (vote.regime) counts.set(vote.regime, (counts.get(vote.regime) ?? 0) + 1);
  }

  let regime: MarketRegime = 'Indéterminé';
  let regimeConfirmed = false;
  let topCount = 0;
  for (const [r, c] of counts) {
    if (c > topCount) {
      topCount = c;
      regime = r;
    }
  }
  if (topCount >= 2) {
    regimeConfirmed = true;
    reasons.push(
      `Hypothèse confirmée : ${topCount} indicateurs sur 3 convergent vers « ${regime} ».`,
    );
  } else if (topCount > 0) {
    regime = 'Indéterminé';
    reasons.push("Aucune convergence 2/3 : les indicateurs divergent, régime indéterminé.");
  }

  // ── Score continu (-10..+10) pour le scoring contrariant ──
  let regimeScore = 0;
  for (const vote of indicatorVotes) {
    if (vote.regime && vote.regime !== 'Indéterminé') {
      regimeScore += REGIME_BASE_SCORE[vote.regime];
    }
  }
  if (vixLevel != null && vixMA50 != null && vixLevel > vixMA50 * 1.3) {
    regimeScore += 1;
  }
  regimeScore = clamp(regimeScore, -10, 10);

  return {
    fearGreed,
    vixLevel,
    vixMA50,
    hySpread,
    regime,
    regimeConfirmed,
    regimeScore,
    regimeReasons: reasons,
    indicatorVotes,
  };
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
  const reasons: string[] = [];

  const t = assetConfig?.assetClass
    ? (ASSET_CLASS_THRESHOLDS[assetConfig.assetClass] ?? DEFAULT_THRESHOLDS)
    : DEFAULT_THRESHOLDS;

  // ── A. Macro regime contributes to each asset ──
  const macroContribution = Math.round(mkt.regimeScore * 0.4);
  if (macroContribution !== 0) {
    if (macroContribution > 0) {
      reasons.push(`Régime macro « ${mkt.regime} » : biais contrariant acheteur (+${macroContribution}).`);
    } else {
      reasons.push(`Régime macro « ${mkt.regime} » : biais contrariant vendeur (${macroContribution}).`);
    }
  }

  /* ── Grouped indicators with caps to prevent score inflation ──
     Correlated indicators are grouped and capped so that a crash
     (where all fire simultaneously) doesn't produce unrealistic scores.
     Group 1 – Valuation (drawdown + MA200):          cap ±5
     Group 2 – Oscillators (RSI + divergence + Bollinger): cap ±4
     Group 3 – Short-term momentum (perf30d + MA50 + perf90d): cap ±3
  */

  // ── Group 1: Valuation (B + C) — cap ±5 ──
  let valuationScore = 0;

  // B. Drawdown depth
  if (metrics.drawdown != null) {
    if (metrics.drawdown <= -35 * t.drawdownScale) {
      valuationScore += 4;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : territoire de capitulation — « sang dans les rues ».`);
    } else if (metrics.drawdown <= -25 * t.drawdownScale) {
      valuationScore += 3;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : correction majeure — forte décote pour un contrariant.`);
    } else if (metrics.drawdown <= -15 * t.drawdownScale) {
      valuationScore += 2;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : correction significative — décote attractive.`);
    } else if (metrics.drawdown <= -8 * t.drawdownScale) {
      valuationScore += 1;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : recul modéré, début de zone d'intérêt.`);
    } else if (metrics.drawdown > -1 * t.drawdownScale) {
      valuationScore -= 2;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : quasiment à l'ATH — risque asymétrique élevé.`);
    } else if (metrics.drawdown > -3 * t.drawdownScale) {
      valuationScore -= 1;
      reasons.push(`Drawdown de ${metrics.drawdown.toFixed(1)}% : proche des sommets — peu de marge de sécurité.`);
    }
  }

  // C. Distance from MA200
  if (metrics.distFromMA200Pct != null) {
    const d = metrics.distFromMA200Pct;
    if (d <= -25 * t.maDistScale) {
      valuationScore += 3;
      reasons.push(`Prix ${d.toFixed(1)}% sous la MM200 : décote majeure vs tendance long terme.`);
    } else if (d <= -15 * t.maDistScale) {
      valuationScore += 2;
      reasons.push(`Prix ${d.toFixed(1)}% sous la MM200 : zone de valeur pour un investisseur patient.`);
    } else if (d <= -8 * t.maDistScale) {
      valuationScore += 1;
      reasons.push(`Prix ${d.toFixed(1)}% sous la MM200 : léger discount long terme.`);
    } else if (d >= 40 * t.maDistScale) {
      valuationScore -= 3;
      reasons.push(`Prix +${d.toFixed(1)}% au-dessus de la MM200 : bulle potentielle, dislocation extrême.`);
    } else if (d >= 30 * t.maDistScale) {
      valuationScore -= 2;
      reasons.push(`Prix +${d.toFixed(1)}% au-dessus de la MM200 : surchauffe, loin de la valeur moyenne.`);
    } else if (d >= 20 * t.maDistScale) {
      valuationScore -= 1;
      reasons.push(`Prix +${d.toFixed(1)}% au-dessus de la MM200 : extension possible, prudence.`);
    }
  }

  valuationScore = clamp(valuationScore, -5, 5);

  // ── Group 2: Oscillators (D + D2 + E) — cap ±4 ──
  let oscillatorScore = 0;

  // D. Multi-timeframe RSI
  if (metrics.rsi7 != null && metrics.rsi14 != null && metrics.rsi28 != null) {
    const allOversold = metrics.rsi7 < 30 && metrics.rsi14 < 30 && metrics.rsi28 < 35;
    const allOverbought = metrics.rsi7 > 70 && metrics.rsi14 > 70 && metrics.rsi28 > 65;

    if (allOversold) {
      oscillatorScore += 3;
      reasons.push(`RSI survendu sur 3 horizons (${metrics.rsi7.toFixed(0)}/${metrics.rsi14.toFixed(0)}/${metrics.rsi28.toFixed(0)}) : excès vendeur confirmé.`);
    } else if (metrics.rsi14 < 30) {
      oscillatorScore += 2;
      reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : actif survendu, rebond probable.`);
    } else if (metrics.rsi14 < 40) {
      oscillatorScore += 1;
      reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : momentum faible, approche de zone survendue.`);
    } else if (allOverbought) {
      oscillatorScore -= 3;
      reasons.push(`RSI suracheté sur 3 horizons (${metrics.rsi7.toFixed(0)}/${metrics.rsi14.toFixed(0)}/${metrics.rsi28.toFixed(0)}) : excès acheteur confirmé.`);
    } else if (metrics.rsi14 > 75) {
      oscillatorScore -= 2;
      reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : actif suracheté, risque de correction.`);
    } else if (metrics.rsi14 > 65) {
      oscillatorScore -= 1;
      reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : momentum élevé, extension possible.`);
    }
  } else if (metrics.rsi14 != null) {
    if (metrics.rsi14 < 30) { oscillatorScore += 2; reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : survendu.`); }
    else if (metrics.rsi14 > 75) { oscillatorScore -= 2; reasons.push(`RSI14 à ${metrics.rsi14.toFixed(0)} : suracheté.`); }
  }

  // D2. RSI Divergence
  if (metrics.rsiDivergence != null) {
    if (metrics.rsiDivergence === 'bullish') {
      oscillatorScore += 2;
      reasons.push('Divergence haussière RSI : le prix fait un plus bas, le RSI un plus haut — épuisement vendeur.');
    } else if (metrics.rsiDivergence === 'bearish') {
      oscillatorScore -= 2;
      reasons.push('Divergence baissière RSI : le prix fait un plus haut, le RSI un plus bas — essoufflement acheteur.');
    }
  }

  // E. Bollinger %B
  if (metrics.bollingerPctB != null) {
    if (metrics.bollingerPctB <= 0) {
      oscillatorScore += 2;
      reasons.push(`Prix sous la bande basse Bollinger (%B=${metrics.bollingerPctB.toFixed(0)}%) : excès vendeur statistique.`);
    } else if (metrics.bollingerPctB <= 15) {
      oscillatorScore += 1;
      reasons.push(`Prix près de la bande basse Bollinger (%B=${metrics.bollingerPctB.toFixed(0)}%) : zone de survente.`);
    } else if (metrics.bollingerPctB >= 100) {
      oscillatorScore -= 2;
      reasons.push(`Prix au-dessus de la bande haute Bollinger (%B=${metrics.bollingerPctB.toFixed(0)}%) : excès acheteur statistique.`);
    } else if (metrics.bollingerPctB >= 85) {
      oscillatorScore -= 1;
      reasons.push(`Prix près de la bande haute Bollinger (%B=${metrics.bollingerPctB.toFixed(0)}%) : zone de surachat.`);
    }
  }

  oscillatorScore = clamp(oscillatorScore, -4, 4);

  // ── Group 3: Short-term momentum (F + G + I) — cap ±3 ──
  let momentumScore = 0;

  // F. Perf 30d
  if (metrics.perf30d != null) {
    if (metrics.perf30d <= -20 * t.perfScale) {
      momentumScore += 2;
      reasons.push(`Perf 30j de ${metrics.perf30d.toFixed(1)}% : chute brutale — potentiel de réversion.`);
    } else if (metrics.perf30d <= -10 * t.perfScale) {
      momentumScore += 1;
      reasons.push(`Perf 30j de ${metrics.perf30d.toFixed(1)}% : baisse marquée, intérêt contrariant.`);
    } else if (metrics.perf30d >= 30 * t.perfScale) {
      momentumScore -= 2;
      reasons.push(`Perf 30j de +${metrics.perf30d.toFixed(1)}% : rally parabolique, risque de correction brutale.`);
    } else if (metrics.perf30d >= 20 * t.perfScale) {
      momentumScore -= 1;
      reasons.push(`Perf 30j de +${metrics.perf30d.toFixed(1)}% : rally vertical, risque de prise de profit.`);
    }
  }

  // G. Distance from MA50
  if (metrics.distFromMA50Pct != null) {
    const d = metrics.distFromMA50Pct;
    if (d <= -15 * t.maDistScale) {
      momentumScore += 2;
      reasons.push(`Prix ${d.toFixed(1)}% sous la MM50 : dislocation court terme, opportunité tactique.`);
    } else if (d <= -8 * t.maDistScale) {
      momentumScore += 1;
      reasons.push(`Prix ${d.toFixed(1)}% sous la MM50 : discount court terme.`);
    } else if (d >= 20 * t.maDistScale) {
      momentumScore -= 2;
      reasons.push(`Prix +${d.toFixed(1)}% au-dessus de la MM50 : extension court terme extrême.`);
    } else if (d >= 15 * t.maDistScale) {
      momentumScore -= 1;
      reasons.push(`Prix +${d.toFixed(1)}% au-dessus de la MM50 : surchauffe court terme.`);
    }
  }

  // I. Intermediate-term trend (perf 90d)
  if (metrics.perf90d != null) {
    if (metrics.perf90d <= -35 * t.perfScale) {
      momentumScore += 2;
      reasons.push(`Perf 90j de ${metrics.perf90d.toFixed(1)}% : baisse intermédiaire majeure — zone de capitulation.`);
    } else if (metrics.perf90d <= -20 * t.perfScale) {
      momentumScore += 1;
      reasons.push(`Perf 90j de ${metrics.perf90d.toFixed(1)}% : correction intermédiaire significative, intérêt contrariant.`);
    } else if (metrics.perf90d >= 40 * t.perfScale) {
      momentumScore -= 2;
      reasons.push(`Perf 90j de +${metrics.perf90d.toFixed(1)}% : rally parabolique, risque d'essoufflement majeur.`);
    } else if (metrics.perf90d >= 25 * t.perfScale) {
      momentumScore -= 1;
      reasons.push(`Perf 90j de +${metrics.perf90d.toFixed(1)}% : tendance haussière prolongée, prudence.`);
    }
  }

  momentumScore = clamp(momentumScore, -3, 3);

  // ── Assemble score from capped groups + standalone modifiers ──
  let score = macroContribution + valuationScore + oscillatorScore + momentumScore;

  // ── H. Trend filter (Golden Cross / Death Cross) ──
  if (metrics.trendMA50vs200 != null) {
    if (metrics.trendMA50vs200 === 'death_cross') {
      score -= 1;
      if (score + 1 > 0) {
        reasons.push("Death Cross (MM50 < MM200) : tendance baissière confirmée, conviction d'achat réduite (-1).");
      } else if (score + 1 < 0) {
        reasons.push('Death Cross (MM50 < MM200) : tendance baissière renforce le signal de vente (-1).');
      } else {
        reasons.push('Death Cross (MM50 < MM200) : tendance baissière, biais vendeur (-1).');
      }
    } else if (metrics.trendMA50vs200 === 'golden_cross') {
      score += 1;
      if (score - 1 > 0) {
        reasons.push("Golden Cross (MM50 > MM200) : tendance haussière renforce le signal d'achat (+1).");
      } else if (score - 1 < 0) {
        reasons.push('Golden Cross (MM50 > MM200) : tendance haussière, conviction de vente réduite (+1).');
      } else {
        reasons.push('Golden Cross (MM50 > MM200) : tendance haussière, biais acheteur (+1).');
      }
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

  // Clamp final score to effective range
  score = clamp(score, -16, 16);

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
  if (abs >= 9) return 'Très forte';
  if (abs >= 6) return 'Forte';
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
            a.reasons.push("Signal d'achat unanime + macro en panique : opportunité systémique exceptionnelle (+1).");
            a.advice = scoreToAdvice(a.score);
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

    if (sellRatio >= 0.8) {
      if (mkt.regimeScore <= -4) {
        for (const a of advices) {
          if (a.score < 0) {
            a.score -= 1;
            a.crossAssetAdjustment = -1;
            a.reasons.push('Signal de vente unanime + macro en euphorie : excès systémique confirmé (-1).');
            a.advice = scoreToAdvice(a.score);
            a.conviction = scoreToConviction(a.score);
          }
        }
      } else if (mkt.regimeScore > -2) {
        for (const a of advices) {
          if (a.score < 0) {
            a.score += 1;
            a.crossAssetAdjustment = 1;
            a.reasons.push('Signal de vente unanime SANS confirmation macro : corrélation suspecte, prudence (+1).');
            a.advice = scoreToAdvice(a.score);
            a.conviction = scoreToConviction(a.score);
          }
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
    case 'Panique': return '#ef4444';     // rouge — marché en panique (achat contrariant)
    case 'Stress': return '#f97316';      // orange — stress du marché
    case 'Calme': return '#eab308';       // jaune — marché calme
    case 'Euphorie': return '#10b981';    // vert — marché euphorique (vente contrariante)
    case 'Indéterminé': return '#94a3b8'; // gris — pas de convergence 2/3
  }
}

export function regimeContrarianLabel(regime: MarketRegime): string {
  switch (regime) {
    case 'Panique': return 'Opportunité majeure — accumuler';
    case 'Stress': return "Zone d'accumulation progressive";
    case 'Calme': return 'Statu quo — patience';
    case 'Euphorie': return 'Prudence — alléger';
    case 'Indéterminé': return 'Signaux divergents — attendre confirmation';
  }
}
