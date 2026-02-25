'use client';

import { usePortfolio } from '@/context/PortfolioContext';
import { PORTFOLIO_KEYS, INDICATOR_KEYS } from '@/lib/config';
import StatCard from '@/components/dashboard/StatCard';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import PortfolioSummary from '@/components/dashboard/PortfolioSummary';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 fade-in">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cockpit Portfolio</h2>
          <div className="text-sm text-[var(--muted)] mt-1">Performance, risque et momentum en un coup d&apos;oeil.</div>
        </div>
        <RefreshButton />
      </div>

      {!hasData && loading ? (
        <SkeletonDashboard />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PORTFOLIO_KEYS.map((key, i) => (
              <div key={key} className={`stagger-${i + 1}`}>
                <StatCard assetKey={key} data={store[key]} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
            {INDICATOR_KEYS.map((key, i) => (
              <div key={key} className={`fade-in stagger-${i + 4}`}>
                <StatCard assetKey={key} data={store[key]} />
              </div>
            ))}
            <div className="fade-in stagger-5">
              <HYSpreadCard />
            </div>
            <div className="fade-in stagger-6">
              <FearGreedCard />
            </div>
          </div>

          <div className="mt-4 fade-in">
            <PerformanceChart store={store} />
          </div>

          <div className="mt-4 fade-in">
            <PortfolioSummary store={store} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="fade-in">
              <RSIOverview store={store} />
            </div>
            <div className="fade-in">
              <DrawdownOverview store={store} />
            </div>
          </div>

          <div className="mt-4 fade-in">
            <VolatilityChart store={store} />
          </div>

          <div className="mt-4 fade-in">
            <CorrelationMatrix store={store} />
          </div>

          <div className="mt-4 fade-in">
            <AdviceOverview store={store} />
          </div>
        </>
      )}
    </>
  );
}
