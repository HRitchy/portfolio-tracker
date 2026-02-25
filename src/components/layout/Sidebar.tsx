'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import ThemeToggle from '@/components/ui/ThemeToggle';

const navItems = [
  {
    section: 'Vue generale',
    items: [{ key: 'dashboard', href: '/', label: 'Dashboard', icon: true }],
  },
  {
    section: 'Actifs',
    items: [
      { key: 'mwre', href: '/asset/mwre', label: 'MSCI World', color: '#6366f1' },
      { key: 'btc', href: '/asset/btc', label: 'Bitcoin', color: '#f7931a' },
      { key: 'glda', href: '/asset/glda', label: 'Or (Gold)', color: '#eab308' },
    ],
  },
  {
    section: 'Indicateurs',
    items: [
      { key: 'vix', href: '/asset/vix', label: 'VIX', color: '#ef4444' },
      { key: 'eurusd', href: '/asset/eurusd', label: 'USD/EUR', color: '#3b82f6' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { lastUpdate } = usePortfolio();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fermer le drawer mobile lors d'un changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href;
  }

  return (
    <>
      {/* Bouton hamburger — visible uniquement sur mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu de navigation"
        aria-expanded={mobileOpen}
        aria-controls="sidebar-nav"
        className="fixed top-4 left-4 z-50 md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-md text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Overlay sombre — visible uniquement sur mobile quand le drawer est ouvert */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — drawer sur mobile, fixe sur desktop */}
      <nav
        id="sidebar-nav"
        aria-label="Navigation principale"
        className={`w-[280px] glass-panel border-r border-[var(--border)] flex flex-col fixed top-0 left-0 bottom-0 z-50 transition-transform duration-300
          md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="px-6 pb-5 pt-6 border-b border-[var(--border)] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold">PT</div>
              <h1 className="text-lg font-bold text-[var(--text)]">Portfolio Tracker</h1>
            </div>
            <p className="text-xs text-[var(--muted)]">Vue macro & analytics de portefeuille</p>
          </div>

          {/* Bouton fermer — visible uniquement sur mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors -mr-1 -mt-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-3 py-4 overflow-y-auto">
          {navItems.map((section) => (
            <div key={section.section} className="mb-5 last:mb-0">
              <div className="text-[10px] uppercase text-[var(--muted)] px-3 tracking-[0.18em] font-semibold mb-2">
                {section.section}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      isActive(item.href)
                        ? 'bg-[var(--accent)] text-white shadow-lg shadow-indigo-500/20'
                        : 'text-[var(--nav-text)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)]'
                    }`}
                  >
                    {'icon' in item ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    ) : (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'color' in item ? item.color : undefined }} aria-hidden="true" />
                    )}
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] text-[11px] text-[var(--muted)]">
          <ThemeToggle />
          <div className="mt-3 bg-[var(--panel-hover)] rounded-xl p-3">
            <div className="font-medium text-[var(--text)] mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] mr-1.5 animate-pulse" aria-hidden="true" />
              Flux Yahoo Finance
            </div>
            <span>{lastUpdate ?? '--'}</span>
          </div>
        </div>
      </nav>
    </>
  );
}
