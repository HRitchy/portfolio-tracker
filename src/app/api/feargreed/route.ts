import { NextRequest, NextResponse } from 'next/server';
import { fetchExternal, checkRateLimit, upstreamError } from '@/lib/apiUtils';
import { apiError } from '@/lib/apiError';
import { isValidFearGreedData } from '@/lib/validation';
import { MemoryCache } from '@/lib/cache';

const cache = new MemoryCache<unknown>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY = 'feargreed';

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, 30);
  if (limited) return limited;

  const cached = cache.get(CACHE_KEY);
  if (cached !== null) {
    return NextResponse.json({ fear_and_greed: cached }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  }

  const url = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';

  try {
    const resp = await fetchExternal(url, { label: '/api/feargreed' });
    const data = await resp.json();
    const fg = data?.fear_and_greed ?? null;

    if (fg !== null && !isValidFearGreedData(fg)) {
      return apiError('VALIDATION_ERROR', 'Invalid upstream response format', 502);
    }

    cache.set(CACHE_KEY, fg, CACHE_TTL_MS);

    return NextResponse.json({ fear_and_greed: fg }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (err) {
    return upstreamError('/api/feargreed', err);
  }
}
