'use client';

import type { ChatMessage } from '@/context/StrategicDashboardContext';

export default function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
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
