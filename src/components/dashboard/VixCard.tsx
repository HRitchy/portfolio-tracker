'use client';

import { usePortfolio } from '@/context/PortfolioContext';

// Seuils alignés sur la table de référence : Panique >30, Stress 20-30, Calme 15-20, Euphorie <15
function getVixColor(v: number): string {
  if (v > 30) return '#ef4444';   // Panique
  if (v >= 20) return '#f97316';  // Stress
  if (v >= 15) return '#eab308';  // Calme
  return '#10b981';                // Euphorie
}

function getVixLabel(v: number): string {
  if (v > 30) return 'Panique';
  if (v >= 20) return 'Stress';
  if (v >= 15) return 'Calme';
  return 'Euphorie';
}

export default function VixCard() {
  const { store, errors, loading } = usePortfolio();
  const vix = store.vix ?? null;
  const series = vix?.series ?? [];
  const latest = series.length ? series[series.length - 1] : null;
  const prev = series.length >= 2 ? series[series.length - 2] : null;
  const val = latest?.close ?? null;
  const delta = val != null && prev ? val - prev.close : null;

  const color = val != null ? getVixColor(val) : 'var(--muted)';
  const label = val != null ? getVixLabel(val) : '--';
  const hasError = errors.vix && val == null;

  return (
    <div className="data-card p-4 md:p-5 3xl:p-6">
      <div className="text-[11px] md:text-xs text-[var(--muted)] mb-2 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: '#ef4444' }} aria-hidden="true" />
        VIX — Volatilité S&amp;P 500
      </div>
      {hasError ? (
        <div className="text-[var(--muted)] text-sm">Indisponible</div>
      ) : val == null ? (
        <div className="text-2xl md:text-[28px] font-bold text-[var(--muted)]" aria-label={loading ? 'Chargement en cours' : 'Donnée en attente'}>--</div>
      ) : (
        <>
          <div
            className="text-2xl md:text-[28px] 3xl:text-[32px] font-bold"
            style={{ color }}
            aria-label={`VIX: ${val.toFixed(2)}, ${label}`}
          >
            {val.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[13px] font-medium"
              style={{ color: delta != null && delta > 0 ? '#ef4444' : delta != null && delta < 0 ? '#10b981' : 'var(--muted)' }}
            >
              {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(2)}` : ''}
            </span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: `${color}20`, color }}
            >
              {label}
            </span>
          </div>
          {latest?.date && (
            <div className="text-[11px] text-[var(--muted)] mt-1">{latest.date}</div>
          )}
        </>
      )}
    </div>
  );
}
