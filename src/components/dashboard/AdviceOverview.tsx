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
import { useAssets } from '@/context/AssetsContext';
import { Store, AssetConfig, MarketContext, AssetAdvice } from '@/lib/types';
import { fmtPct } from '@/lib/formatting';

function ConvictionScore({
  advice,
  conviction,
}: {
  advice: AssetAdvice['advice'];
  conviction: AssetAdvice['conviction'];
}) {
  if (advice === 'Conserver') return null;

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

function MetricPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const pillColor = highlight
    ? 'bg-[var(--success-soft)] text-[var(--success)]'
    : 'bg-[var(--panel-hover)] text-[var(--muted)]';

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${pillColor}`}>
      <span className="opacity-70">{label}</span> {value}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Single asset advice card
   ───────────────────────────────────────────── */

function AssetAdviceCard({ item, assetConfig }: { item: AssetAdvice; assetConfig?: AssetConfig }) {
  const m = item.metrics;
  const toneClass = adviceTone(item.advice);

  return (
    <article
      className="rounded-xl border p-4 border-[var(--border)] bg-[var(--bg-soft)]/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            {assetConfig?.assetClass ?? ''}
          </div>
          <div className="font-semibold">
            {assetConfig?.name ?? item.key}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${toneClass}`}>
            {item.advice}
          </span>
          <ConvictionScore advice={item.advice} conviction={item.conviction} />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm mb-3 text-[var(--muted)]">
        {getAdviceDescription(item.advice)}
      </p>

      {/* Key metrics row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {m.drawdown != null && (
          <MetricPill
            label="Drawdown"
            value={`${m.drawdown.toFixed(1)}%`}
            highlight={false}
          />
        )}
        {m.rsi14 != null && (
          <MetricPill
            label="RSI14"
            value={m.rsi14.toFixed(0)}
            highlight={false}
          />
        )}
        {m.distFromMA200Pct != null && (
          <MetricPill
            label="vs MM200"
            value={fmtPct(m.distFromMA200Pct)}
            highlight={false}
          />
        )}
        {m.perf30d != null && (
          <MetricPill
            label="30j"
            value={fmtPct(m.perf30d)}
            highlight={false}
          />
        )}
        {m.volatility30d != null && (
          <MetricPill label="Vol 30j" value={`${m.volatility30d}%`} highlight={false} />
        )}
      </div>

      {/* Reasons */}
      <ul className="text-xs space-y-1 list-none mb-3 text-[var(--muted)]">
        {item.reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-1.5">
            <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-[var(--muted)]" aria-hidden="true" />
            {reason}
          </li>
        ))}
      </ul>

      {/* Citation contrarienne */}
      <div className="border-t pt-2 border-[var(--border)]">
        <p className="text-[11px] italic text-[var(--muted)]">
          &laquo; {item.contrarianQuote} &raquo;
        </p>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */

export default function AdviceOverview({ store }: { store: Store }) {
  const { assets, portfolioKeys } = useAssets();
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
    () => getAssetAdvice(store, portfolioKeys, assets, fearGreed, hySpread),
    [store, portfolioKeys, assets, fearGreed, hySpread]
  );

  return (
    <Card className="mb-0">
      <MarketRegimeBanner mkt={marketContext} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 3xl:gap-5">
        {advices.map((item) => (
          <AssetAdviceCard key={item.key} item={item} assetConfig={assets[item.key]} />
        ))}
      </div>
    </Card>
  );
}
