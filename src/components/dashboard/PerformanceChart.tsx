'use client';

import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { chartOpts } from '@/lib/chartSetup';
import { Store } from '@/lib/types';
import { ASSETS, PORTFOLIO_KEYS } from '@/lib/config';
import Card from '@/components/ui/Card';
import PeriodSelector from '@/components/ui/PeriodSelector';

export default function PerformanceChart({ store }: { store: Store }) {
  const [days, setDays] = useState(180);

  const datasets = useMemo(() => {
    const cutoff = days >= 9999 ? null : new Date(Date.now() - days * 86400000);

    return PORTFOLIO_KEYS.map((key) => {
      const d = store[key];
      if (!d || !d.series.length) return null;

      const filtered = cutoff ? d.series.filter((s) => s.dateObj >= cutoff) : d.series;
      if (filtered.length === 0) return null;
      const base = filtered[0].close;

      return {
        label: ASSETS[key].name,
        data: filtered.map((s) => ({ x: s.dateObj.getTime(), y: (s.close / base) * 100 })),
        borderColor: ASSETS[key].color,
        backgroundColor: ASSETS[key].colorBg,
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.1,
      };
    }).filter(Boolean);
  }, [store, days]);

  if (datasets.length === 0) return null;

  return (
    <Card title="Performance comparee (normalise base 100)">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <PeriodSelector activeDays={days} onChange={setDays} />
      </div>
      <div className="relative h-[350px] w-full">
        <Line data={{ datasets: datasets as never[] }} options={chartOpts('Base 100') as never} />
      </div>
    </Card>
  );
}
