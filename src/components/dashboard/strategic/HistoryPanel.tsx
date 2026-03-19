'use client';

import { useStrategicDashboard } from '@/context/StrategicDashboardContext';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface HistoryPanelProps {
  onClose: () => void;
  onLoadSession: (sessionId: string) => void;
  onNewSession: () => void;
  currentSessionId: string;
}

export default function HistoryPanel({ onClose, onLoadSession, onNewSession, currentSessionId }: HistoryPanelProps) {
  const { chatSessions, deleteSession } = useStrategicDashboard();

  const sorted = [...chatSessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--panel-hover)]/40 overflow-hidden">
      {/* History header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-[var(--muted)]">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-xs font-semibold text-[var(--text)]">Historique des conversations</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--panel)] border border-[var(--border)] text-[var(--muted)]">
            {chatSessions.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewSession}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors border border-[var(--accent)]/30"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouvelle
          </button>
          <button
            onClick={onClose}
            aria-label="Fermer l'historique"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Session list */}
      <div className="max-h-[280px] overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="text-xs text-[var(--muted)] text-center py-6">Aucune conversation sauvegardée</p>
        ) : (
          sorted.map((session) => {
            const isCurrent = session.id === currentSessionId;
            const hasMessages = session.messages.length > 0;
            return (
              <div
                key={session.id}
                className={`group flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)]/50 last:border-0 transition-colors ${
                  isCurrent
                    ? 'bg-[var(--accent)]/8 border-l-2 border-l-[var(--accent)]'
                    : 'hover:bg-[var(--panel-hover)] cursor-pointer'
                }`}
                onClick={() => !isCurrent && onLoadSession(session.id)}
              >
                <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-[var(--accent)]/15' : 'bg-[var(--panel)]'}`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={isCurrent ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${isCurrent ? 'text-[var(--text)] font-medium' : 'text-[var(--text)]'}`}>
                    {hasMessages ? session.title : 'Conversation vide'}
                  </p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">
                    {formatDate(session.updatedAt)}
                    {session.messages.length > 0 && (
                      <span className="ml-1.5">· {Math.ceil(session.messages.length / 2)} échange{Math.ceil(session.messages.length / 2) > 1 ? 's' : ''}</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  aria-label="Supprimer cette conversation"
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-all"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
