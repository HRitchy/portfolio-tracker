'use client';

import VixCard from '@/components/dashboard/VixCard';
import FearGreedCard from '@/components/dashboard/FearGreedCard';
import HYSpreadCard from '@/components/dashboard/HYSpreadCard';
import MarketSynthesis from '@/components/dashboard/MarketSynthesis';
import RefreshButton from '@/components/ui/RefreshButton';

export default function DashboardPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-5 md:mb-6 3xl:mb-8 fade-in">
        <div>
          <h1 className="text-xl md:text-2xl 3xl:text-3xl font-bold">Baromètre de marché</h1>
          <p className="text-xs md:text-sm text-[var(--muted)] mt-1">
            VIX · Fear &amp; Greed · ICE BofA US High Yield Index
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 3xl:gap-5 fade-in">
        <VixCard />
        <FearGreedCard />
        <HYSpreadCard />
      </div>

      <div className="mt-3 md:mt-4 3xl:mt-5 fade-in">
        <MarketSynthesis />
      </div>
    </>
  );
}
