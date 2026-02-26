'use client';

import { useMemo } from 'react';
import { Store } from '@/lib/types';
import { ASSETS, PORTFOLIO_KEYS } from '@/lib/config';
import { fmtPct } from '@/lib/formatting';
import Card from '@/components/ui/Card';

function calcPerf(prices: { close: number }[], daysBack: number): number | null {
  if (prices.length < daysBack + 1) return null;
  const recent = prices[prices.length - 1].close;
  const past = prices[prices.length - 1 - daysBack].close;
  if (past === 0) return null;
  return ((recent - past) / past) * 100;
}

export default function PortfolioSummary({ store }: { store: Store }) {
  const summary = useMemo(() => {
    const items = PORTFOLIO_KEYS.map((key) => {
      const d = store[key];
      if (!d?.series?.length) return null;
      const perf1d = calcPerf(d.series, 1);
      const perf7d = calcPerf(d.series, 5);
      const perf30d = calcPerf(d.series, 22);
      const perf90d = calcPerf(d.series, 66);
      return { key, name: ASSETS[key].name, color: ASSETS[key].color, perf1d, perf7d, perf30d, perf90d };
    }).filter(Boolean) as { key: string; name: string; color: string; perf1d: number | null; perf7d: number | null; perf30d: number | null; perf90d: number | null }[];

    return items;
  }, [store]);

  if (summary.length === 0) return null;

  const avgPerf = (field: 'perf1d' | 'perf7d' | 'perf30d' | 'perf90d') => {
    const vals = summary.map((s) => s[field]).filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const periods = [
    { label: '1J', field: 'perf1d' as const },
    { label: '1S', field: 'perf7d' as const },
    { label: '1M', field: 'perf30d' as const },
    { label: '3M', field: 'perf90d' as const },
  ];

  return (
    <Card title="Synthèse performance portefeuille">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-[11px] text-[var(--muted)] uppercase tracking-wide font-semibold border-b border-[var(--border)]">Actif</th>
              {periods.map((p) => (
                <th key={p.label} className="text-right px-3 py-2 text-[11px] text-[var(--muted)] uppercase tracking-wide font-semibold border-b border-[var(--border)]">{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((item) => (
              <tr key={item.key} className="hover:bg-[var(--panel-hover)] transition-colors">
                <td className="px-3 py-2.5 border-b border-[var(--border)] font-medium">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: item.color }} />
                  {item.name}
                </td>
                {periods.map((p) => {
                  const v = item[p.field];
                  const color = v == null ? 'text-[var(--muted)]' : v >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]';
                  return (
                    <td key={p.label} className={`px-3 py-2.5 border-b border-[var(--border)] text-right font-semibold ${color}`}>
                      {v != null ? fmtPct(v) : '--'}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-[var(--panel-hover)]/50">
              <td className="px-3 py-2.5 font-bold text-[var(--text)]">Moyenne</td>
              {periods.map((p) => {
                const v = avgPerf(p.field);
                const color = v == null ? 'text-[var(--muted)]' : v >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]';
                return (
                  <td key={p.label} className={`px-3 py-2.5 text-right font-bold ${color}`}>
                    {v != null ? fmtPct(v) : '--'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
