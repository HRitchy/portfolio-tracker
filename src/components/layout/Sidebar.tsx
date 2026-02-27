'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import ThemeToggle from '@/components/ui/ThemeToggle';

function useRelativeTime(lastUpdate: string | null): string {
  const [relative, setRelative] = useState('--');

  const compute = useCallback(() => {
    if (!lastUpdate) return '--';
    const parts = lastUpdate.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2}):?(\d{2})?/);
    if (!parts) return lastUpdate;
    const d = new Date(+parts[3], +parts[2] - 1, +parts[1], +parts[4], +parts[5], +(parts[6] ?? 0));
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return lastUpdate;
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return 'À l\'instant';
    const min = Math.floor(sec / 60);
    if (min < 60) return `Il y a ${min} min`;
    const hr = Math.floor(min / 60);
    return `Il y a ${hr}h${min % 60 > 0 ? `${String(min % 60).padStart(2, '0')}` : ''}`;
  }, [lastUpdate]);

  useEffect(() => {
    setRelative(compute());
    const interval = setInterval(() => setRelative(compute()), 30_000);
    return () => clearInterval(interval);
  }, [compute]);

  return relative;
}

const navItems = [
  {
    section: 'Vue générale',
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

// Rendu partagé des sections de navigation.
// getHref permet d'injecter l'onglet courant dans les liens d'actifs.
function NavSections({
  getHref,
  pathname,
}: {
  getHref: (baseHref: string) => string;
  pathname: string;
}) {
  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href;
  }

  return (
    <>
      {navItems.map((section) => (
        <div key={section.section} className="mb-5 last:mb-0">
          <div className="text-[10px] uppercase text-[var(--muted)] px-3 tracking-[0.18em] font-semibold mb-2">
            {section.section}
          </div>
          <div className="space-y-1">
            {section.items.map((item) => (
              <Link
                key={item.key}
                href={getHref(item.href)}
                scroll={!item.href.startsWith('/asset/')}
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
    </>
  );
}

// Composant interne qui lit l'onglet courant depuis l'URL
// et l'intègre dans les liens vers les actifs.
// Nécessite un Suspense parent (Next.js App Router + useSearchParams).
function NavLinksWithTab({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');

  const getHref = useCallback(
    (baseHref: string) => {
      if (currentTab && baseHref.startsWith('/asset/')) {
        return `${baseHref}?tab=${currentTab}`;
      }
      return baseHref;
    },
    [currentTab],
  );

  return <NavSections getHref={getHref} pathname={pathname} />;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { lastUpdate } = usePortfolio();
  const relativeTime = useRelativeTime(lastUpdate);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Fermer le drawer mobile lors d'un changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Focus trap + Escape key when mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) {
      hamburgerRef.current?.focus();
      return;
    }
    const nav = navRef.current;
    if (!nav) return;

    const focusable = nav.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const els = Array.from(focusable);
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <>
      {/* Bouton hamburger — visible uniquement sur mobile */}
      <button
        ref={hamburgerRef}
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
        ref={navRef}
        id="sidebar-nav"
        aria-label="Navigation principale"
        aria-modal={mobileOpen || undefined}
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
          {/*
            NavLinksWithTab lit l'onglet courant via useSearchParams pour le
            propager dans les liens d'actifs. Le Suspense fournit un rendu sans
            onglet le temps que le hook soit disponible (exigence Next.js App Router).
          */}
          <Suspense fallback={<NavSections getHref={(href) => href} pathname={pathname} />}>
            <NavLinksWithTab pathname={pathname} />
          </Suspense>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] text-[11px] text-[var(--muted)]">
          <ThemeToggle />
          <div className="mt-3 bg-[var(--panel-hover)] rounded-xl p-3">
            <div className="font-medium text-[var(--text)] mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] mr-1.5 animate-pulse" aria-hidden="true" />
              Flux Yahoo Finance
            </div>
            <span title={lastUpdate ?? undefined}>{relativeTime}</span>
          </div>
        </div>
      </nav>
    </>
  );
}
