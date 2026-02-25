'use client';

import { useParams } from 'next/navigation';
import { useState, lazy, Suspense } from 'react';
import Link from 'next/link';
import { usePortfolio } from '@/context/PortfolioContext';
import { ASSETS } from '@/lib/config';
import { AssetKey, ProcessedAsset, AssetConfig } from '@/lib/types';
import { fmtPrice, fmtPct, getDigitsForKey } from '@/lib/formatting';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RefreshButton from '@/components/ui/RefreshButton';
import { SkeletonAssetPage } from '@/components/ui/SkeletonCard';

const PriceChart = lazy(() => import('@/components/asset/PriceChart'));
const MovingAverageChart = lazy(() => import('@/components/asset/MovingAverageChart'));
const RSIChart = lazy(() => import('@/components/asset/RSIChart'));
const AssetVariationChart = lazy(() => import('@/components/asset/AssetVariationChart'));
const DrawdownChart = lazy(() => import('@/components/asset/DrawdownChart'));
const BollingerChart = lazy(() => import('@/components/asset/BollingerChart'));
const DataTable = lazy(() => import('@/components/asset/DataTable'));

type Tab = 'cours' | 'mm' | 'rsi' | 'drawdown' | 'bollinger' | 'variations' | 'donnees';

function Breadcrumb({ config }: { config: AssetConfig }) {
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm text-[var(--muted)] mb-4">
      <Link href="/" className="hover:text-[var(--text)] transition-colors">
        Dashboard
      </Link>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="9 18 15 12 9 6" />
      </svg>
      <span className="text-[var(--text)] font-medium">{config.name}</span>
    </nav>
  );
}

function AssetHeader({ config }: { config: AssetConfig }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{config.name}</h2>
        <div className="text-sm text-[var(--muted)] mt-1">{config.symbol}</div>
      </div>
      <RefreshButton />
    </div>
  );
}

function StatCards({ data, assetKey }: { data: ProcessedAsset; assetKey: AssetKey }) {
  const digits = getDigitsForKey(assetKey);
  const last = data.series.length ? data.series[data.series.length - 1] : undefined;
  const prices = data.series.map((s) => s.close);
  const high = prices.length ? Math.max(...prices) : 0;
  const low = prices.length ? Math.min(...prices) : 0;

  const cards = [
    { label: 'Dernier cours', value: fmtPrice(last?.close, digits), sub: last?.date ?? '', color: (last?.variation ?? 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]' },
    { label: 'Variation', value: fmtPct(last?.variation), sub: 'vs jour precedent', color: (last?.variation ?? 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]' },
    { label: 'Plus haut', value: fmtPrice(high, digits), sub: 'sur la periode', color: 'text-[var(--text)]' },
    { label: 'Plus bas', value: fmtPrice(low, digits), sub: 'sur la periode', color: 'text-[var(--text)]' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="data-card p-4">
          <div className="text-[11px] text-[var(--muted)] uppercase tracking-[0.16em] mb-1">{c.label}</div>
          <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

function TabNav({ active, onChange, config }: { active: Tab; onChange: (t: Tab) => void; config: AssetConfig }) {
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'cours', label: 'Cours', show: true },
    { id: 'mm', label: 'Moyennes Mobiles', show: config.hasMM },
    { id: 'rsi', label: 'RSI', show: config.hasRSI },
    { id: 'drawdown', label: 'Drawdown', show: config.hasDrawdown },
    { id: 'bollinger', label: 'Bollinger', show: config.hasBollinger },
    { id: 'variations', label: 'Variations', show: true },
    { id: 'donnees', label: 'Donnees', show: true },
  ];

  return (
    <div role="tablist" aria-label="Vues de l'actif" className="flex gap-2 mb-4 overflow-x-auto pb-1">
      {tabs.filter((t) => t.show).map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap cursor-pointer transition-all ${
            active === t.id
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--panel-hover)] text-[var(--nav-text)] hover:bg-[var(--border)]/80'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function AssetPage() {
  const params = useParams();
  const key = params.key as AssetKey;
  const { store, loading } = usePortfolio();
  const [tab, setTab] = useState<Tab>('cours');

  const config = ASSETS[key];
  const data = store[key];

  if (!config) {
    return <div className="text-[#ef4444]">Actif inconnu : {key}</div>;
  }

  return (
    <>
      <Breadcrumb config={config} />
      <AssetHeader config={config} />

      {!data && loading ? (
        <SkeletonAssetPage />
      ) : !data ? (
        <div className="text-[var(--muted)]">Aucune donnee disponible pour {config.name}.</div>
      ) : (
        <>
          <StatCards data={data} assetKey={key} />
          <TabNav active={tab} onChange={setTab} config={config} />

          <Suspense fallback={<LoadingSpinner />}>
            {tab === 'cours' && <PriceChart data={data} config={config} />}
            {tab === 'mm' && config.hasMM && <MovingAverageChart data={data} config={config} assetKey={key} />}
            {tab === 'rsi' && config.hasRSI && <RSIChart data={data} assetKey={key} />}
            {tab === 'drawdown' && config.hasDrawdown && <DrawdownChart data={data} config={config} />}
            {tab === 'bollinger' && config.hasBollinger && <BollingerChart data={data} config={config} assetKey={key} />}
            {tab === 'variations' && <AssetVariationChart data={data} />}
            {tab === 'donnees' && <DataTable data={data} config={config} assetKey={key} />}
          </Suspense>
        </>
      )}
    </>
  );
}
