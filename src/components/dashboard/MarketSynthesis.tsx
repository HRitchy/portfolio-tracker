'use client';

import { useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useMacro } from '@/context/MacroContext';
import { buildMarketContext, regimeColor, regimeContrarianLabel } from '@/lib/advice';
import { MarketContext, MarketRegime } from '@/lib/types';

interface RegimeAction {
  headline: string;
  steps: string[];
  posture: string;
}

function getRegimeAction(regime: MarketRegime): RegimeAction {
  switch (regime) {
    case 'Capitulation':
      return {
        headline: "Opportunité historique — accumuler agressivement",
        posture: "Biais 100% acheteur, profil contrariant",
        steps: [
          "Augmenter significativement l'exposition actions de qualité (indices larges, leaders).",
          "Déployer le cash en 2-3 tranches sur 4-8 semaines pour lisser le point d'entrée.",
          "Privilégier les actifs les plus massacrés mais solides (beta élevé, qualité fondamentale).",
          "Éviter les ventes à perte : la fenêtre d'achat est généralement courte.",
          "Tenir bon malgré la volatilité — les meilleurs rebonds suivent la capitulation.",
        ],
      };
    case 'Peur':
      return {
        headline: "Zone d'accumulation — renforcer progressivement",
        posture: "Biais acheteur mesuré, patience récompensée",
        steps: [
          "Renforcer les positions existantes par tranches (DCA accéléré).",
          "Commencer à déployer le cash : 30 à 50% de la poudre sèche disponible.",
          "Cibler les actifs de qualité qui ont le plus corrigé.",
          "Éviter l'effet de levier : la volatilité reste élevée.",
          "Préparer une liste de prix cibles pour les prochains paliers de baisse.",
        ],
      };
    case 'Neutre':
      return {
        headline: "Statu quo — conserver et attendre un signal clair",
        posture: "Équilibre, ni euphorie ni panique",
        steps: [
          "Maintenir l'allocation stratégique actuelle, pas de mouvement brusque.",
          "Poursuivre un DCA régulier et discipliné sur les actifs cibles.",
          "Conserver une poche de cash (15-25%) pour saisir les opportunités futures.",
          "Surveiller VIX, Fear & Greed et HY Spread pour détecter un basculement.",
          "Profiter du calme pour réévaluer la thèse d'investissement de chaque position.",
        ],
      };
    case 'Euphorie':
      return {
        headline: "Prudence — alléger progressivement les positions tendues",
        posture: "Biais défensif, prise de bénéfices sélective",
        steps: [
          "Alléger partiellement les actifs les plus étendus (gains >30% sur 90j).",
          "Reconstituer la trésorerie : viser 25 à 40% de cash disponible.",
          "Éviter tout nouvel achat hors actifs décotés ou défensifs.",
          "Couvrir les positions concentrées (options, stops techniques).",
          "Ne pas céder au FOMO — les rallies verticaux finissent mal.",
        ],
      };
    case 'Exubérance':
      return {
        headline: "Danger — posture défensive impérative",
        posture: "Biais fortement vendeur, protection du capital",
        steps: [
          "Alléger fortement l'exposition aux actifs risqués (objectif : réduire de 30-50%).",
          "Monter la poche de cash / monétaire à 40-60% du portefeuille.",
          "Fermer ou couvrir les positions à fort effet de levier.",
          "Éviter tout nouveau déploiement, même sur les pullbacks mineurs.",
          "Préparer une liste d'achat pour le prochain régime de peur / capitulation.",
        ],
      };
  }
}

function IndicatorTile({
  label,
  value,
  subLabel,
  color,
}: {
  label: string;
  value: string;
  subLabel: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-hover)]/50 p-3 md:p-4">
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1">{label}</div>
      <div className="text-xl md:text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[11px] mt-1" style={{ color }}>
        {subLabel}
      </div>
    </div>
  );
}

function vixSubLabel(v: number | null): { text: string; color: string } {
  if (v == null) return { text: '--', color: 'var(--muted)' };
  if (v >= 35) return { text: 'Panique', color: '#10b981' };
  if (v >= 25) return { text: 'Stress élevé', color: '#34d399' };
  if (v >= 20) return { text: 'Volatilité modérée', color: '#eab308' };
  if (v <= 12) return { text: 'Complaisance extrême', color: '#ef4444' };
  if (v <= 15) return { text: 'Complaisance', color: '#f97316' };
  return { text: 'Normal', color: '#eab308' };
}

function fearGreedSubLabel(s: number | null): { text: string; color: string } {
  if (s == null) return { text: '--', color: 'var(--muted)' };
  if (s <= 20) return { text: 'Peur extrême', color: '#10b981' };
  if (s <= 35) return { text: 'Peur', color: '#34d399' };
  if (s <= 55) return { text: 'Neutre', color: '#eab308' };
  if (s <= 75) return { text: 'Avidité', color: '#f97316' };
  return { text: 'Avidité extrême', color: '#ef4444' };
}

