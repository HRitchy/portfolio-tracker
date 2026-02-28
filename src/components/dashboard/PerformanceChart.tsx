'use client';

import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { chartOpts } from '@/lib/chartSetup';
import { Store } from '@/lib/types';
import { useAssets } from '@/context/AssetsContext';
import Card from '@/components/ui/Card';
import PeriodSelector from '@/components/ui/PeriodSelector';

export default function PerformanceChart({ store }: { store: Store }) {
  const { assets, portfolioKeys } = useAssets();
  const [days, setDays] = useState(180);
  const options = useMemo(() => {
    const baseOptions = chartOpts('Base 100');
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins?.tooltip,
          enabled: false,
        },
      },
    };
  }, []);

  const datasets = useMemo(() => {
    const cutoff = days >= 9999 ? null : new Date(Date.now() - days * 86400000);

    return portfolioKeys.map((key) => {
      const d = store[key];
      const cfg = assets[key];
      if (!d || !d.series.length || !cfg) return null;

      const filtered = cutoff ? d.series.filter((s) => s.dateObj >= cutoff) : d.series;
      if (filtered.length === 0) return null;
      const base = filtered[0].close;

      return {
        label: cfg.name,
        data: filtered.map((s) => ({ x: s.dateObj.getTime(), y: (s.close / base) * 100 })),
        borderColor: cfg.color,
        backgroundColor: cfg.colorBg,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0.1,
      };
    }).filter(Boolean);
  }, [store, days, portfolioKeys, assets]);

  if (datasets.length === 0) return null;

  return (
    <Card title="Performance comparée (normalisé base 100)">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <PeriodSelector activeDays={days} onChange={setDays} />
      </div>
      <div className="relative h-[280px] md:h-[350px] 3xl:h-[450px] w-full">
        <Line data={{ datasets: datasets as never[] }} options={options as never} />
      </div>
    </Card>
  );
}
