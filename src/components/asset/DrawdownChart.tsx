'use client';

import { Line } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { ProcessedAsset, AssetConfig } from '@/lib/types';
import Card from '@/components/ui/Card';

export default function DrawdownChart({ data, config }: { data: ProcessedAsset; config: AssetConfig }) {
  const s = data.series;
  const dd = data.drawdown ?? [];
  const currentDD = dd.length ? dd[dd.length - 1] : null;
  const maxDD = dd.reduce<number | null>((min, v) => {
    if (v == null) return min;
    if (min == null) return v;
    return v < min ? v : min;
  }, null);

  return (
    <>
      <Card title="Drawdown depuis le plus haut">
        <div className="relative h-[350px] w-full">
          <Line
            data={{
              datasets: [
                {
                  label: 'Drawdown',
                  data: s.map((x, i) => ({ x: x.dateObj.getTime(), y: dd[i] ?? null })),
                  borderColor: '#ef4444',
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  borderWidth: 1.5,
                  pointRadius: 0,
                  fill: true,
                  tension: 0.1,
                },
                {
                  label: 'Max Drawdown',
                  data: s.map((x) => ({ x: x.dateObj.getTime(), y: maxDD })),
                  borderColor: 'rgba(239,68,68,0.4)',
                  borderWidth: 1,
                  pointRadius: 0,
                  fill: false,
                  borderDash: [4, 4],
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: { position: 'top' },
                tooltip: {
                  backgroundColor: 'rgba(26,29,39,0.95)',
                  borderColor: '#2e3347',
                  borderWidth: 1,
                  callbacks: {
                    label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(2)}%`,
                  },
                },
              },
              scales: {
                x: { type: 'time', time: { unit: 'month', tooltipFormat: 'dd/MM/yyyy' }, grid: { display: false } },
                y: {
                  max: 0,
                  grid: { color: 'rgba(46,51,71,0.5)' },
                  title: { display: true, text: 'Drawdown (%)' },
                  ticks: { callback: (v: string | number) => `${v}%` },
                },
              },
            } as never}
          />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2">Drawdown actuel</div>
          <div className={`text-[22px] font-bold ${currentDD != null && currentDD < -5 ? 'text-[#ef4444]' : 'text-[var(--text)]'}`}>
            {currentDD != null ? `${currentDD.toFixed(2)}%` : '--'}
          </div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2">Drawdown maximum</div>
          <div className="text-[22px] font-bold text-[#ef4444]">
            {maxDD != null ? `${maxDD.toFixed(2)}%` : '--'}
          </div>
        </div>
      </div>
    </>
  );
}
