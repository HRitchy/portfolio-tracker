'use client';

import { useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { PORTFOLIO_KEYS, INDICATOR_KEYS, ASSETS } from '@/lib/config';
import { fmtPct } from '@/lib/formatting';
import StatCard from '@/components/dashboard/StatCard';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import RSIOverview from '@/components/dashboard/RSIOverview';
import DrawdownOverview from '@/components/dashboard/DrawdownOverview';
import HYSpreadCard from '@/components/dashboard/HYSpreadCard';
import FearGreedCard from '@/components/dashboard/FearGreedCard';
import RefreshButton from '@/components/ui/RefreshButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { store, loading } = usePortfolio();
  const hasData = Object.keys(store).length > 0;

  const overview = useMemo(() => {
    const rows = PORTFOLIO_KEYS.flatMap((key) => {
      const series = store[key]?.series;
      const last = series?.length ? series[series.length - 1] : undefined;
      if (!last?.variation && last?.variation !== 0) return [];
      return [{ key, variation: last.variation }];
    });

    if (!rows.length) {
      return { avg: null as number | null, best: null as (typeof rows)[number] | null, worst: null as (typeof rows)[number] | null };
    }

    const avg = rows.reduce((sum, row) => sum + row.variation, 0) / rows.length;
    const best = rows.reduce((a, b) => (a.variation > b.variation ? a : b));
    const worst = rows.reduce((a, b) => (a.variation < b.variation ? a : b));
    return { avg, best, worst };
  }, [store]);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cockpit Portfolio</h2>
          <div className="text-sm text-[var(--muted)] mt-1">Performance, risque et momentum en un coup d&apos;oeil.</div>
        </div>
        <RefreshButton />
      </div>

      {!hasData && loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <section className="data-card p-5 md:p-6 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-hover)] p-4">
                <div className="text-xs text-[var(--muted)] mb-1">Performance moyenne</div>
                <div className={`text-2xl font-bold ${(overview.avg ?? 0) >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {overview.avg == null ? '--' : fmtPct(overview.avg)}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-hover)] p-4">
                <div className="text-xs text-[var(--muted)] mb-1">Meilleure ligne</div>
                <div className="text-base font-semibold text-[var(--text)]">
                  {overview.best ? ASSETS[overview.best.key].name : '--'}
                </div>
                <div className="text-sm text-[var(--success)] font-semibold mt-1">
                  {overview.best ? fmtPct(overview.best.variation) : '--'}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-hover)] p-4">
                <div className="text-xs text-[var(--muted)] mb-1">Sous pression</div>
                <div className="text-base font-semibold text-[var(--text)]">
                  {overview.worst ? ASSETS[overview.worst.key].name : '--'}
                </div>
                <div className="text-sm text-[var(--danger)] font-semibold mt-1">
                  {overview.worst ? fmtPct(overview.worst.variation) : '--'}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PORTFOLIO_KEYS.map((key) => (
              <StatCard key={key} assetKey={key} data={store[key]} />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
            {INDICATOR_KEYS.map((key) => (
              <StatCard key={key} assetKey={key} data={store[key]} />
            ))}
            <HYSpreadCard />
            <FearGreedCard />
          </div>

          <div className="mt-4">
            <PerformanceChart store={store} />
          </div>

          <RSIOverview store={store} />
          <DrawdownOverview store={store} />
        </>
      )}
    </>
  );
}
