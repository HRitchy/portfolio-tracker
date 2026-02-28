'use client';

import { usePortfolio } from '@/context/PortfolioContext';
import { PORTFOLIO_KEYS } from '@/lib/config';
import StatCard from '@/components/dashboard/StatCard';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import RSIOverview from '@/components/dashboard/RSIOverview';
import DrawdownOverview from '@/components/dashboard/DrawdownOverview';
import VolatilityChart from '@/components/dashboard/VolatilityChart';
import CorrelationMatrix from '@/components/dashboard/CorrelationMatrix';
import HYSpreadCard from '@/components/dashboard/HYSpreadCard';
import FearGreedCard from '@/components/dashboard/FearGreedCard';
import AdviceOverview from '@/components/dashboard/AdviceOverview';
import RefreshButton from '@/components/ui/RefreshButton';
import { SkeletonDashboard } from '@/components/ui/SkeletonCard';

export default function DashboardPage() {
  const { store, loading } = usePortfolio();
  const hasData = Object.keys(store).length > 0;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 md:mb-6 3xl:mb-8 gap-3 md:gap-4 fade-in">
        <div>
          <h2 className="text-2xl md:text-3xl 3xl:text-4xl font-bold tracking-tight">Cockpit Portfolio</h2>
          <div className="text-xs md:text-sm text-[var(--muted)] mt-1">Performance, risque et momentum en un coup d&apos;œil.</div>
        </div>
        <RefreshButton />
      </div>

      {!hasData && loading ? (
        <SkeletonDashboard />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 3xl:gap-5">
            {PORTFOLIO_KEYS.map((key, i) => (
              <div key={key} className={`stagger-${i + 1}`}>
                <StatCard assetKey={key} data={store[key]} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 3xl:gap-5 mt-3 md:mt-4 3xl:mt-5">
            <div className="fade-in stagger-4">
              <HYSpreadCard />
            </div>
            <div className="fade-in stagger-5">
              <FearGreedCard />
            </div>
          </div>

          <div className="mt-3 md:mt-4 3xl:mt-5 fade-in">
            <PerformanceChart store={store} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 3xl:gap-5 mt-3 md:mt-4 3xl:mt-5">
            <div className="fade-in">
              <RSIOverview store={store} />
            </div>
            <div className="fade-in">
              <DrawdownOverview store={store} />
            </div>
          </div>

          <div className="mt-3 md:mt-4 3xl:mt-5 fade-in">
            <VolatilityChart store={store} />
          </div>

          <div className="mt-3 md:mt-4 3xl:mt-5 fade-in">
            <CorrelationMatrix store={store} />
          </div>

          <div className="mt-3 md:mt-4 3xl:mt-5 fade-in">
            <AdviceOverview store={store} />
          </div>
        </>
      )}
    </>
  );
}
