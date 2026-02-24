'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '@/context/PortfolioContext';

const navItems = [
  { section: 'Vue generale', items: [
    { key: 'dashboard', href: '/', label: 'Dashboard', icon: true },
  ]},
  { section: 'Actifs', items: [
    { key: 'mwre',  href: '/asset/mwre',  label: 'MSCI World',      color: '#6366f1' },
    { key: 'btc',   href: '/asset/btc',   label: 'Bitcoin',         color: '#f7931a' },
    { key: 'glda',  href: '/asset/glda',  label: 'Or (Gold)',       color: '#eab308' },
    { key: 'xeon',  href: '/asset/xeon',  label: 'Fonds Monetaire', color: '#10b981' },
  ]},
  { section: 'Indicateurs', items: [
    { key: 'vix',    href: '/asset/vix',    label: 'VIX',     color: '#ef4444' },
    { key: 'eurusd', href: '/asset/eurusd', label: 'USD/EUR', color: '#3b82f6' },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();
  const { lastUpdate } = usePortfolio();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href;
  }

  return (
    <nav className="w-[260px] bg-[#1a1d27] border-r border-[#2e3347] flex flex-col fixed top-0 left-0 bottom-0 z-50 max-md:hidden">
      <div className="px-5 pb-5 pt-5 border-b border-[#2e3347]">
        <h1 className="text-lg font-bold text-[#e4e6f0]">Portfolio Tracker</h1>
        <p className="text-xs text-[#6b7280] mt-1">Suivi temps reel</p>
      </div>

      <div className="flex-1 px-2.5 py-3 overflow-y-auto">
        {navItems.map((section) => (
          <div key={section.section} className="mb-4">
            <div className="text-[11px] uppercase text-[#6b7280] px-3 tracking-wider font-semibold mb-1">
              {section.section}
            </div>
            {section.items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive(item.href)
                    ? 'bg-[#6366f1] text-white'
                    : 'text-[#9da3b4] hover:bg-[#242836] hover:text-[#e4e6f0]'
                }`}
              >
                {'icon' in item ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                ) : (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'color' in item ? item.color : undefined }} />
                )}
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-[#2e3347] text-[11px] text-[#6b7280]">
        <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] mr-1.5 animate-pulse" />
        Donnees Yahoo Finance
        <br />
        <span>{lastUpdate ?? '--'}</span>
      </div>
    </nav>
  );
}
