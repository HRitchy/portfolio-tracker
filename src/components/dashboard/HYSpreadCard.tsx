'use client';

import { useMacro } from '@/context/MacroContext';

function getSpreadColor(v: number): string {
  if (v >= 5) return '#ef4444';
  if (v >= 4) return '#f59e0b';
  return '#10b981';
}

function getSpreadLabel(v: number): string {
  if (v >= 5) return 'Stress eleve';
  if (v >= 4) return 'Vigilance';
  return 'Normal';
}

export default function HYSpreadCard() {
  const { hyObs: obs, hySpreadError: error } = useMacro();

  const latest = obs?.find((o) => o.value !== '.');
  const val = latest ? parseFloat(latest.value) : null;
  const prev = obs && obs.length >= 2 ? obs.find((o, i) => i > 0 && o.value !== '.') : null;
  const prevVal = prev ? parseFloat(prev.value) : null;
  const delta = val != null && prevVal != null ? val - prevVal : null;

  return (
    <div className="data-card p-5">
      <div className="text-xs text-[var(--muted)] mb-2 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} aria-hidden="true" />
        HY Spread (ICE BofA)
      </div>
      {error ? (
        <div className="text-[var(--muted)] text-sm">Indisponible</div>
      ) : val == null ? (
        <div className="text-[28px] font-bold text-[var(--muted)]" aria-label="Chargement en cours">--</div>
      ) : (
        <>
          <div
            className="text-[28px] font-bold"
            style={{ color: getSpreadColor(val) }}
            aria-label={`HY Spread: ${val.toFixed(2)} pourcent, ${getSpreadLabel(val)}`}
          >
            {val.toFixed(2)}%
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[13px] font-medium"
              style={{ color: delta != null && delta > 0 ? '#ef4444' : delta != null && delta < 0 ? '#10b981' : 'var(--muted)' }}
            >
              {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(2)} pp` : ''}
            </span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: `${getSpreadColor(val)}20`, color: getSpreadColor(val) }}
            >
              {getSpreadLabel(val)}
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
