import { YahooResult } from './types';

export async function fetchAssetData(symbol: string, days = 500): Promise<YahooResult | null> {
  try {
    const resp = await fetch(`/api/yahoo/${encodeURIComponent(symbol)}?days=${days}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.result ?? null;
  } catch (err) {
    console.error('[fetcher] fetchAssetData échoué :', {
      symbol,
      days,
      message: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    });
    return null;
  }
}

/**
 * Fetch multiple symbols in a single HTTP request via the batch endpoint.
 * Returns a map of symbol → YahooResult | null.
 */
export async function fetchBatchAssetData(
  symbols: string[],
  days = 500,
): Promise<Record<string, YahooResult | null>> {
  if (symbols.length === 0) return {};
  try {
    const params = new URLSearchParams({
      symbols: symbols.join(','),
      days: String(days),
    });
    const resp = await fetch(`/api/yahoo/batch?${params}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) return Object.fromEntries(symbols.map((s) => [s, null]));
    const data = await resp.json();
    return data.results ?? Object.fromEntries(symbols.map((s) => [s, null]));
  } catch (err) {
    console.error('[fetcher] fetchBatchAssetData échoué :', {
      symbols,
      days,
      message: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    });
    return Object.fromEntries(symbols.map((s) => [s, null]));
  }
}
