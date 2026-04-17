'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { AssetConfig } from '@/lib/types';
import { DISPLAYED_ASSETS, COLOR_PALETTE } from '@/lib/config';

// Key bumped so the reduced indicator-only dashboard isn't overridden
// by previously persisted portfolios.
const LOCAL_KEY = 'portfolio_assets_v2';

interface AssetsContextType {
  assets: Record<string, AssetConfig>;
  assetKeys: string[];
  portfolioKeys: string[];
  indicatorKeys: string[];
  addAsset: (key: string, config: AssetConfig) => void;
  removeAsset: (key: string) => void;
  nextColor: () => { color: string; colorBg: string };
}

const AssetsContext = createContext<AssetsContextType>({
  assets: DISPLAYED_ASSETS,
  assetKeys: Object.keys(DISPLAYED_ASSETS),
  portfolioKeys: Object.keys(DISPLAYED_ASSETS).filter((k) => DISPLAYED_ASSETS[k].type === 'portfolio'),
  indicatorKeys: Object.keys(DISPLAYED_ASSETS).filter((k) => DISPLAYED_ASSETS[k].type === 'indicator'),
  addAsset: () => {},
  removeAsset: () => {},
  nextColor: () => COLOR_PALETTE[0],
});

function loadAssets(): Record<string, AssetConfig> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return DISPLAYED_ASSETS;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      return parsed;
    }
    return DISPLAYED_ASSETS;
  } catch {
    return DISPLAYED_ASSETS;
  }
}

function saveAssets(assets: Record<string, AssetConfig>) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(assets));
  } catch {
    // localStorage unavailable
  }
}

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Record<string, AssetConfig>>(() => loadAssets());

  const assetKeys = useMemo(() => Object.keys(assets), [assets]);
  const portfolioKeys = useMemo(() => assetKeys.filter((k) => assets[k].type === 'portfolio'), [assetKeys, assets]);
  const indicatorKeys = useMemo(() => assetKeys.filter((k) => assets[k].type === 'indicator'), [assetKeys, assets]);

  const nextColor = useCallback(() => {
    const usedColors = new Set(Object.values(assets).map((a) => a.color));
    const available = COLOR_PALETTE.find((c) => !usedColors.has(c.color));
    return available ?? COLOR_PALETTE[Object.keys(assets).length % COLOR_PALETTE.length];
  }, [assets]);

  const addAsset = useCallback((key: string, config: AssetConfig) => {
    setAssets((prev) => {
      const next = { ...prev, [key]: config };
      saveAssets(next);
      return next;
    });
  }, []);

  const removeAsset = useCallback((key: string) => {
    setAssets((prev) => {
      const next = { ...prev };
      delete next[key];
      saveAssets(next);
      return next;
    });
  }, []);

  return (
    <AssetsContext.Provider
      value={{ assets, assetKeys, portfolioKeys, indicatorKeys, addAsset, removeAsset, nextColor }}
    >
      {children}
    </AssetsContext.Provider>
  );
}

export const useAssets = () => useContext(AssetsContext);
