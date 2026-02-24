'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { ASSETS } from '@/lib/config';
import { AssetKey, ProcessedAsset, AssetConfig } from '@/lib/types';
import { fmtPrice, fmtPct, getDigitsForKey } from '@/lib/formatting';
import PriceChart from '@/components/asset/PriceChart';
import MovingAverageChart from '@/components/asset/MovingAverageChart';
import RSIChart from '@/components/asset/RSIChart';
import AssetVariationChart from '@/components/asset/AssetVariationChart';
import DataTable from '@/components/asset/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RefreshButton from '@/components/ui/RefreshButton';

type Tab = 'cours' | 'mm' | 'rsi' | 'variations' | 'donnees';

function AssetHeader({ config }: { config: AssetConfig }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold">{config.name}</h2>
        <div className="text-[13px] text-[var(--muted)] mt-0.5">{config.symbol}</div>
      </div>
      <RefreshButton />
    </div>
  );
}

function StatCards({ data, assetKey }: { data: ProcessedAsset; assetKey: AssetKey }) {
  const digits = getDigitsForKey(assetKey);
  const last = data.series[data.series.length - 1];
  const prices = data.series.map((s) => s.close);
  const high = Math.max(...prices);
  const low = Math.min(...prices);

  const cards = [
    { label: 'Dernier cours', value: fmtPrice(last?.close, digits), sub: last?.date ?? '', color: (last?.variation ?? 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]' },
    { label: 'Variation', value: fmtPct(last?.variation), sub: 'vs jour precedent', color: (last?.variation ?? 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]' },
    { label: 'Plus haut', value: fmtPrice(high, digits), sub: 'sur la periode', color: 'text-[var(--text)]' },
    { label: 'Plus bas', value: fmtPrice(low, digits), sub: 'sur la periode', color: 'text-[var(--text)]' },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide mb-1">{c.label}</div>
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
    { id: 'variations', label: 'Variations', show: true },
    { id: 'donnees', label: 'Donnees', show: true },
  ];

  return (
    <div className="flex gap-1 mb-4 overflow-x-auto">
      {tabs.filter((t) => t.show).map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-all ${
            active === t.id
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--panel-hover)] text-[var(--nav-text)] hover:bg-[var(--border)]'
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
      <AssetHeader config={config} />

      {!data && loading ? (
        <LoadingSpinner />
      ) : !data ? (
        <div className="text-[var(--muted)]">Aucune donnee disponible pour {config.name}.</div>
      ) : (
        <>
          <StatCards data={data} assetKey={key} />
          <TabNav active={tab} onChange={setTab} config={config} />

          {tab === 'cours' && <PriceChart data={data} config={config} />}
          {tab === 'mm' && config.hasMM && <MovingAverageChart data={data} config={config} assetKey={key} />}
          {tab === 'rsi' && config.hasRSI && <RSIChart data={data} assetKey={key} />}
          {tab === 'variations' && <AssetVariationChart data={data} />}
          {tab === 'donnees' && <DataTable data={data} config={config} assetKey={key} />}
        </>
      )}
    </>
  );
}
