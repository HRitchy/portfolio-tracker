'use client';

import { useState, useCallback } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';

const COOLDOWN_MS = 30_000;

export default function RefreshButton() {
  const { loading, refreshAll } = usePortfolio();
  const [cooldown, setCooldown] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (loading || cooldown) return;
    setCooldown(true);
    await refreshAll();
    setTimeout(() => setCooldown(false), COOLDOWN_MS);
  }, [loading, cooldown, refreshAll]);

  const disabled = loading || cooldown;

  return (
    <button
      onClick={handleRefresh}
      disabled={disabled}
      title={cooldown && !loading ? 'Veuillez patienter 30 secondes entre chaque actualisation' : undefined}
      className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm cursor-pointer transition-all hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          Chargement...
        </>
      ) : cooldown ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Patienter...
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