function hySubLabel(v: number | null): { text: string; color: string } {
  if (v == null) return { text: '--', color: 'var(--muted)' };
  if (v >= 7) return { text: 'Stress crédit majeur', color: '#10b981' };
  if (v >= 5) return { text: 'Stress crédit élevé', color: '#34d399' };
  if (v >= 4) return { text: 'Vigilance', color: '#eab308' };
  if (v <= 2.5) return { text: 'Euphorie crédit', color: '#ef4444' };
  if (v <= 3) return { text: 'Spreads comprimés', color: '#f97316' };
  return { text: 'Normal', color: '#eab308' };
}

function ScoreBar({ mkt }: { mkt: MarketContext }) {
  const color = regimeColor(mkt.regime);
  const pct = ((mkt.regimeScore + 10) / 20) * 100;

  return (
    <div className="mt-3">
      <div
        className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden"
        role="progressbar"
        aria-valuenow={mkt.regimeScore}
        aria-valuemin={-10}
        aria-valuemax={10}
        aria-label={`Score de régime: ${mkt.regimeScore}`}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--muted)] mt-1">
        <span>Exubérance (vendre)</span>
        <span>
          Score : {mkt.regimeScore > 0 ? '+' : ''}
          {mkt.regimeScore} / 10
        </span>
        <span>Capitulation (acheter)</span>
      </div>
    </div>
  );
}

export default function MarketSynthesis() {
  const { store } = usePortfolio();
  const { fearGreedData, hyObs } = useMacro();

  const fearGreed = fearGreedData?.score ?? null;
  const hySpread = useMemo(() => {
    if (!hyObs) return null;
    const latest = hyObs.find((o) => o.value !== '.');
    if (!latest) return null;
    const parsed = parseFloat(latest.value);
    return Number.isFinite(parsed) ? parsed : null;
  }, [hyObs]);

  const mkt = useMemo(
    () => buildMarketContext(store, fearGreed, hySpread),
    [store, fearGreed, hySpread],
  );

  const availableSignals = [mkt.vixLevel, fearGreed, hySpread].filter((v) => v != null).length;
  const hasEnoughData = availableSignals >= 2;

  const color = regimeColor(mkt.regime);
  const contrarianLabel = regimeContrarianLabel(mkt.regime);
  const action = getRegimeAction(mkt.regime);

  const vixInfo = vixSubLabel(mkt.vixLevel);
  const fgInfo = fearGreedSubLabel(fearGreed);
  const hyInfo = hySubLabel(hySpread);

  return (
    <div className="data-card p-5 md:p-6 3xl:p-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] font-semibold mb-2">
            Temps de marché
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {hasEnoughData ? (
              <>
                <span
                  className="text-lg md:text-xl font-bold px-3 py-1.5 rounded-full"
                  style={{ background: `${color}20`, color }}
                >
                  {mkt.regime}
                </span>
                <span className="text-sm text-[var(--muted)]">{contrarianLabel}</span>
              </>
            ) : (
              <span className="text-sm text-[var(--muted)] italic">
                Données insuffisantes pour établir un régime de marché.
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-3 w-full lg:w-auto">
          <IndicatorTile
            label="VIX"
            value={mkt.vixLevel != null ? mkt.vixLevel.toFixed(1) : '--'}
            subLabel={vixInfo.text}
            color={vixInfo.color}
          />
          <IndicatorTile
            label="Fear & Greed"
            value={fearGreed != null ? Math.round(fearGreed).toString() : '--'}
            subLabel={fgInfo.text}
            color={fgInfo.color}
          />
          <IndicatorTile
            label="HY Spread"
            value={hySpread != null ? `${hySpread.toFixed(2)}%` : '--'}
            subLabel={hyInfo.text}
            color={hyInfo.color}
          />
        </div>
      </div>

      {hasEnoughData && <ScoreBar mkt={mkt} />}

      {hasEnoughData && (
        <div className="mt-5 rounded-xl border p-4" style={{ borderColor: `${color}40`, background: `${color}10` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color }}>
              Démarche à suivre
            </span>
          </div>
          <div className="font-semibold text-base md:text-lg mb-1" style={{ color }}>
            {action.headline}
          </div>
          <div className="text-xs md:text-sm text-[var(--muted)] mb-3">{action.posture}</div>
          <ol className="space-y-2 text-sm">
            {action.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-2">
                <span
                  className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold"
                  style={{ background: `${color}30`, color }}
                >
                  {i + 1}
                </span>
                <span className="text-[var(--text)]">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {hasEnoughData && mkt.regimeReasons.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] font-semibold mb-2">
            Diagnostic des indicateurs
          </div>
          <ul className="text-xs md:text-sm text-[var(--muted)] space-y-1.5 list-none">
            {mkt.regimeReasons.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <span
                  className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
