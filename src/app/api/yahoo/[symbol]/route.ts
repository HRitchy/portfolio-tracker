import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const ALLOWED_SYMBOLS = new Set(['MWRE.DE', 'BTC-EUR', 'GLDA.DE', '^VIX', 'EUR=X']);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return NextResponse.json({ error: 'Symbol not allowed' }, { status: 400 });
  }
  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '500');
  const period1 = Math.floor((Date.now() - 86400000 * days) / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: 'Yahoo API error', status: resp.status }, { status: resp.status });
    }
    const data = await resp.json();
    const result = data?.chart?.result?.[0] ?? null;
    return NextResponse.json({ result }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
