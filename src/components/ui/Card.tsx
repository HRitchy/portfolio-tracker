import { ReactNode } from 'react';

export default function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`data-card p-5 md:p-6 mb-4 ${className}`}>
      {title && (
        <div className="text-[11px] md:text-xs text-[var(--muted)] uppercase tracking-[0.16em] mb-4 font-semibold">{title}</div>
      )}
      {children}
    </div>
  );
}
