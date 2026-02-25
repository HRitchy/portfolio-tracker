import { NextResponse } from 'next/server';

type Observation = { date: string; value: string };

async function fetchFromFREDApi(apiKey: string): Promise<Observation[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=BAMLH0A0HYM2&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`FRED API error: ${resp.status}`);
  const data = await resp.json();
  return data?.observations ?? [];
}

async function fetchFromFREDCsv(): Promise<Observation[]> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`FRED CSV error: ${resp.status}`);
  const text = await resp.text();
  // CSV format: first line is header (DATE,BAMLH0A0HYM2), remaining lines are data
  const lines = text.trim().split('\n');
  const dataLines = lines.slice(1); // skip header
  // Take the last 5 rows and reverse so most recent is first
  return dataLines.slice(-5).reverse().map((line) => {
    const [date, value] = line.split(',');
    return { date: date.trim(), value: value.trim() };
  });
}

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;

  if (apiKey) {
    try {
      const observations = await fetchFromFREDApi(apiKey);
      return NextResponse.json({ observations }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    } catch {
      // Fall through to CSV fallback
    }
  }

  try {
    // Public CSV endpoint — no API key required
    const observations = await fetchFromFREDCsv();
    return NextResponse.json({ observations }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
