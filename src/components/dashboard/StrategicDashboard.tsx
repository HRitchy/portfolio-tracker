'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { useStrategicDashboard } from '@/context/StrategicDashboardContext';
import type { ChatMessage } from '@/context/StrategicDashboardContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAssets } from '@/context/AssetsContext';
import { useMacro } from '@/context/MacroContext';
import { getAssetAdvice } from '@/lib/advice';
import { buildPortfolioContext } from '@/lib/portfolioContextBuilder';
import { getModelById, PROVIDER_LABELS } from '@/lib/models';
import MessageBubble from './strategic/MessageBubble';
import HistoryPanel from './strategic/HistoryPanel';
import SettingsModal from './strategic/SettingsModal';

const QUICK_PROMPTS = [
  'Analyse le régime de marché actuel et son impact sur mon portefeuille.',
  'Quels actifs présentent les signaux les plus forts en ce moment ?',
  'Identifie les risques principaux et les niveaux critiques à surveiller.',
  'Propose une stratégie d\'allocation pour les 30 prochains jours.',
];

export default function StrategicDashboard() {
  const {
    apiKey, selectedModelId, systemPrompt, hydrated,
    currentSessionId, saveMessages, loadSession, newSession,
    chatSessions,
  } = useStrategicDashboard();
  const { store } = usePortfolio();
  const { assets, portfolioKeys } = useAssets();
  const { fearGreedData, hyObs } = useMacro();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentModel = getModelById(selectedModelId);
  const modelDisplayName = currentModel?.name ?? 'GPT-4o';
  const providerDisplayName = currentModel ? PROVIDER_LABELS[currentModel.provider] : 'OpenAI';

  const fearGreed = fearGreedData?.score ?? null;
  const hySpread = useMemo(() => {
    if (!hyObs) return null;
    const latest = hyObs.find((o) => o.value !== '.');
    if (!latest) return null;
    const parsed = parseFloat(latest.value);
    return Number.isFinite(parsed) ? parsed : null;
  }, [hyObs]);

  const { advices, marketContext } = useMemo(
    () => getAssetAdvice(store, portfolioKeys, assets, fearGreed, hySpread),
    [store, portfolioKeys, assets, fearGreed, hySpread],
  );

  const portfolioContext = useMemo(
    () => buildPortfolioContext(store, assets, portfolioKeys, advices, marketContext),
    [store, assets, portfolioKeys, advices, marketContext],
  );

  // Load messages from current session on hydration / session change
  useEffect(() => {
    if (!hydrated) return;
    const session = chatSessions.find((s) => s.id === currentSessionId);
    setMessages(session?.messages ?? []);
  }, [hydrated, currentSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;
      setError(null);

      const userMessage: ChatMessage = { role: 'user', content: content.trim() };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsStreaming(true);

      abortRef.current = new AbortController();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            messages: newMessages,
            systemPrompt,
            portfolioContext,
            modelId: selectedModelId,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: `Erreur HTTP ${response.status}` }));
          throw new Error(errData.error ?? `Erreur HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Réponse vide du serveur.');

        const decoder = new TextDecoder();
        let buffer = '';
        let finalMessages: ChatMessage[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === 'string' && delta) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + delta };
                  }
                  finalMessages = updated;
                  return updated;
                });
              }
            } catch {
              // Non-JSON SSE line, skip
            }
          }
        }

        if (finalMessages.length > 0) {
          saveMessages(finalMessages);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setMessages((prev) => {
            if (prev.length > 0) saveMessages(prev);
            return prev;
          });
        } else {
          const msg = err instanceof Error ? err.message : 'Erreur inconnue';
          setError(msg);
          setMessages((prev) => {
            const trimmed = prev.slice(0, -1);
            if (trimmed.length > 0) saveMessages(trimmed);
            return trimmed;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, apiKey, systemPrompt, portfolioContext, selectedModelId, saveMessages],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleClear = () => {
    const cleared: ChatMessage[] = [];
    setMessages(cleared);
    saveMessages(cleared);
    setError(null);
  };

  const handleLoadSession = (sessionId: string) => {
    const loaded = loadSession(sessionId);
    setMessages(loaded);
    setError(null);
    setHistoryOpen(false);
  };

  const handleNewSession = () => {
    newSession();
    setMessages([]);
    setError(null);
    setHistoryOpen(false);
  };

  if (!hydrated) return null;

  return (
    <>
      <Card className="mb-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[var(--panel-hover)] border border-[var(--border)] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2 className="font-semibold text-[var(--text)]">Dashboard Stratégique</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--panel-hover)] border border-[var(--border)] text-[var(--muted)] font-medium">
                {modelDisplayName}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)]">Agent d&apos;analyse financière propulsé par {providerDisplayName}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* History toggle */}
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              aria-label="Afficher l'historique des conversations"
              aria-expanded={historyOpen}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg transition-colors border ${
                historyOpen
                  ? 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] border-[var(--border)]'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Historique
              {chatSessions.filter((s) => s.messages.length > 0).length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--panel)] border border-[var(--border)] font-medium">
                  {chatSessions.filter((s) => s.messages.length > 0).length}
                </span>
              )}
            </button>

            {messages.length > 0 && (
              <button
                onClick={handleClear}
                aria-label="Effacer la conversation"
                className="px-3 py-1.5 text-[11px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] rounded-lg transition-colors border border-transparent hover:border-[var(--border)]"
              >
                Effacer
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Configurer le Dashboard Stratégique"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] rounded-lg transition-colors border border-[var(--border)]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Configurer
            </button>
          </div>
        </div>

        {/* History Panel */}
        {historyOpen && (
          <HistoryPanel
            onClose={() => setHistoryOpen(false)}
            onLoadSession={handleLoadSession}
            onNewSession={handleNewSession}
            currentSessionId={currentSessionId}
          />
        )}

        {/* API key not set → prompt to configure */}
        {!apiKey ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--panel-hover)] border border-[var(--border)] flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted)]" aria-hidden="true">
                <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--text)] mb-1.5">Clé API requise</p>
            <p className="text-xs text-[var(--muted)] max-w-xs mb-5">
              Configurez votre clé API et choisissez un modèle d&apos;IA pour activer l&apos;analyse financière. Les clés sont stockées localement dans votre navigateur.
            </p>
            <button
              onClick={() => setSettingsOpen(true)}
              className="btn-glow flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] rounded-xl hover:opacity-90 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Configurer maintenant
            </button>
          </div>
        ) : (
          <>
            {/* Conversation area */}
            <div
              className="min-h-[200px] max-h-[500px] overflow-y-auto mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg-soft,var(--panel-hover))]/30 p-4"
              aria-live="polite"
              aria-label="Conversation avec l'agent financier"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center">
                  <div className="text-center mb-6">
                    <p className="text-sm text-[var(--muted)] mb-1">
                      Agent prêt — données du portefeuille chargées
                    </p>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--muted)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" aria-hidden="true" />
                      {portfolioKeys.length} actif{portfolioKeys.length > 1 ? 's' : ''} analysé{portfolioKeys.length > 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="text-left text-xs text-[var(--muted)] bg-[var(--panel-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 hover:text-[var(--text)] hover:border-[var(--accent)] transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <MessageBubble
                      key={i}
                      message={msg}
                      isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 mb-4 px-4 py-3 rounded-xl border border-[#ef4444]/30 bg-[rgba(239,68,68,0.05)] text-[#ef4444] text-xs"
              >
                <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-[#ef4444]/60 hover:text-[#ef4444]" aria-label="Fermer l'erreur">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            {/* Input area */}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez une question sur votre portefeuille… (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
                  rows={1}
                  disabled={isStreaming}
                  aria-label="Message à l'agent financier"
                  className="w-full bg-[var(--panel-hover)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none leading-relaxed disabled:opacity-50"
                  style={{ minHeight: '48px' }}
                />
              </div>

              {isStreaming ? (
                <button
                  onClick={handleStop}
                  aria-label="Arrêter la génération"
                  className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-[var(--panel-hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[#ef4444] hover:border-[#ef4444]/40 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  aria-label="Envoyer le message"
                  className="btn-glow shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </div>
          </>
        )}
      </Card>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
