'use client';

import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { chartOpts } from '@/lib/chartSetup';
import { ProcessedAsset, AssetConfig } from '@/lib/types';
import Card from '@/components/ui/Card';
import PeriodSelector from '@/components/ui/PeriodSelector';

function calcEvolution(series: { close: number }[]): number | null {
  if (series.length < 2) return null;
  const first = series[0].close;
  const last = series[series.length - 1].close;
  if (first === 0) return null;
  return ((last - first) / first) * 100;
}

export default function PriceChart({ data, config }: { data: ProcessedAsset; config: AssetConfig }) {
  const [days, setDays] = useState(180);
  const series = useMemo(() => {
    if (days >= 9999) return data.series;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return data.series.filter((s) => s.dateObj >= cutoff);
  }, [data.series, days]);
  const priceColor = config.color;
  const priceAreaColor = config.colorBg;
  const evolution = calcEvolution(series);

  const chartData = useMemo(() => ({
    datasets: [{
      label: config.name,
      data: series.map((s) => ({ x: s.dateObj.getTime(), y: s.close })),
      borderColor: priceColor,
      backgroundColor: priceAreaColor,
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      tension: 0.1,
    }],
  }), [series, config.name, priceColor, priceAreaColor]);

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <PeriodSelector activeDays={days} onChange={setDays} />
        {evolution != null && (
          <div className={`text-lg font-bold ${evolution >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {evolution >= 0 ? '+' : ''}{evolution.toFixed(2)}%
          </div>
        )}
      </div>
      <div className="relative h-[350px] w-full">
        <Line data={chartData} options={chartOpts('Cours') as never} />
      </div>
    </Card>
  );
}
