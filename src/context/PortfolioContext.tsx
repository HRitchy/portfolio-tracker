'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Store } from '@/lib/types';
import { TIMEZONE } from '@/lib/config';
import { useAssets } from '@/context/AssetsContext';
import { fetchAssetData } from '@/lib/fetcher';
import { processAsset } from '@/lib/calculations';
import { useToast } from '@/components/ui/Toast';

const LOCAL_KEY = 'portfolio_snapshot';
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes
const SNAPSHOT_TTL_MS = 12 * 60 * 60 * 1000; // 12 heures

interface PortfolioContextType {
  store: Store;
  loading: boolean;
  lastUpdate: string | null;
  errors: Record<string, boolean>;
  refreshAll: () => Promise<void>;
  refreshAsset: (key: string) => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType>({
  store: {},
  loading: false,
  lastUpdate: null,
  errors: {},
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
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const refreshAsset = useCallback(async (key: string) => {
    const cfg = assetsRef.current[key];
    if (!cfg) return;
    const result = await fetchAssetData(cfg.symbol);
    const data = result ? processAsset(key, cfg, result) : null;
    const timestamp = new Date().toLocaleString('fr-FR', { timeZone: TIMEZONE });
    setStore((prev) => {
      const next = { ...prev, [key]: data };
      saveSnapshot(next, timestamp);
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: data === null }));
    setLastUpdate(timestamp);
    if (data === null) {
      showToastRef.current(`${cfg.name} indisponible`, 'warning');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const currentAssets = assetsRef.current;
    const currentKeys = keysRef.current;
    setLoading(true);
    const newStore: Store = {};
    const newErrors: Record<string, boolean> = {};

    const results = await Promise.allSettled(
      currentKeys.map(async (key: string) => {
        const cfg = currentAssets[key];
        if (!cfg) return { key, data: null };
        const result = await fetchAssetData(cfg.symbol);
        return { key, data: result ? processAsset(key, cfg, result) : null };
      })
    );
    const failures: string[] = [];
    results.forEach((res, idx) => {
      const key = currentKeys[idx];
      if (res.status === 'fulfilled') {
        newStore[res.value.key] = res.value.data;
        newErrors[res.value.key] = res.value.data === null;
        if (res.value.data === null) failures.push(currentAssets[res.value.key]?.name ?? res.value.key);
      } else {
        console.error('[PortfolioContext] Échec fetch actif :', res.reason);
        newStore[key] = null;
        newErrors[key] = true;
        failures.push(currentAssets[key]?.name ?? key);
      }
    });

    const timestamp = new Date().toLocaleString('fr-FR', { timeZone: TIMEZONE });
    setStore(newStore);
    setErrors(newErrors);
    setLastUpdate(timestamp);
    saveSnapshot(newStore, timestamp);
    setLoading(false);

    if (failures.length > 0) {
      const label = failures.length === 1 ? failures[0] : `${failures.length} sources`;
      showToastRef.current(`${label} indisponible${failures.length > 1 ? 's' : ''}`, 'warning');
    }
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
    <PortfolioContext.Provider value={{ store, loading, lastUpdate, errors, refreshAll, refreshAsset }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => useContext(PortfolioContext);
