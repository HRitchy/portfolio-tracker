'use client';

import { usePortfolio } from '@/context/PortfolioContext';
import { PORTFOLIO_KEYS, INDICATOR_KEYS } from '@/lib/config';
import StatCard from '@/components/dashboard/StatCard';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import RSIOverview from '@/components/dashboard/RSIOverview';
import DrawdownOverview from '@/components/dashboard/DrawdownOverview';
import HYSpreadCard from '@/components/dashboard/HYSpreadCard';
import FearGreedCard from '@/components/dashboard/FearGreedCard';
import AdviceOverview from '@/components/dashboard/AdviceOverview';
import RefreshButton from '@/components/ui/RefreshButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { store, loading } = usePortfolio();
  const hasData = Object.keys(store).length > 0;


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
          <div className="mt-4">
            <AdviceOverview store={store} />
          </div>
        </>
      )}
    </>
  );
}
