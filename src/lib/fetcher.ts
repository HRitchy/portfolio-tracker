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
