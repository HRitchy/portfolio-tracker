'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { Store, AssetKey } from '@/lib/types';
import { ASSETS, ASSET_KEYS, TIMEZONE } from '@/lib/config';
import { fetchAssetData } from '@/lib/fetcher';
import { processAsset } from '@/lib/calculations';

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

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const newStore: Store = {};

    for (let i = 0; i < ASSET_KEYS.length; i += 2) {
      const batch = ASSET_KEYS.slice(i, i + 2);
      const results = await Promise.all(
        batch.map(async (key: AssetKey) => {
          const result = await fetchAssetData(ASSETS[key].symbol);
          return { key, data: result ? processAsset(key, result) : null };
        })
      );
      results.forEach(({ key, data }) => {
        newStore[key] = data;
      });
    }

    setStore(newStore);
    setLastUpdate(new Date().toLocaleString('fr-FR', { timeZone: TIMEZONE }));
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <PortfolioContext.Provider value={{ store, loading, lastUpdate, refreshAll }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => useContext(PortfolioContext);
