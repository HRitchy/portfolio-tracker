import { NextResponse } from 'next/server';

export async function GET() {
  const url = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: 'CNN API error', status: resp.status }, { status: resp.status });
    }
    const data = await resp.json();
    const fg = data?.fear_and_greed ?? null;
    return NextResponse.json({ fear_and_greed: fg }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
