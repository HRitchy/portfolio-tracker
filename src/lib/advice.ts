import { ASSET_KEYS, ASSETS } from './config';
import { AssetAdvice, Advice, Store } from './types';

function pushReason(reasons: string[], condition: boolean, message: string): void {
  if (condition) reasons.push(message);
}

export function getAssetAdvice(store: Store): AssetAdvice[] {
  return ASSET_KEYS.map((key) => {
    const data = store[key];
    if (!data?.series?.length) {
      return {
        key,
        advice: 'Conservation',
        score: 0,
        reasons: ['Données insuffisantes pour émettre un signal fiable.'],
      };
    }

    const idx = data.series.length - 1;
    const lastPrice = data.series[idx].close;
    const mm50 = data.mm50?.[idx] ?? null;
    const mm200 = data.mm200?.[idx] ?? null;
    const rsi14 = data.rsi14?.[idx] ?? null;
    const bbUpper = data.bollingerUpper?.[idx] ?? null;
    const bbLower = data.bollingerLower?.[idx] ?? null;

    let score = 0;
    const reasons: string[] = [];

    if (mm50 != null) {
      if (lastPrice > mm50) {
        score += 1;
      } else {
        score -= 1;
      }
      pushReason(reasons, lastPrice > mm50, 'Prix au-dessus de la MM50 (tendance courte positive).');
      pushReason(reasons, lastPrice <= mm50, 'Prix sous la MM50 (pression baissière court terme).');
    }

    if (mm50 != null && mm200 != null) {
      if (mm50 > mm200) {
        score += 1;
      } else {
        score -= 1;
      }
      pushReason(reasons, mm50 > mm200, 'MM50 au-dessus de la MM200 (biais haussier long terme).');
      pushReason(reasons, mm50 <= mm200, 'MM50 sous MM200 (biais baissier long terme).');
    }

    if (rsi14 != null) {
      if (rsi14 < 35) {
        score += 1;
      } else if (rsi14 > 70) {
        score -= 1;
      }
      pushReason(reasons, rsi14 < 35, `RSI14 à ${rsi14}: actif survendu, rebond possible.`);
      pushReason(reasons, rsi14 > 70, `RSI14 à ${rsi14}: actif suracheté, risque de repli.`);
    }

    if (bbUpper != null && bbLower != null) {
      if (lastPrice <= bbLower) {
        score += 1;
      } else if (lastPrice >= bbUpper) {
        score -= 1;
      }
      pushReason(reasons, lastPrice <= bbLower, 'Prix proche/bas sous bande basse Bollinger (excès vendeur).');
      pushReason(reasons, lastPrice >= bbUpper, 'Prix proche/sur bande haute Bollinger (excès acheteur).');
    }

    let advice: Advice = 'Conservation';
    if (score >= 2) advice = 'Achat';
    if (score <= -2) advice = 'Vente';

    if (reasons.length === 0) {
      reasons.push('Signaux techniques mitigés: neutralité privilégiée.');
    }

    return { key, advice, score, reasons };
  });
}

export function adviceTone(advice: Advice): string {
  if (advice === 'Achat') return 'text-[var(--success)] bg-[var(--success-soft)]';
  if (advice === 'Vente') return 'text-[var(--danger)] bg-[var(--danger-soft)]';
  return 'text-[var(--muted)] bg-[var(--panel-hover)]';
}

export function getAdviceDescription(advice: Advice): string {
  if (advice === 'Achat') return 'Le momentum et la valorisation relative favorisent un renforcement.';
  if (advice === 'Vente') return 'Le risque de baisse domine, allègement recommandé.';
  return 'Absence de signal fort: conserver la position en attente de confirmation.';
}

export function getAssetClassLabel(key: keyof typeof ASSETS): string {
  return ASSETS[key].assetClass;
}
