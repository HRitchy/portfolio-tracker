'use client';

import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--border)] text-[var(--nav-text)] hover:bg-[var(--panel-hover)] transition-all cursor-pointer"
    >
      {isDark ? '☀️ Mode clair' : '🌙 Mode sombre'}
    </button>
  );
}
