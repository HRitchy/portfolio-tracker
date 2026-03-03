import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 fade-in">
      <div className="w-20 h-20 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </div>
      <div>
        <h2 className="text-4xl font-bold mb-2">404</h2>
        <p className="text-[var(--muted)] text-lg">Page introuvable</p>
      </div>
      <p className="text-sm text-[var(--muted)] max-w-md">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-xl text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
      >
        Retour au Dashboard
      </Link>
    </div>
  );
}
