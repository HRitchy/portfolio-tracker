'use client';

import { useMacro } from '@/context/MacroContext';

// Seuils alignés sur la table de référence :
//   Panique 0-24, Stress 25-44, (Transition 45-55), Calme 56-75, Euphorie 76-100
function getRatingLabel(score: number): string {
  if (score >= 76) return 'Euphorie';
  if (score >= 56) return 'Calme';
  if (score >= 45) return 'Transition';
  if (score >= 25) return 'Stress';
  return 'Panique';
}

function getRatingColor(score: number): string {
  if (score >= 76) return '#10b981';  // Euphorie
  if (score >= 56) return '#eab308';  // Calme
  if (score >= 45) return '#94a3b8';  // Transition (gris)
  if (score >= 25) return '#f97316';  // Stress
  return '#ef4444';                    // Panique
}

function GaugeArc({ score, color }: { score: number; color: string }) {
  const radius = 50;
  const stroke = 8;
  const cx = 60;
  const cy = 55;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const totalArc = endAngle - startAngle;
  const scoreAngle = startAngle + (score / 100) * totalArc;

  const arcPath = (start: number, end: number) => {
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const needleX = cx + (radius - 12) * Math.cos(scoreAngle);
  const needleY = cy + (radius - 12) * Math.sin(scoreAngle);

  return (
    <svg viewBox="0 0 120 65" className="w-full max-w-[160px] mx-auto" aria-hidden="true">
      <path
        d={arcPath(startAngle, endAngle)}
        fill="none"
        stroke="var(--border)"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d={arcPath(startAngle, scoreAngle)}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <circle cx={needleX} cy={needleY} r={4} fill={color} />
      <text x={cx} y={cy + 2} textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">
        {Math.round(score)}
      </text>
    </svg>
  );
}

export default function FearGreedCard() {
  const { fearGreedData: data, fearGreedError: error } = useMacro();

  const score = data?.score ?? null;
  const color = score != null ? getRatingColor(score) : 'var(--muted)';
  const label = score != null ? getRatingLabel(score) : '--';
  const prevClose = data?.previous_close ?? null;
  const delta = score != null && prevClose != null ? score - prevClose : null;

  return (
    <div className="data-card p-4 md:p-5 3xl:p-6">
      <div className="text-[11px] md:text-xs text-[var(--muted)] mb-2 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: '#8b5cf6' }} aria-hidden="true" />
        Fear &amp; Greed Index
      </div>
      {error ? (
        <div className="text-[var(--muted)] text-sm">Indisponible</div>
      ) : score == null ? (
        <div className="text-2xl md:text-[28px] font-bold text-[var(--muted)]" aria-label="Chargement en cours">--</div>
      ) : (
        <>
          <GaugeArc score={score} color={color} />
          <div className="flex items-center justify-center gap-2 mt-1">
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
