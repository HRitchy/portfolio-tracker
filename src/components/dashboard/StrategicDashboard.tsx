'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { useStrategicDashboard, DEFAULT_SYSTEM_PROMPT } from '@/context/StrategicDashboardContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAssets } from '@/context/AssetsContext';
import { useMacro } from '@/context/MacroContext';
import { getAssetAdvice } from '@/lib/advice';
import { Store, AssetAdvice, MarketContext } from '@/lib/types';
import { AssetConfig } from '@/lib/types';

/* ─────────────────────────────────────────────
   Portfolio context builder
   ───────────────────────────────────────────── */

function buildPortfolioContext(
  store: Store,
  assets: Record<string, AssetConfig>,
  portfolioKeys: string[],
  advices: AssetAdvice[],
  marketContext: MarketContext,
): string {
  const lines: string[] = [];

  lines.push('### Régime de marché');
  lines.push(`- Régime actuel: **${marketContext.regime}** (score: ${marketContext.regimeScore > 0 ? '+' : ''}${marketContext.regimeScore}/10)`);
  if (marketContext.fearGreed !== null) lines.push(`- Fear & Greed Index: ${Math.round(marketContext.fearGreed)}/100`);
  if (marketContext.vixLevel !== null) lines.push(`- VIX: ${marketContext.vixLevel.toFixed(2)} (MA50: ${marketContext.vixMA50?.toFixed(2) ?? 'N/A'})`);
  if (marketContext.hySpread !== null) lines.push(`- HY Spread: ${marketContext.hySpread.toFixed(2)}%`);
  if (marketContext.regimeReasons.length > 0) {
    lines.push(`- Signaux: ${marketContext.regimeReasons.join(' | ')}`);
  }

  lines.push('');
  lines.push('### Actifs du portefeuille');

  for (const key of portfolioKeys) {
    const asset = assets[key];
    const data = store[key];
    if (!asset || !data) continue;

    const lastPoint = data.series[data.series.length - 1];
    const advice = advices.find((a) => a.key === key);
    const m = advice?.metrics;

    lines.push(`\n**${asset.name}** (${asset.assetClass} — ${asset.symbol})`);
    if (lastPoint) {
      lines.push(`- Prix actuel: ${lastPoint.close.toFixed(2)}`);
      if (lastPoint.variation !== null) lines.push(`- Variation journalière: ${lastPoint.variation > 0 ? '+' : ''}${lastPoint.variation.toFixed(2)}%`);
    }
    if (advice) {
      lines.push(`- Recommandation algo: **${advice.advice}** | Conviction: ${advice.conviction} | Score: ${advice.score > 0 ? '+' : ''}${advice.score}/16`);
    }
    if (m) {
      if (m.drawdown !== null) lines.push(`- Drawdown depuis sommet: ${m.drawdown.toFixed(1)}%`);
      if (m.rsi7 !== null && m.rsi14 !== null && m.rsi28 !== null) {
        lines.push(`- RSI: 7j=${m.rsi7.toFixed(1)} | 14j=${m.rsi14.toFixed(1)} | 28j=${m.rsi28.toFixed(1)}`);
      }
      if (m.distFromMA50Pct !== null && m.distFromMA200Pct !== null) {
        lines.push(`- Distance MM50: ${m.distFromMA50Pct > 0 ? '+' : ''}${m.distFromMA50Pct.toFixed(1)}% | Distance MM200: ${m.distFromMA200Pct > 0 ? '+' : ''}${m.distFromMA200Pct.toFixed(1)}%`);
      }
      if (m.trendMA50vs200) {
        lines.push(`- Signal MA: ${m.trendMA50vs200 === 'golden_cross' ? 'Golden Cross (haussier)' : 'Death Cross (baissier)'}`);
      }
      if (m.bollingerPctB !== null) lines.push(`- Bollinger %B: ${m.bollingerPctB.toFixed(0)}% (0=bande inf, 100=bande sup)`);
      if (m.perf30d !== null) lines.push(`- Perf 30j: ${m.perf30d > 0 ? '+' : ''}${m.perf30d.toFixed(2)}%`);
      if (m.perf90d !== null) lines.push(`- Perf 90j: ${m.perf90d > 0 ? '+' : ''}${m.perf90d.toFixed(2)}%`);
      if (m.volatility30d !== null) lines.push(`- Volatilité 30j annualisée: ${m.volatility30d}%`);
      if (m.rsiDivergence) {
        lines.push(`- Divergence RSI: ${m.rsiDivergence === 'bullish' ? 'Haussière (signal achat)' : 'Baissière (signal vente)'}`);
      }
      if (advice?.reasons.length) lines.push(`- Signaux algo: ${advice.reasons.join(' | ')}`);
    }
  }

  return lines.join('\n');
}

