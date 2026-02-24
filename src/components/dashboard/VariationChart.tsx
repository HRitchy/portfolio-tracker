'use client';

import { Bar } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { ProcessedAsset } from '@/lib/types';
import Card from '@/components/ui/Card';

export default function VariationChart({ data }: { data: ProcessedAsset | null | undefined }) {
  if (!data || !data.series.length) return null;
  const last30 = data.series.slice(-30);

  return (
    <Card title="Variations quotidiennes">
      <div className="relative h-[350px] w-full">
        <Bar
          data={{
            labels: last30.map((s) => s.dateObj),
            datasets: [{
              label: 'Variation MSCI World (%)',
              data: last30.map((s) => s.variation),
              backgroundColor: last30.map((s) =>
                (s.variation ?? 0) >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'
              ),
              borderRadius: 3,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd/MM/yyyy' }, grid: { display: false } },
              y: { grid: { color: 'rgba(46,51,71,0.5)' } },
            },
          } as never}
        />
      </div>
    </Card>
  );
}
