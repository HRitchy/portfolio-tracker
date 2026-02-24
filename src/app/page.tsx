'use client';

import { usePortfolio } from '@/context/PortfolioContext';
import { PORTFOLIO_KEYS, INDICATOR_KEYS } from '@/lib/config';
import StatCard from '@/components/dashboard/StatCard';
import AllocationBar from '@/components/dashboard/AllocationBar';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import VariationChart from '@/components/dashboard/VariationChart';
import RSIOverview from '@/components/dashboard/RSIOverview';
import RefreshButton from '@/components/ui/RefreshButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { store, loading } = usePortfolio();
  const hasData = Object.keys(store).length > 0;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <div className="text-[13px] text-[#6b7280] mt-0.5">Vue d&apos;ensemble du portefeuille</div>
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

          <AllocationBar />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {INDICATOR_KEYS.map((key) => (
              <StatCard key={key} assetKey={key} data={store[key]} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <PerformanceChart store={store} />
            <VariationChart data={store.mwre} />
          </div>

          <RSIOverview store={store} />
        </>
      )}
    </>
  );
}
