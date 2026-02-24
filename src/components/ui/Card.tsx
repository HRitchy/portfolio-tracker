import { ReactNode } from 'react';

export default function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5 mb-4 ${className}`}>
      {title && (
        <div className="text-[13px] text-[var(--muted)] uppercase tracking-wide mb-3 font-semibold">{title}</div>
      )}
      {children}
    </div>
  );
}
