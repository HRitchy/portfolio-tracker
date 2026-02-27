'use client';

import { useEffect } from 'react';

const UNIFIED_THEME = 'balanced';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', UNIFIED_THEME);
  }, []);

  return children;
}
