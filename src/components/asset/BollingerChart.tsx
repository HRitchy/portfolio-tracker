'use client';

import { Line } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { chartOpts } from '@/lib/chartSetup';
import { ProcessedAsset, AssetConfig, AssetKey } from '@/lib/types';
import { fmtPrice, getDigitsForKey } from '@/lib/formatting';
import Card from '@/components/ui/Card';

export default function BollingerChart({ data, config, assetKey }: { data: ProcessedAsset; config: AssetConfig; assetKey: AssetKey }) {
  const s = data.series;
  const digits = getDigitsForKey(assetKey);
  const upper = data.bollingerUpper ?? [];
  const middle = data.bollingerMiddle ?? [];
  const lower = data.bollingerLower ?? [];

  const lastUpper = upper.length ? upper[upper.length - 1] : null;
  const lastMiddle = middle.length ? middle[middle.length - 1] : null;
  const lastLower = lower.length ? lower[lower.length - 1] : null;
  const lastClose = s.length ? s[s.length - 1].close : null;

  // Calculate bandwidth: (upper - lower) / middle * 100
  const bandwidth = lastUpper != null && lastLower != null && lastMiddle != null && lastMiddle !== 0
    ? +((lastUpper - lastLower) / lastMiddle * 100).toFixed(2)
    : null;

  // Calculate %B: (close - lower) / (upper - lower)
  const pctB = lastClose != null && lastUpper != null && lastLower != null && lastUpper !== lastLower
    ? +((lastClose - lastLower) / (lastUpper - lastLower) * 100).toFixed(2)
    : null;

  const baseOptions = chartOpts('Cours');

  return (
    <>
      <Card title="Bandes de Bollinger (20, 2)">
        <div className="relative h-[350px] w-full">
          <Line
            data={{
              datasets: [
                {
                  label: 'Cours',
                  data: s.map((x) => ({ x: x.dateObj.getTime(), y: x.close })),
                  borderColor: config.color,
                  borderWidth: 2,
                  pointRadius: 0,
                  fill: false,
                  tension: 0.1,
                },
                {
                  label: 'Bande sup.',
                  data: s.map((x, i) => ({ x: x.dateObj.getTime(), y: upper[i] ?? null })),
                  borderColor: 'rgba(239,68,68,0.6)',
                  backgroundColor: 'rgba(99,102,241,0.05)',
                  borderWidth: 1,
                  pointRadius: 0,
                  fill: false,
                  borderDash: [4, 3],
                },
                {
                  label: 'MM20',
                  data: s.map((x, i) => ({ x: x.dateObj.getTime(), y: middle[i] ?? null })),
                  borderColor: '#f59e0b',
                  borderWidth: 1.5,
                  pointRadius: 0,
                  fill: false,
                  borderDash: [6, 3],
                },
                {
                  label: 'Bande inf.',
                  data: s.map((x, i) => ({ x: x.dateObj.getTime(), y: lower[i] ?? null })),
                  borderColor: 'rgba(16,185,129,0.6)',
                  backgroundColor: 'rgba(99,102,241,0.05)',
                  borderWidth: 1,
                  pointRadius: 0,
                  fill: '-2',
                  borderDash: [4, 3],
                },
              ],
            }}
            options={{
              ...baseOptions,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                ...baseOptions.plugins,
                tooltip: {
                  ...baseOptions.plugins?.tooltip,
                },
              },
              scales: {
                x: baseOptions.scales?.x,
                y: {
                  ...baseOptions.scales?.y,
                },
              },
            } as never}
          />
        </div>
      </Card>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2">Bande supérieure</div>
          <div className="text-[22px] font-bold">{lastUpper != null ? fmtPrice(lastUpper, digits) : '--'}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2">MM20 (milieu)</div>
          <div className="text-[22px] font-bold">{lastMiddle != null ? fmtPrice(lastMiddle, digits) : '--'}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2">Bande inférieure</div>
          <div className="text-[22px] font-bold">{lastLower != null ? fmtPrice(lastLower, digits) : '--'}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2">Largeur / %B</div>
          <div className="text-[22px] font-bold">
            {bandwidth != null ? `${bandwidth}%` : '--'}
            <span className="text-sm text-[var(--muted)] ml-2">
              {pctB != null ? `(%B: ${pctB}%)` : ''}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
