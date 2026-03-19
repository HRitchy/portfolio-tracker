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
import { DEFAULT_ASSETS, COLOR_PALETTE } from '@/lib/config';

const LOCAL_KEY = 'portfolio_assets';

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
  assets: DEFAULT_ASSETS,
  assetKeys: Object.keys(DEFAULT_ASSETS),
  portfolioKeys: Object.keys(DEFAULT_ASSETS).filter((k) => DEFAULT_ASSETS[k].type === 'portfolio'),
  indicatorKeys: Object.keys(DEFAULT_ASSETS).filter((k) => DEFAULT_ASSETS[k].type === 'indicator'),
  addAsset: () => {},
  removeAsset: () => {},
  nextColor: () => COLOR_PALETTE[0],
});

function loadAssets(): Record<string, AssetConfig> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return DEFAULT_ASSETS;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      return parsed;
    }
    return DEFAULT_ASSETS;
  } catch {
    return DEFAULT_ASSETS;
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
