'use client';

import { useMemo } from 'react';
import Card from '@/components/ui/Card';
import { useMacro } from '@/context/MacroContext';
import {
  adviceTone,
  getAssetAdvice,
  getAssetClassLabel,
  getAdviceDescription,
  regimeColor,
  regimeContrarianLabel,
} from '@/lib/advice';
import { ASSETS } from '@/lib/config';
import { Store, MarketContext, AssetAdvice } from '@/lib/types';
import { fmtPct } from '@/lib/formatting';

function ConvictionScore({ conviction }: { conviction: AssetAdvice['conviction'] }) {
  return (
    <div className="text-[10px] text-[var(--muted)]" aria-label={`Niveau de conviction: ${conviction}`}>
      Conviction: <span className="font-semibold text-[var(--text)]">{conviction}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Market regime banner
   ───────────────────────────────────────────── */

function MarketRegimeBanner({ mkt }: { mkt: MarketContext }) {
  const color = regimeColor(mkt.regime);
  const label = regimeContrarianLabel(mkt.regime);

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 mb-4 bg-[var(--bg-soft)]/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-[0.16em] font-semibold mb-1">
            Lecture contrarienne du marché
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold px-3 py-1 rounded-full"
              style={{ background: `${color}20`, color }}
            >
              {mkt.regime}
            </span>
            <span className="text-xs text-[var(--muted)]">{label}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {mkt.fearGreed != null && (
            <div className="text-center">
              <div className="text-[10px] text-[var(--muted)] uppercase">F&amp;G</div>
              <div className="font-bold text-sm">{Math.round(mkt.fearGreed)}</div>
            </div>
          )}
          {mkt.vixLevel != null && (
            <div className="text-center">
              <div className="text-[10px] text-[var(--muted)] uppercase">VIX</div>
              <div className="font-bold text-sm">{mkt.vixLevel.toFixed(1)}</div>
            </div>
          )}
          {mkt.hySpread != null && (
            <div className="text-center">
              <div className="text-[10px] text-[var(--muted)] uppercase">HY Spread</div>
              <div className="font-bold text-sm">{mkt.hySpread.toFixed(2)}%</div>
            </div>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div
        className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden mb-2"
        role="progressbar"
        aria-valuenow={mkt.regimeScore}
        aria-valuemin={-10}
        aria-valuemax={10}
        aria-label={`Score de regime: ${mkt.regimeScore}`}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${((mkt.regimeScore + 10) / 20) * 100}%`,
            background: color,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--muted)]">
        <span>Exubérance (vendre)</span>
        <span>Score: {mkt.regimeScore > 0 ? '+' : ''}{mkt.regimeScore}</span>
        <span>Capitulation (acheter)</span>
      </div>

      {/* Macro reasons */}
      {mkt.regimeReasons.length > 0 && (
        <ul className="mt-3 text-xs text-[var(--muted)] space-y-1 list-none">
          {mkt.regimeReasons.map((r) => (
            <li key={r} className="flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Metric pill
   ───────────────────────────────────────────── */

function MetricPill({ label, value }: { label: string; value: string }) {
  const pillColor = 'bg-[var(--panel-hover)] text-[var(--muted)]';

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${pillColor}`}>
      <span className="opacity-70">{label}</span> {value}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Single asset advice card
   ───────────────────────────────────────────── */

function AssetAdviceCard({ item }: { item: AssetAdvice }) {
  const cfg = ASSETS[item.key];
  const m = item.metrics;
  const toneClass = adviceTone(item.advice);

  return (
    <article className="rounded-xl border border-[var(--border)] p-4 bg-[var(--bg-soft)]/30">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">{getAssetClassLabel(item.key)}</div>
          <div className="font-semibold">{cfg.name}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${toneClass}`}>
            {item.advice}
          </span>
          <ConvictionScore conviction={item.conviction} />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--muted)] mb-3">{getAdviceDescription(item.advice)}</p>

      {/* Key metrics row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {m.drawdown != null && (
          <MetricPill
            label="Drawdown"
            value={`${m.drawdown.toFixed(1)}%`}
          />
        )}
        {m.rsi14 != null && (
          <MetricPill
            label="RSI14"
            value={m.rsi14.toFixed(0)}
          />
        )}
        {m.distFromMA200Pct != null && (
          <MetricPill
            label="vs MM200"
            value={fmtPct(m.distFromMA200Pct)}
          />
        )}
        {m.perf30d != null && (
          <MetricPill
            label="30j"
            value={fmtPct(m.perf30d)}
          />
        )}
        {m.volatility30d != null && (
          <MetricPill label="Vol 30j" value={`${m.volatility30d}%`} />
        )}
      </div>

      {/* Reasons */}
      <ul className="text-xs text-[var(--muted)] space-y-1 list-none mb-3">
        {item.reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-1.5">
            <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-[var(--muted)]" aria-hidden="true" />
            {reason}
          </li>
        ))}
      </ul>

      {/* Buffett maxim */}
      <div className="border-t border-[var(--border)] pt-2">
        <p className="text-[11px] italic text-[var(--muted)]">
          &laquo; {item.buffettMaxim} &raquo; — W. Buffett
        </p>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */

export default function AdviceOverview({ store }: { store: Store }) {
  const { fearGreedData, hyObs } = useMacro();

  const fearGreed = fearGreedData?.score ?? null;
  const hySpread = useMemo(() => {
    if (!hyObs) return null;
    const latest = hyObs.find((o) => o.value !== '.');
    if (!latest) return null;
    const parsed = parseFloat(latest.value);
    return Number.isFinite(parsed) ? parsed : null;
  }, [hyObs]);

  const { advices, marketContext } = useMemo(
    () => getAssetAdvice(store, fearGreed, hySpread),
    [store, fearGreed, hySpread]
  );

  return (
    <Card title="Stratégie contrarienne — Conseils à la Warren Buffett" className="mb-0">
      <MarketRegimeBanner mkt={marketContext} />

      <div className="rounded-xl border border-[var(--border)] p-4 mb-4 bg-[var(--bg-soft)]/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Recommandation */}
          <div>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-[0.16em] font-semibold mb-3">
              Recommandation
            </p>
            <ul className="space-y-2 list-none">
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-500 min-w-[80px] justify-center">
                  Achat
                </span>
                <span className="text-[var(--muted)]">≥ +4</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-500 min-w-[80px] justify-center">
                  Vente
                </span>
                <span className="text-[var(--muted)]">≤ −4</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--muted)]/15 text-[var(--muted)] min-w-[80px] justify-center">
                  Conservation
                </span>
                <span className="text-[var(--muted)]">−3 à +3</span>
              </li>
            </ul>
          </div>

          {/* Niveau de conviction */}
          <div>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-[0.16em] font-semibold mb-3">
              Niveau de conviction
            </p>
            <ul className="space-y-2 list-none">
              {[
                { label: 'Faible',      range: '< 4'       },
                { label: 'Moyenne',     range: 'de 4 à 6'  },
                { label: 'Forte',       range: 'de 7 à 9'  },
                { label: 'Très forte',  range: '≥ 10'      },
              ].map(({ label, range }) => (
                <li key={label} className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text)] w-[62px] shrink-0">{label}</span>
                  <span className="text-[var(--muted)]">{range}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {advices.map((item) => (
          <AssetAdviceCard key={item.key} item={item} />
        ))}
      </div>

      <p className="text-[10px] text-[var(--muted)] mt-4 text-center">
        Approche contrarienne inspirée de Warren Buffett. Ne constitue pas un conseil financier personnalisé.
      </p>
    </Card>
  );
}
