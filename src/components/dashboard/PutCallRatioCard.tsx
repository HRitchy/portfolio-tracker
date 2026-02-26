'use client';

import { useMacro, type PutCallSource } from '@/context/MacroContext';

function getRatioColor(v: number): string {
  if (v >= 1.2) return '#10b981';
  if (v >= 1.0) return '#34d399';
  if (v >= 0.7) return '#eab308';
  if (v >= 0.5) return '#f97316';
  return '#ef4444';
}

function getRatioLabel(v: number): string {
  if (v >= 1.2) return 'Peur extrême';
  if (v >= 1.0) return 'Sentiment baissier';
  if (v >= 0.7) return 'Neutre';
  if (v >= 0.5) return 'Complaisance';
  return 'Complaisance extrême';
}

function sourceLabel(source: PutCallSource | null): string | null {
  switch (source) {
    case 'cboe':
      return 'Source: CBOE (officiel)';
    case 'cboe_page':
      return 'Source: CBOE page (officiel)';
    case 'fred_api':
      return 'Source: FRED API (peut être décalé)';
    case 'fred_csv':
      return 'Source: FRED CSV (peut être décalé)';
    case 'static_fallback':
      return 'Source: fallback interne (non live)';
    default:
      return null;
  }
}

export default function PutCallRatioCard() {
  const { pcrObs: obs, pcrSource, putCallRatioError: error } = useMacro();

  const latestIdx = obs?.findIndex((o) => o.value !== '.' && o.value !== '') ?? -1;
  const latest = latestIdx >= 0 ? obs![latestIdx] : null;
  const valRaw = latest ? parseFloat(latest.value) : NaN;
  const val = Number.isFinite(valRaw) ? valRaw : null;
  const prev = latestIdx >= 0
    ? obs?.find((o, i) => i > latestIdx && o.value !== '.' && o.value !== '') ?? null
    : null;
  const prevValRaw = prev ? parseFloat(prev.value) : NaN;
  const prevVal = Number.isFinite(prevValRaw) ? prevValRaw : null;
  const delta = val != null && prevVal != null ? val - prevVal : null;

  return (
    <div className="data-card p-5">
      <div className="text-xs text-[var(--muted)] mb-2 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} aria-hidden="true" />
        Put/Call Ratio (CBOE)
      </div>
      {error ? (
        <div className="text-[var(--muted)] text-sm">Indisponible</div>
      ) : val == null ? (
        <div className="text-[28px] font-bold text-[var(--muted)]" aria-label="Chargement en cours">--</div>
      ) : (
        <>
          <div
            className="text-[28px] font-bold"
            style={{ color: getRatioColor(val) }}
            aria-label={`Put/Call Ratio: ${val.toFixed(2)}, ${getRatioLabel(val)}`}
          >
            {val.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[13px] font-medium"
              style={{
                color: delta != null && delta > 0 ? '#10b981' : delta != null && delta < 0 ? '#ef4444' : 'var(--muted)',
              }}
            >
              {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(2)}` : ''}
            </span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: `${getRatioColor(val)}20`, color: getRatioColor(val) }}
            >
              {getRatioLabel(val)}
            </span>
          </div>
          {(latest?.date || pcrSource) && (
            <div className="text-[11px] text-[var(--muted)] mt-1">
              {latest?.date ?? ''}
              {latest?.date && pcrSource ? ' • ' : ''}
              {sourceLabel(pcrSource) ?? ''}
            </div>
          )}
        </>
      )}
    </div>
  );
}
