import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { fetchExternal, checkRateLimit, upstreamError } from '@/lib/apiUtils';
import { isValidFredObservations } from '@/lib/validation';
import { logger } from '@/lib/logger';
import { MemoryCache } from '@/lib/cache';

type Observation = { date: string; value: string };

const cache = new MemoryCache<Observation[]>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_KEY = 'fred_hy';

async function fetchFromFREDApi(apiKey: string): Promise<Observation[]> {
  // Note: FRED API only supports api_key as a query parameter — no header-based auth available.
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=BAMLH0A0HYM2&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
  const resp = await fetchExternal(url, { label: '/api/fred' });
  const data = await resp.json();
  const observations = data?.observations ?? [];
  if (!isValidFredObservations(observations)) {
    throw new Error('Invalid FRED API response format');
  }
  return observations;
}

async function fetchFromFREDCsv(): Promise<Observation[]> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2`;
  const resp = await fetchExternal(url, { label: '/api/fred-csv' });
  const text = await resp.text();
  const lines = text.trim().split('\n');
  const dataLines = lines.slice(1); // skip header
  const observations = dataLines.slice(-5).reverse().map((line) => {
    const [date, value] = line.split(',');
    return { date: date.trim(), value: value.trim() };
  });
  if (!isValidFredObservations(observations)) {
    throw new Error('Invalid FRED CSV response format');
  }
  return observations;
}

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, 30);
  if (limited) return limited;

  const cached = cache.get(CACHE_KEY);
  if (cached !== null) {
    return NextResponse.json({ observations: cached }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  }

  const apiKey = env.FRED_API_KEY;

  if (apiKey) {
    try {
      const observations = await fetchFromFREDApi(apiKey);
      cache.set(CACHE_KEY, observations, CACHE_TTL_MS);
      return NextResponse.json({ observations }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    } catch (err) {
      // Do not log the full URL (contains API key) — only log the error message
      logger.warn('/api/fred FRED API failed, falling back to CSV', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    const observations = await fetchFromFREDCsv();
    cache.set(CACHE_KEY, observations, CACHE_TTL_MS);
    return NextResponse.json({ observations }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    return upstreamError('/api/fred', err);
  }
}
