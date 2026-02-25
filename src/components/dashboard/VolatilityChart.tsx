'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import '@/lib/chartSetup';
import { chartOpts } from '@/lib/chartSetup';
import { Store } from '@/lib/types';
import { ASSETS, PORTFOLIO_KEYS } from '@/lib/config';
import Card from '@/components/ui/Card';

function rollingVolatility(prices: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(prices.length).fill(null);
  for (let i = window; i < prices.length; i++) {
    const returns: number[] = [];
    for (let j = i - window + 1; j <= i; j++) {
      if (prices[j - 1] > 0) returns.push(Math.log(prices[j] / prices[j - 1]));
    }
    if (returns.length > 0) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
      out[i] = Math.sqrt(variance * 252) * 100;
    }
  }
  return out;
}

export default function VolatilityChart({ store }: { store: Store }) {
  const datasets = useMemo(() => {
    return PORTFOLIO_KEYS.map((key) => {
      const d = store[key];
      if (!d?.series?.length) return null;
      const prices = d.series.map((s) => s.close);
      const vol = rollingVolatility(prices, 30);
      return {
        label: ASSETS[key].name,
        data: d.series.map((s, i) => ({ x: s.dateObj.getTime(), y: vol[i] })),
        borderColor: ASSETS[key].color,
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.2,
      };
    }).filter(Boolean);
  }, [store]);

  if (datasets.length === 0) return null;

  return (
    <Card title="Volatilite realisee glissante (30j, annualisee)">
      <div className="relative h-[300px] w-full">
        <Line
          data={{ datasets: datasets as never[] }}
          options={chartOpts('Volatilite (%)') as never}
        />
      </div>
    </Card>
  );
}
