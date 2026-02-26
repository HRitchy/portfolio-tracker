'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'error' | 'warning' | 'info';
}

interface ToastContextType {
  showToast: (text: string, type?: ToastMessage['type']) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextIdRef = useRef(0);

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'error') => {
    const id = ++nextIdRef.current;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const bgColor = (type: ToastMessage['type']) =>
    type === 'error' ? 'bg-red-500/90' :
    type === 'warning' ? 'bg-yellow-500/90' :
    'bg-blue-500/90';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 flex flex-col gap-2 z-50"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`${bgColor(t.type)} text-white text-sm px-4 py-2.5 rounded-lg shadow-lg max-w-xs flex items-center gap-2 animate-fade-in`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="flex-1">{t.text}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Fermer la notification"
              className="ml-1 opacity-75 hover:opacity-100 transition-opacity shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
