'use client';

import { useMemo } from 'react';
import { Store } from '@/lib/types';
import { useAssets } from '@/context/AssetsContext';
import { fmtPct } from '@/lib/formatting';
import { calcPerfFromCalendarDays } from '@/lib/calculations';
import Card from '@/components/ui/Card';

export default function PortfolioSummary({ store }: { store: Store }) {
  const { assets, portfolioKeys } = useAssets();
  const summary = useMemo(() => {
    const items = portfolioKeys.map((key) => {
      const d = store[key];
      const cfg = assets[key];
      if (!d?.series?.length || !cfg) return null;
      const perf1d = calcPerfFromCalendarDays(d.series, 1);
      const perf7d = calcPerfFromCalendarDays(d.series, 7);
      const perf30d = calcPerfFromCalendarDays(d.series, 30);
      const perf90d = calcPerfFromCalendarDays(d.series, 90);
      return { key, name: cfg.name, color: cfg.color, perf1d, perf7d, perf30d, perf90d };
    }).filter(Boolean) as { key: string; name: string; color: string; perf1d: number | null; perf7d: number | null; perf30d: number | null; perf90d: number | null }[];

    return items;
  }, [store, portfolioKeys, assets]);

  if (summary.length === 0) return null;

  const periods = [
    { label: '1J', field: 'perf1d' as const },
    { label: '1S', field: 'perf7d' as const },
    { label: '1M', field: 'perf30d' as const },
    { label: '3M', field: 'perf90d' as const },
  ];

  return (
    <Card title="Synthèse performance portefeuille">
      <p className="mb-3 text-xs text-[var(--muted)]">Les variations sont calculées en jours calendaires (1S = 7 jours, 1M = 30 jours, 3M = 90 jours).</p>
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
          </tbody>
        </table>
      </div>
    </Card>
  );
}
