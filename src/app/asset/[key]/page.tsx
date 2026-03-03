'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import Link from 'next/link';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAssets } from '@/context/AssetsContext';
import { ProcessedAsset, AssetConfig } from '@/lib/types';
import { fmtPrice, fmtPct, getDigitsForAsset } from '@/lib/formatting';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RefreshButton from '@/components/ui/RefreshButton';
import { SkeletonAssetPage } from '@/components/ui/SkeletonCard';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';

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
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-xs md:text-sm text-[var(--muted)] mb-3 md:mb-4 fade-in">
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

function AssetHeader({ config, onDelete }: { config: AssetConfig; onDelete?: () => void }) {
  return (
    <div className="flex flex-col items-start md:flex-row md:items-center justify-between mb-5 md:mb-6 3xl:mb-8 gap-3 md:gap-4 fade-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: config.color }}>
          {config.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl 3xl:text-4xl font-bold tracking-tight">{config.name}</h2>
          <div className="text-xs md:text-sm text-[var(--muted)] mt-0.5">{config.symbol} &middot; {config.assetClass}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RefreshButton />
        {onDelete && (
          <button
            onClick={onDelete}
            aria-label={`Supprimer ${config.name}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[#ef4444] border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.1)] transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

function StatCards({ data, assetKey }: { data: ProcessedAsset; assetKey: string }) {
  const { assets } = useAssets();
  const digits = getDigitsForAsset(assets[assetKey]);
  const last = data.series.length ? data.series[data.series.length - 1] : undefined;
  const prices = data.series.map((s) => s.close);
  const high = prices.length ? Math.max(...prices) : 0;
  const low = prices.length ? Math.min(...prices) : 0;

  const cards = [
    { label: 'Dernier cours', value: fmtPrice(last?.close, digits), sub: last?.date ?? '', color: (last?.variation ?? 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]' },
    { label: 'Variation', value: fmtPct(last?.variation), sub: 'vs jour précédent', color: (last?.variation ?? 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]' },
    { label: 'Plus haut', value: fmtPrice(high, digits), sub: 'sur la période', color: 'text-[var(--text)]' },
    { label: 'Plus bas', value: fmtPrice(low, digits), sub: 'sur la période', color: 'text-[var(--text)]' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 3xl:gap-5 mb-3 md:mb-4">
      {cards.map((c, i) => (
        <div key={c.label} className={`data-card p-3 md:p-4 3xl:p-5 fade-in stagger-${i + 1}`}>
          <div className="text-[10px] md:text-[11px] text-[var(--muted)] uppercase tracking-[0.16em] mb-1">{c.label}</div>
          <div className={`text-lg md:text-xl 3xl:text-2xl font-bold ${c.color}`}>{c.value}</div>
          <div className="text-[10px] md:text-[11px] text-[var(--muted)] mt-0.5">{c.sub}</div>
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
    { id: 'donnees', label: 'Données', show: true },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = visibleTabs.findIndex((t) => t.id === active);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = visibleTabs[(idx + 1) % visibleTabs.length];
      onChange(next.id);
      (e.currentTarget.querySelector(`[data-tab="${next.id}"]`) as HTMLElement)?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = visibleTabs[(idx - 1 + visibleTabs.length) % visibleTabs.length];
      onChange(prev.id);
      (e.currentTarget.querySelector(`[data-tab="${prev.id}"]`) as HTMLElement)?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(visibleTabs[0].id);
      (e.currentTarget.querySelector(`[data-tab="${visibleTabs[0].id}"]`) as HTMLElement)?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = visibleTabs[visibleTabs.length - 1];
      onChange(last.id);
      (e.currentTarget.querySelector(`[data-tab="${last.id}"]`) as HTMLElement)?.focus();
    }
  }, [active, onChange, visibleTabs]);

  return (
    <div role="tablist" aria-label="Vues de l'actif" className="flex gap-1.5 md:gap-2 mb-3 md:mb-4 overflow-x-auto pb-1 fade-in scrollbar-none" onKeyDown={handleKeyDown}>
      {visibleTabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          data-tab={t.id}
          aria-selected={active === t.id}
          tabIndex={active === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          className={`px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer transition-all ${
            active === t.id
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-lg shadow-indigo-500/20'
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const key = params.key as string;
  const { store, loading } = usePortfolio();
  const { assets, removeAsset } = useAssets();

  const config = assets[key];

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteRequest = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    removeAsset(key);
    setShowDeleteModal(false);
    router.push('/');
  }, [key, removeAsset, router]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  // Onglets disponibles pour cet actif
  const validTabs = useMemo<Set<Tab>>(() => {
    const s = new Set<Tab>(['cours', 'variations', 'donnees']);
    if (config?.hasMM) s.add('mm');
    if (config?.hasRSI) s.add('rsi');
    if (config?.hasDrawdown) s.add('drawdown');
    if (config?.hasBollinger) s.add('bollinger');
    return s;
  }, [config]);

  // L'onglet actif est lu depuis l'URL — fallback vers 'cours' si invalide
  const rawTab = searchParams.get('tab') as Tab | null;
  const tab: Tab = rawTab && validTabs.has(rawTab) ? rawTab : 'cours';

  // Nettoyage de l'URL si l'onglet n'est pas disponible pour cet actif
  useEffect(() => {
    if (rawTab && !validTabs.has(rawTab)) {
      router.replace(`/asset/${key}`, { scroll: false });
    }
  }, [key, rawTab, validTabs, router]);

  // Changement d'onglet : mise à jour de l'URL sans recharger la page
  const setTab = useCallback((newTab: Tab) => {
    const next = new URLSearchParams(searchParams.toString());
    if (newTab === 'cours') {
      next.delete('tab');
    } else {
      next.set('tab', newTab);
    }
    const qs = next.toString();
    router.replace(`/asset/${key}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, key, searchParams]);

  const data = store[key];

  if (!config) {
    return <div className="text-[#ef4444]">Actif inconnu : {key}</div>;
  }

  return (
    <>
      <Breadcrumb config={config} />
      <AssetHeader config={config} onDelete={handleDeleteRequest} />

      {!data && loading ? (
        <SkeletonAssetPage />
      ) : !data ? (
        <div className="text-[var(--muted)]">Aucune donnée disponible pour {config.name}.</div>
      ) : (
        <>
          <StatCards data={data} assetKey={key} />
          <TabNav active={tab} onChange={setTab} config={config} />

          <div className="fade-in-scale">
            <Suspense fallback={<LoadingSpinner />}>
              {tab === 'cours' && <PriceChart data={data} config={config} />}
              {tab === 'mm' && config.hasMM && <MovingAverageChart data={data} config={config} assetKey={key} />}
              {tab === 'rsi' && config.hasRSI && <RSIChart data={data} assetKey={key} />}
              {tab === 'drawdown' && config.hasDrawdown && <DrawdownChart data={data} config={config} />}
              {tab === 'bollinger' && config.hasBollinger && <BollingerChart data={data} config={config} assetKey={key} />}
              {tab === 'variations' && <AssetVariationChart data={data} />}
              {tab === 'donnees' && <DataTable data={data} config={config} assetKey={key} />}
            </Suspense>
          </div>
        </>
      )}
      {showDeleteModal && config && (
        <ConfirmDeleteModal
          assetName={config.name}
          onConfirm={handleConfirmDelete}
          onClose={handleCancelDelete}
        />
      )}
    </>
  );
}
