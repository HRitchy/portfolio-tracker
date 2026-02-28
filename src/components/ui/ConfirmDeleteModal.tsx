'use client';

import { useEffect, useRef } from 'react';

export default function ConfirmDeleteModal({
  assetName,
  onConfirm,
  onClose,
}: {
  assetName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Confirmer la suppression de ${assetName}`}
        className="relative z-10 w-full max-w-sm mx-4 bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--text)]">
            Supprimer {assetName} ?
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-[var(--muted)] mb-5">
          Cette action est irréversible. L&apos;actif sera définitivement supprimé de votre portefeuille.
        </p>

        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[var(--panel-hover)] text-[var(--text)] text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#ef4444] text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
