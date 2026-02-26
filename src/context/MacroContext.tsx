'use client';

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { fetchWithRetry } from '@/lib/retry';
import { useToast } from '@/components/ui/Toast';

export interface FearGreedData {
  score: number;
  rating: string;
  previous_close: number;
  previous_1_week: number;
  previous_1_month: number;
  previous_1_year: number;
}

export interface HYObservation {
  date: string;
  value: string;
}

interface MacroContextType {
  fearGreedData: FearGreedData | null;
  hyObs: HYObservation[] | null;
  fearGreedError: boolean;
  hySpreadError: boolean;
}

const MacroContext = createContext<MacroContextType>({
  fearGreedData: null,
  hyObs: null,
  fearGreedError: false,
  hySpreadError: false,
});

export function MacroProvider({ children }: { children: ReactNode }) {
  const [fearGreedData, setFearGreedData] = useState<FearGreedData | null>(null);
  const [hyObs, setHyObs] = useState<HYObservation[] | null>(null);
  const [fearGreedError, setFearGreedError] = useState(false);
  const [hySpreadError, setHySpreadError] = useState(false);

  const { showToast } = useToast();
  // Use a ref so the effect doesn't re-run when showToast reference changes
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    const controller = new AbortController();

    fetchWithRetry('/api/feargreed', controller.signal)
      .then((r) => r.json())
      .then((d) => setFearGreedData(d.fear_and_greed ?? null))
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('[MacroContext] Fear & Greed fetch failed:', err);
          setFearGreedError(true);
          showToastRef.current('Fear & Greed Index indisponible', 'warning');
        }
      });

    fetchWithRetry('/api/fred', controller.signal)
      .then((r) => r.json())
      .then((d) => setHyObs(d.observations ?? null))
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('[MacroContext] HY Spread fetch failed:', err);
          setHySpreadError(true);
          showToastRef.current('HY Spread (FRED) indisponible', 'warning');
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <MacroContext.Provider value={{ fearGreedData, hyObs, fearGreedError, hySpreadError }}>
      {children}
    </MacroContext.Provider>
  );
}

export const useMacro = () => useContext(MacroContext);
