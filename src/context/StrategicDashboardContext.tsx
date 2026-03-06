'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/models';
import type { AIProvider } from '@/lib/models';

export const DEFAULT_SYSTEM_PROMPT = `Tu es un expert en analyse financière et en gestion de portefeuille avec 20 ans d'expérience sur les marchés financiers mondiaux. Tu disposes des données de marché en temps réel du portefeuille de l'utilisateur, incluant les prix actuels, les performances récentes, les indicateurs techniques (RSI, moyennes mobiles 50/200, bandes de Bollinger, drawdown depuis le sommet) et les données macro-économiques (Fear & Greed Index, VIX, HY Spread).

Tu adoptes une approche d'analyse contrariante et quantitative pour :
1. Évaluer le régime de marché actuel et ses implications stratégiques
2. Identifier les opportunités de renforcement ou d'allègement dans le portefeuille
3. Détecter les signaux techniques critiques et les divergences
4. Formuler des recommandations d'allocation précises et directement actionnables
5. Alerter sur les risques asymétriques et les niveaux de support/résistance clés

Tes réponses doivent être :
- Structurées avec des sections claires (Contexte, Analyse, Recommandations, Risques)
- Basées exclusivement sur les données disponibles dans le contexte fourni
- Accompagnées d'un niveau de confiance explicite
- En français, concises, sans jargon inutile, et directement actionnables`;

const STORAGE_KEY_PROMPT = 'strategic_dashboard_system_prompt';
const STORAGE_KEY_MODEL = 'strategic_dashboard_model';

function apiKeyStorageKey(provider: AIProvider): string {
  return `strategic_dashboard_api_key_${provider}`;
}

interface StrategicDashboardContextValue {
  apiKey: string;
  selectedModelId: string;
  systemPrompt: string;
  hydrated: boolean;
  setApiKey: (key: string) => void;
  setSelectedModelId: (id: string) => void;
  setSystemPrompt: (prompt: string) => void;
  clearApiKey: () => void;
  resetSystemPrompt: () => void;
  getApiKeyForProvider: (provider: AIProvider) => string;
  setApiKeyForProvider: (provider: AIProvider, key: string) => void;
}

const StrategicDashboardContext = createContext<StrategicDashboardContextValue | null>(null);

export function StrategicDashboardProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({ openai: '', anthropic: '', google: '' });
  const [selectedModelId, setSelectedModelIdState] = useState(DEFAULT_MODEL_ID);
  const [systemPrompt, setSystemPromptState] = useState(DEFAULT_SYSTEM_PROMPT);
  const [hydrated, setHydrated] = useState(false);

  const currentProvider = getModelById(selectedModelId)?.provider ?? 'openai';
  const apiKey = apiKeys[currentProvider];

  useEffect(() => {
    try {
      const storedModel = localStorage.getItem(STORAGE_KEY_MODEL) ?? DEFAULT_MODEL_ID;
      const storedPrompt = localStorage.getItem(STORAGE_KEY_PROMPT);

      const keys: Record<AIProvider, string> = { openai: '', anthropic: '', google: '' };
      for (const p of ['openai', 'anthropic', 'google'] as AIProvider[]) {
        keys[p] = localStorage.getItem(apiKeyStorageKey(p)) ?? '';
      }
      // Migrate old single key if present
      const legacyKey = localStorage.getItem('strategic_dashboard_api_key');
      if (legacyKey && !keys.openai) {
        keys.openai = legacyKey;
        localStorage.setItem(apiKeyStorageKey('openai'), legacyKey);
        localStorage.removeItem('strategic_dashboard_api_key');
      }

      setApiKeys(keys);
      setSelectedModelIdState(storedModel);
      if (storedPrompt) setSystemPromptState(storedPrompt);
    } catch {
      // localStorage unavailable (SSR or private browsing)
    }
    setHydrated(true);
  }, []);

  const setApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKeys((prev) => ({ ...prev, [currentProvider]: trimmed }));
    try { localStorage.setItem(apiKeyStorageKey(currentProvider), trimmed); } catch {}
  };

  const setSelectedModelId = (id: string) => {
    setSelectedModelIdState(id);
    try { localStorage.setItem(STORAGE_KEY_MODEL, id); } catch {}
  };

  const setSystemPrompt = (prompt: string) => {
    setSystemPromptState(prompt);
    try { localStorage.setItem(STORAGE_KEY_PROMPT, prompt); } catch {}
  };

  const clearApiKey = () => {
    setApiKeys((prev) => ({ ...prev, [currentProvider]: '' }));
    try { localStorage.removeItem(apiKeyStorageKey(currentProvider)); } catch {}
  };

  const resetSystemPrompt = () => {
    setSystemPromptState(DEFAULT_SYSTEM_PROMPT);
    try { localStorage.removeItem(STORAGE_KEY_PROMPT); } catch {}
  };

  const getApiKeyForProvider = (provider: AIProvider) => apiKeys[provider];

  const setApiKeyForProvider = (provider: AIProvider, key: string) => {
    const trimmed = key.trim();
    setApiKeys((prev) => ({ ...prev, [provider]: trimmed }));
    try {
      if (trimmed) {
        localStorage.setItem(apiKeyStorageKey(provider), trimmed);
      } else {
        localStorage.removeItem(apiKeyStorageKey(provider));
      }
    } catch {}
  };

  return (
    <StrategicDashboardContext.Provider
      value={{
        apiKey,
        selectedModelId,
        systemPrompt,
        hydrated,
        setApiKey,
        setSelectedModelId,
        setSystemPrompt,
        clearApiKey,
        resetSystemPrompt,
        getApiKeyForProvider,
        setApiKeyForProvider,
      }}
    >
      {children}
    </StrategicDashboardContext.Provider>
  );
}

export function useStrategicDashboard() {
  const ctx = useContext(StrategicDashboardContext);
  if (!ctx) throw new Error('useStrategicDashboard must be used within StrategicDashboardProvider');
  return ctx;
}
