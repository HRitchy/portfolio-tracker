import type { Metadata } from 'next';
import './globals.css';
import { AssetsProvider } from '@/context/AssetsContext';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('portfolio-theme');if(!t){t=window.matchMedia('(prefers-color-scheme:light)').matches?'light':'balanced'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','balanced')}})()`,
          }}
        />
      </head>
      <body className="flex">
        <ThemeProvider>
          <ToastProvider>
            <MacroProvider>
              <AssetsProvider>
              <PortfolioProvider>
                <Sidebar />
                <main className="flex-1 min-w-0 min-h-screen p-5 pt-16 md:ml-7 md:p-8 2xl:p-10 3xl:p-12">
                  <div className="max-w-[1500px] 3xl:max-w-[1800px] mx-auto">
                    <ErrorBoundary>{children}</ErrorBoundary>
                    <ScrollToTop />
                  </div>
                </main>
              </PortfolioProvider>
              </AssetsProvider>
            </MacroProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
