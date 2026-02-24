import { ReactNode } from 'react';

export default function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1a1d27] border border-[#2e3347] rounded-xl p-5 mb-4 ${className}`}>
      {title && (
        <div className="text-[13px] text-[#6b7280] uppercase tracking-wide mb-3 font-semibold">{title}</div>
      )}
      {children}
    </div>
  );
}
