'use client';

import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { chartOpts } from '@/lib/chartSetup';
import { ProcessedAsset, AssetConfig } from '@/lib/types';
import Card from '@/components/ui/Card';
import PeriodSelector from '@/components/ui/PeriodSelector';

export default function PriceChart({ data, config }: { data: ProcessedAsset; config: AssetConfig }) {
  const [days, setDays] = useState(180);
  const series = days >= 9999 ? data.series : data.series.slice(-days);
  const lastVariation = series[series.length - 1]?.variation;
  const priceColor = lastVariation == null ? 'var(--muted)' : lastVariation >= 0 ? '#10b981' : '#ef4444';
  const priceAreaColor = lastVariation == null ? 'rgba(148,163,184,0.2)' : lastVariation >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';

  return (
    <Card>
      <PeriodSelector activeDays={days} onChange={setDays} />
      <div className="relative h-[350px] w-full">
        <Line
          data={{
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
          }}
          options={chartOpts('Cours') as never}
        />
      </div>
    </Card>
  );
}
