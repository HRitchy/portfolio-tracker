'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAssets } from '@/context/AssetsContext';
import AddAssetModal from '@/components/ui/AddAssetModal';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/context/ThemeContext';

// Parse a French locale date string (dd/mm/yyyy, hh:mm:ss) produced by
// Date.toLocaleString('fr-FR') into a Date object without fragile regex.
function parseFrenchLocaleDate(str: string): Date | null {
  // Expected format: "dd/mm/yyyy, hh:mm:ss" or "dd/mm/yyyy hh:mm"
  const [datePart, timePart] = str.split(/,?\s+/);
  if (!datePart || !timePart) return null;
  const [day, month, year] = datePart.split('/').map(Number);
  const [hour, minute, second = 0] = timePart.split(':').map(Number);
  if ([day, month, year, hour, minute].some(Number.isNaN)) return null;
  return new Date(year, month - 1, day, hour, minute, second);
}

function useRelativeTime(lastUpdate: string | null): string {
  const [relative, setRelative] = useState('--');

  const compute = useCallback(() => {
    if (!lastUpdate) return '--';
    const d = parseFrenchLocaleDate(lastUpdate);
    if (!d || isNaN(d.getTime())) return lastUpdate;
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return lastUpdate;
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

interface NavItem {
  key: string;
  href: string;
  label: string;
  color?: string;
  icon?: boolean;
}

interface NavSection {
  section: string;
  type?: 'portfolio' | 'indicator';
  items: NavItem[];
}

function NavSections({
  getHref,
  pathname,
  sections,
  onAdd,
  onRemove,
}: {
  getHref: (baseHref: string) => string;
  pathname: string;
  sections: NavSection[];
  onAdd?: (type: 'portfolio' | 'indicator') => void;
  onRemove?: (key: string) => void;
}) {
  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href;
  }

  return (
    <>
      {sections.map((section) => (
        <div key={section.section} className="mb-5 last:mb-0">
          <div className="flex items-center justify-between px-3 mb-2">
            <div className="text-[10px] uppercase text-[var(--muted)] tracking-[0.18em] font-semibold">
              {section.section}
            </div>
            {section.type && onAdd && (
              <button
                onClick={() => onAdd(section.type!)}
                aria-label={`Ajouter un ${section.type === 'portfolio' ? 'actif' : 'indicateur'}`}
                className="w-5 h-5 flex items-center justify-center rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>
          <div className="space-y-1">
            {section.items.map((item) => (
              <div key={item.key} className="group/item relative flex items-center">
                <Link
                  href={getHref(item.href)}
                  scroll={!item.href.startsWith('/asset/')}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive(item.href)
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-lg shadow-indigo-500/20'
                      : 'text-[var(--nav-text)] hover:bg-[var(--panel-hover)] hover:text-[var(--text)]'
                  }`}
                >
                  {item.icon ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  ) : (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} aria-hidden="true" />
                  )}
                  <span className="truncate">{item.label}</span>
                </Link>
                {!item.icon && onRemove && (
                  <button
                    onClick={() => onRemove(item.key)}
                    aria-label={`Supprimer ${item.label}`}
                    className="absolute right-1 w-6 h-6 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-all opacity-0 group-hover/item:opacity-100"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function NavLinksWithTab({
  pathname,
  sections,
  onAdd,
  onRemove,
}: {
  pathname: string;
  sections: NavSection[];
  onAdd?: (type: 'portfolio' | 'indicator') => void;
  onRemove?: (key: string) => void;
}) {
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

  return <NavSections getHref={getHref} pathname={pathname} sections={sections} onAdd={onAdd} onRemove={onRemove} />;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { lastUpdate } = usePortfolio();
  const { assets, portfolioKeys, indicatorKeys, removeAsset } = useAssets();
  const relativeTime = useRelativeTime(lastUpdate);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [addModal, setAddModal] = useState<'portfolio' | 'indicator' | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ key: string; name: string } | null>(null);
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const sections: NavSection[] = useMemo(() => [
    {
      section: 'Vue générale',
      items: [{ key: 'dashboard', href: '/', label: 'Dashboard', icon: true }],
    },
    {
      section: 'Actifs',
      type: 'portfolio' as const,
      items: portfolioKeys.map((key) => ({
        key,
        href: `/asset/${key}`,
        label: assets[key].name,
        color: assets[key].color,
      })),
    },
    {
      section: 'Indicateurs',
      type: 'indicator' as const,
      items: indicatorKeys.map((key) => ({
        key,
        href: `/asset/${key}`,
        label: assets[key].name,
        color: assets[key].color,
      })),
    },
  ], [assets, portfolioKeys, indicatorKeys]);

  const handleAdd = useCallback((type: 'portfolio' | 'indicator') => {
    setAddModal(type);
  }, []);

  const handleRemove = useCallback((key: string) => {
    const name = assets[key]?.name ?? key;
    setPendingDelete({ key, name });
  }, [assets]);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    removeAsset(pendingDelete.key);
    showToast(`${pendingDelete.name} supprimé`, 'info');
    setPendingDelete(null);
  }, [pendingDelete, removeAsset, showToast]);

  const handleCancelDelete = useCallback(() => {
    setPendingDelete(null);
  }, []);

  // Fermer le drawer mobile lors d'un changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setDesktopExpanded(false);
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
        className="fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-md text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors md:hidden"
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

      {/* Zone de survol desktop pour réafficher le panneau latéral */}
      <div
        className="hidden md:block fixed top-0 left-0 bottom-0 z-40 w-7"
        onMouseEnter={() => setDesktopExpanded(true)}
        aria-hidden="true"
      />

      {/* Sidebar — drawer sur mobile, fixe sur desktop */}
      <nav
        ref={navRef}
        id="sidebar-nav"
        aria-label="Navigation principale"
        aria-modal={mobileOpen || undefined}
        onMouseEnter={() => setDesktopExpanded(true)}
        onMouseLeave={() => setDesktopExpanded(false)}
        onFocusCapture={() => setDesktopExpanded(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDesktopExpanded(false);
          }
        }}
        className={`w-[280px] glass-panel border-r border-[var(--border)] flex flex-col fixed top-0 left-0 bottom-0 z-50 transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${desktopExpanded ? 'md:translate-x-0' : 'md:-translate-x-[252px]'}`}
      >
        <div className="px-6 pb-5 pt-6 border-b border-[var(--border)] flex items-start justify-end">
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
          <Suspense fallback={<NavSections getHref={(href) => href} pathname={pathname} sections={sections} onAdd={handleAdd} onRemove={handleRemove} />}>
            <NavLinksWithTab pathname={pathname} sections={sections} onAdd={handleAdd} onRemove={handleRemove} />
          </Suspense>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] text-[11px] text-[var(--muted)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">Thème</span>
            <button
              onClick={toggleTheme}
              aria-label={theme === 'balanced' ? 'Passer au thème clair' : 'Passer au thème sombre'}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors"
            >
              {theme === 'balanced' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
          <div className="bg-[var(--panel-hover)] rounded-xl p-3">
            <div className="font-medium text-[var(--text)] mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] mr-1.5 animate-pulse" aria-hidden="true" />
              Flux Yahoo Finance
            </div>
            <span title={lastUpdate ?? undefined}>{relativeTime}</span>
          </div>
        </div>
      </nav>

      {addModal && (
        <AddAssetModal type={addModal} onClose={() => setAddModal(null)} />
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          assetName={pendingDelete.name}
          onConfirm={handleConfirmDelete}
          onClose={handleCancelDelete}
        />
      )}
    </>
  );
}
