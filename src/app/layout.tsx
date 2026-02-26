import type { Metadata } from 'next';
import './globals.css';
import { PortfolioProvider } from '@/context/PortfolioContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { MacroProvider } from '@/context/MacroContext';
import Sidebar from '@/components/layout/Sidebar';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import ScrollToTop from '@/components/ui/ScrollToTop';

export const metadata: Metadata = {
  title: 'Portfolio Tracker',
  description: 'Suivi temps réel de portefeuille boursier',
};

// Inline script to prevent FOUC (Flash of Unstyled Content) on theme load.
// Runs synchronously before React hydration to apply the saved theme.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex">
        <ThemeProvider>
          <ToastProvider>
            <MacroProvider>
              <PortfolioProvider>
                <Sidebar />
                <main className="ml-[280px] max-md:ml-0 flex-1 min-h-screen p-5 md:p-8 max-md:pt-16">
                  <div className="max-w-[1500px] mx-auto">
                    <ErrorBoundary>{children}</ErrorBoundary>
                    <ScrollToTop />
                  </div>
                </main>
              </PortfolioProvider>
            </MacroProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
