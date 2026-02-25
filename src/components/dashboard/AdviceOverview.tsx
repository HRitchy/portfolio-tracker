'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import {
  getAssetAdvice,
  getAssetClassLabel,
  getAdviceDescription,
  adviceTone,
  adviceBorderColor,
  convictionLevel,
  regimeColor,
  regimeContrarianLabel,
} from '@/lib/advice';
import { ASSETS } from '@/lib/config';
import { Store, MarketContext, AssetAdvice, Conviction } from '@/lib/types';
import { fmtPct } from '@/lib/formatting';

/* ─────────────────────────────────────────────
   Hooks to fetch macro data for the advice engine
   ───────────────────────────────────────────── */

function useFearGreed(): number | null {
  const [score, setScore] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/feargreed', { signal: AbortSignal.timeout(20000) })
      .then((r) => r.json())
      .then((d) => setScore(d.fear_and_greed?.score ?? null))
      .catch(() => {});
  }, []);
  return score;
}

function useHYSpread(): number | null {
  const [spread, setSpread] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/fred', { signal: AbortSignal.timeout(20000) })
      .then((r) => r.json())
      .then((d) => {
        const obs = d.observations ?? [];
        const latest = obs.find((o: { value: string }) => o.value !== '.');
        if (latest) setSpread(parseFloat(latest.value));
      })
      .catch(() => {});
  }, []);
  return spread;
}

/* ─────────────────────────────────────────────
   Conviction dots component
   ───────────────────────────────────────────── */

function ConvictionDots({ conviction, advice }: { conviction: Conviction; advice: string }) {
  const level = convictionLevel(conviction);
  const activeColor =
    advice === 'Achat' ? 'bg-emerald-500' :
    advice === 'Vente' ? 'bg-red-500' :
    'bg-yellow-500';

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-all ${
            i <= level ? activeColor : 'bg-[var(--border)]'
          }`}
        />
      ))}
      <span className="text-[10px] text-[var(--muted)] ml-1">{conviction}</span>
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
            Lecture contrarienne du marche
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
      <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${((mkt.regimeScore + 10) / 20) * 100}%`,
            background: color,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--muted)]">
        <span>Exuberance (vendre)</span>
        <span>Score: {mkt.regimeScore > 0 ? '+' : ''}{mkt.regimeScore}</span>
        <span>Capitulation (acheter)</span>
      </div>

      {/* Macro reasons */}
      {mkt.regimeReasons.length > 0 && (
        <ul className="mt-3 text-xs text-[var(--muted)] space-y-1 list-none">
          {mkt.regimeReasons.map((r) => (
            <li key={r} className="flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: color }} />
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

function MetricPill({ label, value, highlight }: { label: string; value: string; highlight?: 'good' | 'bad' | 'neutral' }) {
  const pillColor =
    highlight === 'good' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
    highlight === 'bad' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
    'bg-[var(--panel-hover)] text-[var(--muted)]';

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

  return (
    <div className={`rounded-xl border ${adviceBorderColor(item.advice)} p-4 bg-[var(--bg-soft)]/30`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">{getAssetClassLabel(item.key)}</div>
          <div className="font-semibold">{cfg.name}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`text-xs font-semibold px-3 py-1 rounded-full ${adviceTone(item.advice)}`}>
            {item.advice}
          </div>
          <ConvictionDots conviction={item.conviction} advice={item.advice} />
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
            highlight={m.drawdown <= -15 ? 'good' : m.drawdown > -3 ? 'bad' : 'neutral'}
          />
        )}
        {m.rsi14 != null && (
          <MetricPill
            label="RSI14"
            value={m.rsi14.toFixed(0)}
            highlight={m.rsi14 < 35 ? 'good' : m.rsi14 > 70 ? 'bad' : 'neutral'}
          />
        )}
        {m.distFromMA200Pct != null && (
          <MetricPill
            label="vs MM200"
            value={fmtPct(m.distFromMA200Pct)}
            highlight={m.distFromMA200Pct <= -10 ? 'good' : m.distFromMA200Pct >= 20 ? 'bad' : 'neutral'}
          />
        )}
        {m.perf30d != null && (
          <MetricPill
            label="30j"
            value={fmtPct(m.perf30d)}
            highlight={m.perf30d <= -10 ? 'good' : m.perf30d >= 20 ? 'bad' : 'neutral'}
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
            <span className={`mt-1 shrink-0 w-1 h-1 rounded-full ${
              item.advice === 'Achat' ? 'bg-emerald-500' :
              item.advice === 'Vente' ? 'bg-red-500' :
              'bg-yellow-500'
            }`} />
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
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */

export default function AdviceOverview({ store }: { store: Store }) {
  const fearGreed = useFearGreed();
  const hySpread = useHYSpread();

  const { advices, marketContext } = getAssetAdvice(store, fearGreed, hySpread);

  return (
    <Card title="Strategie contrarienne — Conseils a la Warren Buffett" className="mb-0">
      <MarketRegimeBanner mkt={marketContext} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {advices.map((item) => (
          <AssetAdviceCard key={item.key} item={item} />
        ))}
      </div>

      <p className="text-[10px] text-[var(--muted)] mt-4 text-center">
        Approche contrarienne inspiree de Warren Buffett. Ne constitue pas un conseil financier personnalise.
      </p>
    </Card>
  );
}
