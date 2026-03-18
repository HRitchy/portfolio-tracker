'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/models';
import type { AIProvider } from '@/lib/models';
import { encryptValue, decryptValue, isEncrypted } from '@/lib/cryptoStorage';

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
const STORAGE_KEY_SESSIONS = 'strategic_dashboard_chat_sessions';
const STORAGE_KEY_CURRENT_SESSION = 'strategic_dashboard_current_session';

const MAX_SESSIONS = 50;

function apiKeyStorageKey(provider: AIProvider): string {
  return `strategic_dashboard_api_key_${provider}`;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'Nouvelle conversation';
  return firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? '…' : '');
}

function createNewSession(): ChatSession {
  return {
    id: generateSessionId(),
    title: 'Nouvelle conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
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
  // Chat history
  chatSessions: ChatSession[];
  currentSessionId: string;
  currentSession: ChatSession;
  saveMessages: (messages: ChatMessage[]) => void;
  loadSession: (sessionId: string) => ChatMessage[];
  deleteSession: (sessionId: string) => void;
  newSession: () => ChatMessage[];
}

const StrategicDashboardContext = createContext<StrategicDashboardContextValue | null>(null);

export function StrategicDashboardProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({ openai: '', anthropic: '', google: '' });
  const [selectedModelId, setSelectedModelIdState] = useState(DEFAULT_MODEL_ID);
  const [systemPrompt, setSystemPromptState] = useState(DEFAULT_SYSTEM_PROMPT);
  const [hydrated, setHydrated] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  const currentProvider = getModelById(selectedModelId)?.provider ?? 'openai';
  const apiKey = apiKeys[currentProvider];

  const currentSession = chatSessions.find((s) => s.id === currentSessionId) ?? createNewSession();

  useEffect(() => {
    async function hydrate() {
    try {
      const storedModel = localStorage.getItem(STORAGE_KEY_MODEL) ?? DEFAULT_MODEL_ID;
      const storedPrompt = localStorage.getItem(STORAGE_KEY_PROMPT);

      const keys: Record<AIProvider, string> = { openai: '', anthropic: '', google: '' };
      for (const p of ['openai', 'anthropic', 'google'] as AIProvider[]) {
        const stored = localStorage.getItem(apiKeyStorageKey(p)) ?? '';
        if (stored && isEncrypted(stored)) {
          try {
            keys[p] = await decryptValue(stored);
          } catch {
            // Decryption failed (e.g. key rotated) — treat as empty
            keys[p] = '';
          }
        } else {
          keys[p] = stored;
          // Encrypt the plaintext key now that crypto is available
          if (stored) {
            try {
              localStorage.setItem(apiKeyStorageKey(p), await encryptValue(stored));
            } catch { /* non-critical */ }
          }
        }
      }
      // Migrate old single key if present
      const legacyKey = localStorage.getItem('strategic_dashboard_api_key');
      if (legacyKey && !keys.openai) {
        keys.openai = legacyKey;
        try {
          localStorage.setItem(apiKeyStorageKey('openai'), await encryptValue(legacyKey));
        } catch {
          localStorage.setItem(apiKeyStorageKey('openai'), legacyKey);
        }
        localStorage.removeItem('strategic_dashboard_api_key');
      }

      setApiKeys(keys);
      setSelectedModelIdState(storedModel);
      if (storedPrompt) setSystemPromptState(storedPrompt);

      // Load chat sessions
      const rawSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
      const sessions: ChatSession[] = rawSessions ? JSON.parse(rawSessions) : [];
      const rawCurrentId = localStorage.getItem(STORAGE_KEY_CURRENT_SESSION);

      if (sessions.length === 0) {
        const initial = createNewSession();
        setChatSessions([initial]);
        setCurrentSessionId(initial.id);
      } else {
        setChatSessions(sessions);
        const existsInSessions = sessions.some((s) => s.id === rawCurrentId);
        setCurrentSessionId(existsInSessions ? rawCurrentId! : sessions[0].id);
      }
    } catch {
      const initial = createNewSession();
      setChatSessions([initial]);
      setCurrentSessionId(initial.id);
    }
    setHydrated(true);
    }
    hydrate();
  }, []);

  // Persist sessions to localStorage whenever they change (after hydration)
  useEffect(() => {
    if (!hydrated || chatSessions.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(chatSessions));
    } catch {}
  }, [chatSessions, hydrated]);

  useEffect(() => {
    if (!hydrated || !currentSessionId) return;
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_SESSION, currentSessionId);
    } catch {}
  }, [currentSessionId, hydrated]);

  const setApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKeys((prev) => ({ ...prev, [currentProvider]: trimmed }));
    if (trimmed) {
      encryptValue(trimmed)
        .then((enc) => { try { localStorage.setItem(apiKeyStorageKey(currentProvider), enc); } catch {} })
        .catch(() => { try { localStorage.setItem(apiKeyStorageKey(currentProvider), trimmed); } catch {} });
    } else {
      try { localStorage.removeItem(apiKeyStorageKey(currentProvider)); } catch {}
    }
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
    if (trimmed) {
      encryptValue(trimmed)
        .then((enc) => { try { localStorage.setItem(apiKeyStorageKey(provider), enc); } catch {} })
        .catch(() => { try { localStorage.setItem(apiKeyStorageKey(provider), trimmed); } catch {} });
    } else {
      try { localStorage.removeItem(apiKeyStorageKey(provider)); } catch {}
    }
  };

  const saveMessages = (messages: ChatMessage[]) => {
    setChatSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === currentSessionId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        messages,
        title: generateTitle(messages),
        updatedAt: Date.now(),
      };
      // Keep only MAX_SESSIONS most recent
      return updated.slice(-MAX_SESSIONS);
    });
  };

  const loadSession = (sessionId: string): ChatMessage[] => {
    setCurrentSessionId(sessionId);
    const session = chatSessions.find((s) => s.id === sessionId);
    return session?.messages ?? [];
  };

  const deleteSession = (sessionId: string) => {
    setChatSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const fresh = createNewSession();
        setCurrentSessionId(fresh.id);
        return [fresh];
      }
      if (sessionId === currentSessionId) {
        setCurrentSessionId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  };

  const newSession = (): ChatMessage[] => {
    const fresh = createNewSession();
    setChatSessions((prev) => [...prev.slice(-MAX_SESSIONS + 1), fresh]);
    setCurrentSessionId(fresh.id);
    return [];
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
        chatSessions,
        currentSessionId,
        currentSession,
        saveMessages,
        loadSession,
        deleteSession,
        newSession,
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
