import type { Metadata } from 'next';
import './globals.css';
import { PortfolioProvider } from '@/context/PortfolioContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Portfolio Tracker',
  description: 'Suivi temps reel de portefeuille boursier',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex">
        <ThemeProvider>
          <PortfolioProvider>
            <Sidebar />
            <main className="ml-[280px] max-md:ml-0 flex-1 min-h-screen p-5 md:p-8">
              <div className="max-w-[1500px] mx-auto">{children}</div>
            </main>
          </PortfolioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
