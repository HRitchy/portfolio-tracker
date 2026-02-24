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

  return (
    <Card>
      <PeriodSelector activeDays={days} onChange={setDays} />
      <div className="relative h-[350px] w-full">
        <Line
          data={{
            datasets: [{
              label: config.name,
              data: series.map((s) => ({ x: s.dateObj.getTime(), y: s.close })),
              borderColor: config.color,
              backgroundColor: config.colorBg,
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
