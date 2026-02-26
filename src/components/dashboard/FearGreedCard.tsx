'use client';

import { useMacro } from '@/context/MacroContext';

function getRatingLabel(score: number): string {
  if (score <= 25) return 'Peur extreme';
  if (score <= 45) return 'Peur';
  if (score <= 55) return 'Neutre';
  if (score <= 75) return 'Avidite';
  return 'Avidite extreme';
}

function getRatingColor(score: number): string {
  if (score <= 25) return '#ef4444';
  if (score <= 45) return '#f97316';
  if (score <= 55) return '#eab308';
  if (score <= 75) return '#84cc16';
  return '#10b981';
}

export default function FearGreedCard() {
  const { fearGreedData: data, fearGreedError: error } = useMacro();

  const score = data?.score ?? null;
  const color = score != null ? getRatingColor(score) : 'var(--muted)';
  const label = score != null ? getRatingLabel(score) : '--';
  const prevClose = data?.previous_close ?? null;
  const delta = score != null && prevClose != null ? score - prevClose : null;

  return (
    <div className="data-card p-5">
      <div className="text-xs text-[var(--muted)] mb-2 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#8b5cf6' }} aria-hidden="true" />
        Fear &amp; Greed Index
      </div>
      {error ? (
        <div className="text-[var(--muted)] text-sm">Indisponible</div>
      ) : score == null ? (
        <div className="text-[28px] font-bold text-[var(--muted)]" aria-label="Chargement en cours">--</div>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <span className="text-[28px] font-bold" style={{ color }} aria-label={`Score ${Math.round(score)} sur 100`}>
              {Math.round(score)}
            </span>
            <span className="text-sm text-[var(--muted)] mb-1" aria-hidden="true">/ 100</span>
          </div>
          <div
            className="w-full h-2 rounded-full bg-[var(--border)] mt-2 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(score)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Fear & Greed: ${label}`}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${score}%`, background: color }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-[13px] font-medium"
              style={{ color: delta != null && delta > 0 ? '#10b981' : delta != null && delta < 0 ? '#ef4444' : 'var(--muted)' }}
            >
              {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(0)} pts` : ''}
            </span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: `${color}20`, color }}
            >
              {label}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
