'use client';

import { Bar } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { ProcessedAsset } from '@/lib/types';
import Card from '@/components/ui/Card';

export default function AssetVariationChart({ data }: { data: ProcessedAsset }) {
  const last60 = data.series.slice(-60);

  return (
    <Card title="Variations quotidiennes (%)">
      <div className="relative h-[280px] md:h-[350px] 3xl:h-[450px] w-full">
        <Bar
          data={{
            labels: last60.map((s) => s.dateObj),
            datasets: [{
              label: 'Variation (%)',
              data: last60.map((s) => s.variation),
              backgroundColor: last60.map((s) =>
                (s.variation ?? 0) >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'
              ),
              borderRadius: 2,
            }],
          }}
          options={{
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { type: 'time', time: { unit: 'week', tooltipFormat: 'dd/MM/yyyy' }, grid: { display: false } },
              y: { grid: { color: 'rgba(46,51,71,0.5)' } },
            },
          } as never}
        />
      </div>
    </Card>
  );
}
