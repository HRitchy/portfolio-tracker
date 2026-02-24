'use client';

import { Line } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { chartOpts } from '@/lib/chartSetup';
import { ProcessedAsset, AssetConfig, AssetKey } from '@/lib/types';
import { fmtPrice, getDigitsForKey } from '@/lib/formatting';
import Card from '@/components/ui/Card';

export default function MovingAverageChart({ data, config, assetKey }: { data: ProcessedAsset; config: AssetConfig; assetKey: AssetKey }) {
  const s = data.series;
  const digits = getDigitsForKey(assetKey);
  const showMM200 = assetKey !== 'vix';
  const mm50v = data.mm50?.[data.mm50.length - 1];
  const mm200v = data.mm200?.[data.mm200.length - 1];
  const lastVariation = s[s.length - 1]?.variation;
  const priceColor = lastVariation == null ? 'var(--muted)' : lastVariation >= 0 ? '#10b981' : '#ef4444';

  return (
    <>
      <Card title={showMM200 ? 'Cours + MM50 + MM200' : 'Cours + MM50'}>
        <div className="relative h-[350px] w-full">
          <Line
            data={{
              datasets: [
                { label: 'Cours', data: s.map((x) => ({ x: x.dateObj.getTime(), y: x.close })), borderColor: priceColor, borderWidth: 2, pointRadius: 0, fill: false, tension: 0.1 },
                { label: 'MM50', data: s.map((x, i) => ({ x: x.dateObj.getTime(), y: data.mm50?.[i] ?? null })), borderColor: '#f59e0b', borderWidth: 1.5, pointRadius: 0, fill: false, borderDash: [5, 3] },
                ...(showMM200
                  ? [{ label: 'MM200', data: s.map((x, i) => ({ x: x.dateObj.getTime(), y: data.mm200?.[i] ?? null })), borderColor: '#ef4444', borderWidth: 1.5, pointRadius: 0, fill: false, borderDash: [8, 4] }]
                  : []),
              ],
            }}
            options={chartOpts('Cours') as never}
          />
        </div>
      </Card>
      <div className={`grid ${showMM200 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mt-4`}>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
          <div className="text-xs text-[var(--muted)] mb-2">MM50</div>
          <div className="text-[22px] font-bold">{mm50v != null ? fmtPrice(mm50v, digits) : '--'}</div>
        </div>
        {showMM200 && (
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
            <div className="text-xs text-[var(--muted)] mb-2">MM200</div>
            <div className="text-[22px] font-bold">{mm200v != null ? fmtPrice(mm200v, digits) : '--'}</div>
          </div>
        )}
      </div>
    </>
  );
}
