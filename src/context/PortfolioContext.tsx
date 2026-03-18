'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Store, AssetConfig } from '@/lib/types';
import { TIMEZONE } from '@/lib/config';
import { useAssets } from '@/context/AssetsContext';
import { fetchAssetData } from '@/lib/fetcher';
import { processAsset } from '@/lib/calculations';

const LOCAL_KEY = 'portfolio_snapshot';
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes
const SNAPSHOT_TTL_MS = 12 * 60 * 60 * 1000; // 12 heures

interface PortfolioContextType {
  store: Store;
  loading: boolean;
  lastUpdate: string | null;
  refreshAll: () => Promise<void>;
  refreshAsset: (key: string) => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType>({
  store: {},
  loading: false,
  lastUpdate: null,
  refreshAll: async () => {},
  refreshAsset: async () => {},
});

function rehydrateDates(store: Store): void {
  for (const key of Object.keys(store)) {
    const asset = store[key];
    if (asset?.series) {
      for (const point of asset.series) {
        point.dateObj = new Date(point.ts * 1000);
      }
    }
  }
}

function loadSnapshot(): { store: Store; lastUpdate: string } | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Ignore stale snapshots
    if (parsed.savedAt && Date.now() - parsed.savedAt > SNAPSHOT_TTL_MS) return null;
    if (parsed.store) {
      rehydrateDates(parsed.store);
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSnapshot(store: Store, lastUpdate: string) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ store, lastUpdate, savedAt: Date.now() }));
  } catch {
    // localStorage can be unavailable (private mode quotas)
  }
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { assets, assetKeys } = useAssets();
  const assetsRef = useRef(assets);
  const keysRef = useRef(assetKeys);
  assetsRef.current = assets;
  keysRef.current = assetKeys;

  const snapshot = loadSnapshot();
  const [store, setStore] = useState<Store>(snapshot?.store ?? {});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(snapshot?.lastUpdate ?? null);

  const refreshAsset = useCallback(async (key: string) => {
    const cfg = assetsRef.current[key];
    if (!cfg) return;
    const result = await fetchAssetData(cfg.symbol);
    const data = result ? processAsset(key, cfg, result) : null;
    const timestamp = new Date().toLocaleString('fr-FR', { timeZone: TIMEZONE });
    setStore((prev) => ({ ...prev, [key]: data }));
    setLastUpdate(timestamp);
    saveSnapshot({ ...store, [key]: data }, timestamp);
  }, [store]);

  const refreshAll = useCallback(async () => {
    const currentAssets = assetsRef.current;
    const currentKeys = keysRef.current;
    setLoading(true);
    const newStore: Store = {};

    const results = await Promise.allSettled(
      currentKeys.map(async (key: string) => {
        const cfg = currentAssets[key];
        if (!cfg) return { key, data: null };
        const result = await fetchAssetData(cfg.symbol);
        return { key, data: result ? processAsset(key, cfg, result) : null };
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

  // Refresh when asset list changes
  useEffect(() => {
    refreshAll();
  }, [assetKeys, refreshAll]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshAll]);

  return (
    <PortfolioContext.Provider value={{ store, loading, lastUpdate, refreshAll, refreshAsset }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => useContext(PortfolioContext);