/* ─────────────────────────────────────────────
   Settings Modal
   ───────────────────────────────────────────── */

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { apiKey, systemPrompt, setApiKey, setSystemPrompt, clearApiKey, resetSystemPrompt } = useStrategicDashboard();
  const [localKey, setLocalKey] = useState(apiKey);
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [showKey, setShowKey] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap + Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])'
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
    setApiKey(localKey);
    setSystemPrompt(localPrompt);
    onClose();
  };

  const handleResetPrompt = () => {
    setLocalPrompt(DEFAULT_SYSTEM_PROMPT);
    resetSystemPrompt();
  };

  const handleClearKey = () => {
    setLocalKey('');
    clearApiKey();
  };

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
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-[var(--border)] rounded-2xl shadow-2xl p-6 md:p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-lg text-[var(--text)]">Configuration — Dashboard Stratégique</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Paramètres de l&apos;agent d&apos;analyse GPT-4o</p>
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

        {/* API Key section */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] mb-2">
            Clé API OpenAI
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="sk-..."
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
            La clé est stockée uniquement dans votre navigateur (localStorage). Elle transite par notre proxy serveur uniquement pour les appels OpenAI et n&apos;est jamais enregistrée.
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
            className="px-5 py-2 text-sm font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] rounded-xl hover:opacity-90 transition-opacity"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Message bubble
   ───────────────────────────────────────────── */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--panel-hover)] border border-[var(--border)] flex items-center justify-center mt-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="text-[var(--muted)]">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z" />
            <path d="M12 8v4l3 3" />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[var(--accent)] text-[var(--accent-contrast)] rounded-br-sm'
            : 'bg-[var(--panel-hover)] border border-[var(--border)] text-[var(--text)] rounded-bl-sm'
        }`}
      >
        {message.content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-current ml-1 animate-pulse align-text-bottom rounded-sm" aria-hidden="true" />
        )}
      </div>
      {isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center mt-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-[var(--muted)]">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Quick-prompt suggestions
   ───────────────────────────────────────────── */

const QUICK_PROMPTS = [
  'Analyse le régime de marché actuel et son impact sur mon portefeuille.',
  'Quels actifs présentent les signaux les plus forts en ce moment ?',
  'Identifie les risques principaux et les niveaux critiques à surveiller.',
  'Propose une stratégie d\'allocation pour les 30 prochains jours.',
];

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */

export default function StrategicDashboard() {
  const { apiKey, systemPrompt, hydrated } = useStrategicDashboard();
  const { store } = usePortfolio();
  const { assets, portfolioKeys } = useAssets();
  const { fearGreedData, hyObs } = useMacro();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

      const userMessage: Message = { role: 'user', content: content.trim() };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsStreaming(true);

      abortRef.current = new AbortController();

      try {
        const response = await fetch('/api/gpt4', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openai-key': apiKey,
          },
          body: JSON.stringify({
            messages: newMessages,
            systemPrompt,
            portfolioContext,
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
                  return updated;
                });
              }
            } catch {
              // Non-JSON SSE line, skip
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // User cancelled
        } else {
          const msg = err instanceof Error ? err.message : 'Erreur inconnue';
          setError(msg);
          setMessages((prev) => prev.slice(0, -1)); // Remove empty assistant message
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, apiKey, systemPrompt, portfolioContext],
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
    setMessages([]);
    setError(null);
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
                GPT-4o
              </span>
            </div>
            <p className="text-xs text-[var(--muted)]">Agent d&apos;analyse financière propulsé par OpenAI</p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* API key not set → prompt to configure */}
        {!apiKey ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--panel-hover)] border border-[var(--border)] flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted)]" aria-hidden="true">
                <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--text)] mb-1.5">Clé API OpenAI requise</p>
            <p className="text-xs text-[var(--muted)] max-w-xs mb-5">
              Configurez votre clé API OpenAI pour activer l&apos;analyse financière par GPT-4o. Elle sera stockée localement dans votre navigateur.
            </p>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] rounded-xl hover:opacity-90 transition-opacity"
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
                  {/* Welcome */}
                  <div className="text-center mb-6">
                    <p className="text-sm text-[var(--muted)] mb-1">
                      Agent prêt — données du portefeuille chargées
                    </p>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--muted)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" aria-hidden="true" />
                      {portfolioKeys.length} actif{portfolioKeys.length > 1 ? 's' : ''} analysé{portfolioKeys.length > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Quick prompts */}
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
                  className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
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
