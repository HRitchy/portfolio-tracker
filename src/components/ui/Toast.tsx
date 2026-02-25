'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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
  let nextId = 0;

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'error') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bgColor = (type: ToastMessage['type']) =>
    type === 'error' ? 'bg-red-500/90' :
    type === 'warning' ? 'bg-yellow-500/90' :
    'bg-blue-500/90';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`${bgColor(t.type)} text-white text-sm px-4 py-2.5 rounded-lg shadow-lg max-w-xs flex items-center gap-2 animate-fade-in`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {t.text}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
