'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
const STORAGE_KEY_API = 'strategic_dashboard_api_key';

interface StrategicDashboardContextValue {
  apiKey: string;
  systemPrompt: string;
  hydrated: boolean;
  setApiKey: (key: string) => void;
  setSystemPrompt: (prompt: string) => void;
  clearApiKey: () => void;
  resetSystemPrompt: () => void;
}

const StrategicDashboardContext = createContext<StrategicDashboardContextValue | null>(null);

export function StrategicDashboardProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState('');
  const [systemPrompt, setSystemPromptState] = useState(DEFAULT_SYSTEM_PROMPT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem(STORAGE_KEY_API) ?? '';
      const storedPrompt = localStorage.getItem(STORAGE_KEY_PROMPT);
      setApiKeyState(storedKey);
      if (storedPrompt) setSystemPromptState(storedPrompt);
    } catch {
      // localStorage unavailable (SSR or private browsing)
    }
    setHydrated(true);
  }, []);

  const setApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKeyState(trimmed);
    try { localStorage.setItem(STORAGE_KEY_API, trimmed); } catch {}
  };

  const setSystemPrompt = (prompt: string) => {
    setSystemPromptState(prompt);
    try { localStorage.setItem(STORAGE_KEY_PROMPT, prompt); } catch {}
  };

  const clearApiKey = () => {
    setApiKeyState('');
    try { localStorage.removeItem(STORAGE_KEY_API); } catch {}
  };

  const resetSystemPrompt = () => {
    setSystemPromptState(DEFAULT_SYSTEM_PROMPT);
    try { localStorage.removeItem(STORAGE_KEY_PROMPT); } catch {}
  };

  return (
    <StrategicDashboardContext.Provider
      value={{ apiKey, systemPrompt, hydrated, setApiKey, setSystemPrompt, clearApiKey, resetSystemPrompt }}
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
