'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { chartOpts } from '@/lib/chartSetup';
import { ProcessedAsset, AssetKey } from '@/lib/types';
import Card from '@/components/ui/Card';

export default function RSIChart({ data, assetKey: _assetKey }: { data: ProcessedAsset; assetKey: AssetKey }) {
  void _assetKey;
  const s = data.series;
  const r7 = data.rsi7 ? data.rsi7[data.rsi7.length - 1] : null;
  const r14 = data.rsi14 ? data.rsi14[data.rsi14.length - 1] : null;
  const r28 = data.rsi28 ? data.rsi28[data.rsi28.length - 1] : null;

  const chartData = useMemo(() => ({
    datasets: [
      { label: 'Court (7)', data: s.map((x, i) => ({ x: x.dateObj.getTime(), y: data.rsi7?.[i] ?? null })), borderColor: '#3b82f6', borderWidth: 1.5, pointRadius: 0, fill: false },
      { label: 'Moyen (14)', data: s.map((x, i) => ({ x: x.dateObj.getTime(), y: data.rsi14?.[i] ?? null })), borderColor: '#8b5cf6', borderWidth: 2, pointRadius: 0, fill: false },
      { label: 'Long Terme (28)', data: s.map((x, i) => ({ x: x.dateObj.getTime(), y: data.rsi28?.[i] ?? null })), borderColor: '#ec4899', borderWidth: 1.5, pointRadius: 0, fill: false },
      { label: 'Suracheté (70)', data: s.map((x) => ({ x: x.dateObj.getTime(), y: 70 })), borderColor: 'rgba(239,68,68,0.3)', borderWidth: 1, pointRadius: 0, fill: false, borderDash: [4, 4] },
      { label: 'Survendu (30)', data: s.map((x) => ({ x: x.dateObj.getTime(), y: 30 })), borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1, pointRadius: 0, fill: false, borderDash: [4, 4] },
    ],
  }), [s, data.rsi7, data.rsi14, data.rsi28]);

  const baseOptions = chartOpts('RSI');

  return (
    <>
      <Card title="RSI - Court (7) / Moyen (14) / Long Terme (28)">
        <div className="relative h-[350px] w-full">
          <Line
            data={chartData}
            options={{
              ...baseOptions,
              interaction: { mode: 'index', intersect: false },
              plugins: { ...baseOptions.plugins, tooltip: { ...baseOptions.plugins?.tooltip } },
              scales: {
                x: baseOptions.scales?.x,
                y: { ...baseOptions.scales?.y, min: 0, max: 100 },
              },
            } as never}
          />
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2">RSI Court (7j)</div>
          <div className="text-[22px] font-bold">{r7 != null ? Number(r7).toFixed(2) : '--'}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2">RSI Moyen (14j)</div>
          <div className="text-[22px] font-bold">{r14 != null ? Number(r14).toFixed(2) : '--'}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2">RSI Long Terme (28j)</div>
          <div className="text-[22px] font-bold">{r28 != null ? Number(r28).toFixed(2) : '--'}</div>
        </div>
      </div>
    </>
  );
}
