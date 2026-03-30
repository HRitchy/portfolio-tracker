'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAssets } from '@/context/AssetsContext';
import { AssetConfig } from '@/lib/types';
import { COLOR_PALETTE } from '@/lib/config';

const ASSET_CLASSES = ['Actions', 'Crypto', 'Métaux', 'Obligations', 'Devises', 'Matières premières', 'Autre'];

export default function AddAssetModal({
  type,
  onClose,
}: {
  type: 'portfolio' | 'indicator';
  onClose: () => void;
}) {
  const { assets, addAsset, nextColor } = useAssets();
  const defaultColor = nextColor();
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState(ASSET_CLASSES[0]);
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isPortfolio = type === 'portfolio';

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimSymbol = symbol.trim().toUpperCase();
    const trimName = name.trim();
    if (!trimSymbol || !trimName) {
      setError('Le symbole et le nom sont requis.');
      return;
    }

    // Generate a key from the name (slugified)
    const key = trimName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!key) {
      setError('Nom invalide.');
      return;
    }

    if (assets[key]) {
      setError(`Un actif avec la clé "${key}" existe déjà.`);
      return;
    }

    // Verify the symbol exists on Yahoo Finance
    setTesting(true);
    try {
      const resp = await fetch(`/api/yahoo/${encodeURIComponent(trimSymbol)}?days=5`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        setError(`Symbole Yahoo "${trimSymbol}" introuvable ou invalide.`);
        setTesting(false);
        return;
      }
      const data = await resp.json();
      if (!data.result?.timestamp?.length) {
        setError(`Aucune donnée pour le symbole "${trimSymbol}".`);
        setTesting(false);
        return;
      }
    } catch {
      setError('Erreur de connexion. Vérifiez le symbole et réessayez.');
      setTesting(false);
      return;
    }
    setTesting(false);

    const config: AssetConfig = {
      symbol: trimSymbol,
      name: trimName,
      assetClass,
      type,
      color: selectedColor.color,
      colorBg: selectedColor.colorBg,
      hasRSI: isPortfolio,
      hasMM: isPortfolio,
      hasDrawdown: isPortfolio,
      hasBollinger: isPortfolio,
    };

    addAsset(key, config);
    onClose();
  }, [symbol, name, assetClass, type, isPortfolio, assets, addAsset, onClose, selectedColor]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Ajouter un ${isPortfolio ? 'actif' : 'indicateur'}`}
        className="relative z-10 w-full max-w-md mx-4 bg-[var(--panel)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[var(--text)]">
            Ajouter un {isPortfolio ? 'actif' : 'indicateur'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1.5">
              Symbole Yahoo Finance
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="ex: AAPL, BTC-EUR, ^GSPC"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--panel-hover)] border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1.5">
              Nom d&apos;affichage
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Apple, Bitcoin, S&P 500"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--panel-hover)] border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1.5">
              Classe d&apos;actif
            </label>
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--panel-hover)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              {ASSET_CLASSES.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1.5">
              Couleur
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((paletteColor) => {
                const isSelected = selectedColor.color === paletteColor.color;
                return (
                  <button
                    key={paletteColor.color}
                    type="button"
                    onClick={() => setSelectedColor(paletteColor)}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: paletteColor.color,
                      borderColor: isSelected ? 'var(--text)' : 'transparent',
                    }}
                    aria-label={`Choisir la couleur ${paletteColor.color}`}
                    aria-pressed={isSelected}
                  />
                );
              })}
            </div>
          </div>

          {error && (
            <div className="text-xs text-[#ef4444] bg-[rgba(239,68,68,0.1)] rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={testing}
            className="btn-glow w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-wait"
          >
            {testing ? 'Vérification du symbole...' : 'Ajouter'}
          </button>
        </form>
      </div>
    </div>
  );
}
