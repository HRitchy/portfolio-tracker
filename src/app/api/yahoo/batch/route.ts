import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns';
import { fetchExternal, checkRateLimit } from '@/lib/apiUtils';
import { apiError } from '@/lib/apiError';
import { isValidYahooResult } from '@/lib/validation';
import { logger } from '@/lib/logger';

dns.setDefaultResultOrder('ipv4first');

const SYMBOL_RE = /^[A-Za-z0-9^=.\-]+$/;
const MAX_SYMBOLS = 20;

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, 30);
  if (limited) return limited;

  const rawSymbols = request.nextUrl.searchParams.get('symbols') ?? '';
  const symbols = rawSymbols
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0 || symbols.length > MAX_SYMBOLS) {
    return apiError('INVALID_INPUT', `Provide 1-${MAX_SYMBOLS} comma-separated symbols`, 400);
  }

  for (const s of symbols) {
    if (s.length > 20 || !SYMBOL_RE.test(s)) {
      return apiError('INVALID_INPUT', `Invalid symbol: ${s}`, 400);
    }
  }

  const rawDays = parseInt(request.nextUrl.searchParams.get('days') ?? '500', 10);
  const days = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 3650) : 500;
  const period1 = Math.floor((Date.now() - 86400000 * days) / 1000);
  const period2 = Math.floor(Date.now() / 1000);

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;
      const resp = await fetchExternal(url, { label: '/api/yahoo/batch' });
      const data = await resp.json();
      if (!isValidYahooResult(data)) return { symbol, result: null };
      return { symbol, result: data?.chart?.result?.[0] ?? null };
    }),
  );

  const payload: Record<string, unknown> = {};
  results.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      payload[res.value.symbol] = res.value.result;
    } else {
      logger.warn('/api/yahoo/batch symbol fetch failed', {
        symbol: symbols[i],
        message: res.reason instanceof Error ? res.reason.message : String(res.reason),
      });
      payload[symbols[i]] = null;
    }
  });

  return NextResponse.json({ results: payload }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
