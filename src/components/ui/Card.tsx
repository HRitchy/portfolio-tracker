import { ReactNode } from 'react';

export default function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`data-card p-4 md:p-5 lg:p-6 3xl:p-8 mb-3 md:mb-4 ${className}`}>
      {title && (
        <div className="text-[10px] md:text-[11px] lg:text-xs text-[var(--muted)] uppercase tracking-[0.16em] mb-3 md:mb-4 font-semibold">{title}</div>
      )}
      {children}
    </div>
  );
}
