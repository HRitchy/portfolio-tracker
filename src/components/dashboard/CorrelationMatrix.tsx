'use client';

import { useMemo } from 'react';
import { Store } from '@/lib/types';
import { ASSETS, PORTFOLIO_KEYS } from '@/lib/config';
import Card from '@/components/ui/Card';

function calcCorrelation(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 10) return null;
  const sliceA = a.slice(-n);
  const sliceB = b.slice(-n);

  const meanA = sliceA.reduce((s, v) => s + v, 0) / n;
  const meanB = sliceB.reduce((s, v) => s + v, 0) / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = sliceA[i] - meanA;
    const db = sliceB[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return null;
  return cov / denom;
}

function corrColor(v: number): string {
  if (v >= 0.7) return 'var(--success)';
  if (v >= 0.3) return '#34d399';
  if (v > -0.3) return 'var(--muted)';
  if (v > -0.7) return '#f97316';
  return 'var(--danger)';
}

function corrBg(v: number): string {
  if (v >= 0.7) return 'var(--success-soft)';
  if (v >= 0.3) return 'rgba(52,211,153,0.1)';
  if (v > -0.3) return 'var(--panel-hover)';
  if (v > -0.7) return 'rgba(249,115,22,0.1)';
  return 'var(--danger-soft)';
}

export default function CorrelationMatrix({ store }: { store: Store }) {
  const returns = useMemo(() => {
    const result: Record<string, number[]> = {};
    for (const key of PORTFOLIO_KEYS) {
      const d = store[key];
      if (!d?.series?.length) continue;
      const ret: number[] = [];
      for (let i = 1; i < d.series.length; i++) {
        const prev = d.series[i - 1].close;
        if (prev > 0) ret.push((d.series[i].close - prev) / prev);
      }
      result[key] = ret;
    }
    return result;
  }, [store]);

  const keys = PORTFOLIO_KEYS.filter((k) => returns[k]?.length > 0);
  if (keys.length < 2) return null;

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number | null>> = {};
    for (const a of keys) {
      m[a] = {};
      for (const b of keys) {
        if (a === b) m[a][b] = 1;
        else m[a][b] = calcCorrelation(returns[a], returns[b]);
      }
    }
    return m;
  }, [keys, returns]);

  return (
    <Card title="Matrice de correlation (rendements quotidiens)">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-[11px] text-[var(--muted)] uppercase tracking-wide" />
              {keys.map((k) => (
                <th key={k} className="px-3 py-2 text-center text-[11px] text-[var(--muted)] uppercase tracking-wide font-semibold">
                  {ASSETS[k].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((a) => (
              <tr key={a}>
                <td className="px-3 py-2 text-[13px] font-semibold whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: ASSETS[a].color }} />
                  {ASSETS[a].name}
                </td>
                {keys.map((b) => {
                  const v = matrix[a]?.[b];
                  const isDiag = a === b;
                  return (
                    <td
                      key={b}
                      className="px-3 py-2 text-center text-[13px] font-bold rounded-lg"
                      style={{
                        color: isDiag ? 'var(--muted)' : v != null ? corrColor(v) : 'var(--muted)',
                        background: isDiag ? 'transparent' : v != null ? corrBg(v) : 'transparent',
                      }}
                    >
                      {v != null ? (isDiag ? '1.00' : v.toFixed(2)) : '--'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-[var(--muted)]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm" style={{ background: 'var(--success-soft)' }} /> Forte correlation
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm" style={{ background: 'var(--panel-hover)' }} /> Faible
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm" style={{ background: 'var(--danger-soft)' }} /> Inverse
        </span>
      </div>
    </Card>
  );
}
