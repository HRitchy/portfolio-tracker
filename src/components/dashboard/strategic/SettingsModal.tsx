'use client';

import { useState, useRef, useEffect } from 'react';
import { useStrategicDashboard, DEFAULT_SYSTEM_PROMPT } from '@/context/StrategicDashboardContext';
import { AI_MODELS, getModelById, PROVIDER_LABELS, API_KEY_PLACEHOLDERS } from '@/lib/models';
import type { AIProvider } from '@/lib/models';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const {
    selectedModelId, systemPrompt,
    setSelectedModelId, setSystemPrompt,
    resetSystemPrompt, getApiKeyForProvider, setApiKeyForProvider,
  } = useStrategicDashboard();

  const [localModelId, setLocalModelId] = useState(selectedModelId);
  const localModel = getModelById(localModelId);
  const localProvider: AIProvider = localModel?.provider ?? 'openai';

  const [localKeys, setLocalKeys] = useState<Record<AIProvider, string>>({
    openai: getApiKeyForProvider('openai'),
    anthropic: getApiKeyForProvider('anthropic'),
    google: getApiKeyForProvider('google'),
  });
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [showKey, setShowKey] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const localKey = localKeys[localProvider];

  // Focus trap + Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      ) ?? [];
      const els = Array.from(focusable);
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = () => {
    setSelectedModelId(localModelId);
    for (const p of ['openai', 'anthropic', 'google'] as AIProvider[]) {
      setApiKeyForProvider(p, localKeys[p]);
    }
    setSystemPrompt(localPrompt);
    onClose();
  };

  const handleResetPrompt = () => {
    setLocalPrompt(DEFAULT_SYSTEM_PROMPT);
    resetSystemPrompt();
  };

  const handleClearKey = () => {
    setLocalKeys((prev) => ({ ...prev, [localProvider]: '' }));
  };

  const providers: AIProvider[] = ['openai', 'anthropic', 'google'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Paramètres du Dashboard Stratégique"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel rounded-2xl shadow-2xl p-6 md:p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-lg text-[var(--text)]">Configuration — Dashboard Stratégique</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Paramètres de l&apos;agent d&apos;analyse IA</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Model selection */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] mb-2">
            Modèle d&apos;IA
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {providers.map((provider) => {
              const models = AI_MODELS.filter((m) => m.provider === provider);
              return (
                <div key={provider} className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] px-1">
                    {PROVIDER_LABELS[provider]}
                  </p>
                  {models.map((model) => {
                    const isSelected = model.id === localModelId;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => { setLocalModelId(model.id); setShowKey(false); }}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)] font-medium'
                            : 'border-[var(--border)] bg-[var(--panel-hover)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true" className="text-[var(--accent)] shrink-0">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          {model.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* API Key section */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] mb-2">
            Clé API {PROVIDER_LABELS[localProvider]}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={localKey}
              onChange={(e) => setLocalKeys((prev) => ({ ...prev, [localProvider]: e.target.value }))}
              placeholder={API_KEY_PLACEHOLDERS[localProvider]}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-[var(--panel-hover)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors pr-24 font-mono"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                className="px-2 py-1 text-[10px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)] rounded-lg transition-colors"
              >
                {showKey ? 'Masquer' : 'Afficher'}
              </button>
              {localKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  aria-label="Effacer la clé API"
                  className="px-2 py-1 text-[10px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] rounded-lg transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-2 flex items-start gap-1.5">
            <svg className="shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            La clé est stockée uniquement dans votre navigateur (localStorage). Elle transite par notre proxy serveur uniquement pour les appels {PROVIDER_LABELS[localProvider]} et n&apos;est jamais enregistrée.
          </p>
        </div>

        {/* System Prompt section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              System Prompt — Posture d&apos;expert financier
            </label>
            <button
              type="button"
              onClick={handleResetPrompt}
              className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] px-2 py-1 rounded-lg transition-colors"
            >
              Réinitialiser
            </button>
          </div>
          <textarea
            value={localPrompt}
            onChange={(e) => setLocalPrompt(e.target.value)}
            rows={12}
            spellCheck={false}
            className="w-full bg-[var(--panel-hover)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-y font-mono leading-relaxed"
          />
          <p className="text-[11px] text-[var(--muted)] mt-2">
            Ce prompt définit la posture et le cadre d&apos;analyse de l&apos;agent. Il est injecté avant chaque conversation avec les données du portefeuille.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] rounded-xl transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="btn-glow px-5 py-2 text-sm font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] rounded-xl hover:opacity-90 transition-opacity"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
