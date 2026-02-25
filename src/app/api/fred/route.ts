import { NextResponse } from 'next/server';

export async function GET() {
  const url =
    'https://api.stlouisfed.org/fred/series/observations?series_id=BAMLH0A0HYM2&api_key=59458d5e2b5c1f4a67c7e31e74946118&file_type=json&sort_order=desc&limit=5';

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      return NextResponse.json({ error: 'FRED API error', status: resp.status }, { status: resp.status });
    }
    const data = await resp.json();
    const observations: { date: string; value: string }[] = data?.observations ?? [];
    return NextResponse.json({ observations }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
