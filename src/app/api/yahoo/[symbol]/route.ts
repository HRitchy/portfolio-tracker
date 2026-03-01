import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns';
import { fetchExternal, checkRateLimit, upstreamError } from '@/lib/apiUtils';
import { apiError } from '@/lib/apiError';
import { isValidYahooResult } from '@/lib/validation';
import { MemoryCache } from '@/lib/cache';

dns.setDefaultResultOrder('ipv4first');

const SYMBOL_RE = /^[A-Za-z0-9^=.\-]+$/;
const cache = new MemoryCache<unknown>(100);
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const limited = checkRateLimit(request, 60);
  if (limited) return limited;

  const { symbol } = await params;
  if (!symbol || symbol.length > 20 || !SYMBOL_RE.test(symbol)) {
    return apiError('INVALID_INPUT', 'Invalid symbol', 400);
  }

  const rawDays = parseInt(request.nextUrl.searchParams.get('days') ?? '500', 10);
  const days = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 3650) : 500;

  const cacheKey = `${symbol}:${days}`;
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    return NextResponse.json({ result: cached }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  }

  const period1 = Math.floor((Date.now() - 86400000 * days) / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;

  try {
    const resp = await fetchExternal(url, { label: '/api/yahoo' });
    const data = await resp.json();

    if (!isValidYahooResult(data)) {
      return apiError('VALIDATION_ERROR', 'Invalid upstream response format', 502);
    }

    const result = data?.chart?.result?.[0] ?? null;
    cache.set(cacheKey, result, CACHE_TTL_MS);

    return NextResponse.json({ result }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    return upstreamError('/api/yahoo', err, { symbol });
  }
}
