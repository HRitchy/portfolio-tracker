'use client';

import { usePortfolio } from '@/context/PortfolioContext';

export default function RefreshButton() {
  const { loading, refreshAll } = usePortfolio();

  return (
    <button
      onClick={refreshAll}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm cursor-pointer transition-all hover:bg-[#818cf8] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          Chargement...
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          Actualiser
        </>
      )}
    </button>
  );
}
