'use client';

import { Line } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { chartOpts } from '@/lib/chartSetup';
import { Store } from '@/lib/types';
import { ASSETS, PORTFOLIO_KEYS } from '@/lib/config';
import Card from '@/components/ui/Card';

export default function PerformanceChart({ store }: { store: Store }) {
  const datasets = PORTFOLIO_KEYS.map((key) => {
    const d = store[key];
    if (!d || !d.series.length) return null;
    const base = d.series[0].close;
    return {
      label: ASSETS[key].name,
      data: d.series.map((s) => ({ x: s.dateObj.getTime(), y: (s.close / base) * 100 })),
      borderColor: ASSETS[key].color,
      backgroundColor: ASSETS[key].colorBg,
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0.1,
    };
  }).filter(Boolean);

  if (datasets.length === 0) return null;

  return (
    <Card title="Performance comparee (normalise base 100)">
      <div className="relative h-[350px] w-full">
        <Line data={{ datasets: datasets as never[] }} options={chartOpts('Base 100') as never} />
      </div>
    </Card>
  );
}
