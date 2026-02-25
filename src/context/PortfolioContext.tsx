'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { Store, AssetKey } from '@/lib/types';
import { ASSETS, ASSET_KEYS, TIMEZONE } from '@/lib/config';
import { fetchAssetData } from '@/lib/fetcher';
import { processAsset } from '@/lib/calculations';

const SESSION_KEY = 'portfolio_snapshot';
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

interface PortfolioContextType {
  store: Store;
  loading: boolean;
  lastUpdate: string | null;
  refreshAll: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType>({
  store: {},
  loading: false,
  lastUpdate: null,
  refreshAll: async () => {},
});

function loadSnapshot(): { store: Store; lastUpdate: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSnapshot(store: Store, lastUpdate: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ store, lastUpdate }));
  } catch {
    // sessionStorage can be unavailable (private mode quotas)
  }
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const snapshot = loadSnapshot();
  const [store, setStore] = useState<Store>(snapshot?.store ?? {});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(snapshot?.lastUpdate ?? null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const newStore: Store = {};

    const results = await Promise.allSettled(
      ASSET_KEYS.map(async (key: AssetKey) => {
        const result = await fetchAssetData(ASSETS[key].symbol);
        return { key, data: result ? processAsset(key, result) : null };
      })
    );
    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        newStore[res.value.key] = res.value.data;
      } else {
        console.error('[PortfolioContext] Échec fetch actif :', res.reason);
      }
    });

    const timestamp = new Date().toLocaleString('fr-FR', { timeZone: TIMEZONE });
    setStore(newStore);
    setLastUpdate(timestamp);
    saveSnapshot(newStore, timestamp);
    setLoading(false);
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshAll]);

  return (
    <PortfolioContext.Provider value={{ store, loading, lastUpdate, refreshAll }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => useContext(PortfolioContext);
