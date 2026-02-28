export function SkeletonStatCard() {
  return (
    <div className="data-card p-3 md:p-4 animate-pulse">
      <div className="h-2.5 bg-[var(--border)] rounded w-1/3 mb-3" />
      <div className="h-6 md:h-7 bg-[var(--panel-hover)] rounded-lg mb-2 w-2/3" />
      <div className="h-2 bg-[var(--border)] rounded w-1/2" />
    </div>
  );
}

export function SkeletonChartCard({ height = 'h-[280px] md:h-[350px] 3xl:h-[450px]' }: { height?: string }) {
  return (
    <div className="data-card p-4 md:p-5 animate-pulse">
      <div className="h-3 bg-[var(--border)] rounded w-1/4 mb-4" />
      <div className={`${height} skeleton-shimmer rounded-xl`} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-3 md:space-y-4 3xl:space-y-5">
      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 3xl:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      {/* Indicator cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 3xl:gap-5">
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      {/* Main chart */}
      <SkeletonChartCard height="h-[240px] md:h-[300px] 3xl:h-[400px]" />
      {/* Secondary charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 3xl:gap-5">
        <SkeletonChartCard height="h-[180px] md:h-[220px]" />
        <SkeletonChartCard height="h-[180px] md:h-[220px]" />
      </div>
    </div>
  );
}

export function SkeletonAssetPage() {
  return (
    <div className="space-y-3 md:space-y-4 animate-pulse">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 3xl:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      {/* Tab nav placeholder */}
      <div className="flex gap-1.5 md:gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 md:h-10 w-20 md:w-24 bg-[var(--panel-hover)] rounded-xl" />
        ))}
      </div>
      {/* Chart placeholder */}
      <SkeletonChartCard />
    </div>
  );
}
