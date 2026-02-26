import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

type PCRObservation = { date: string; value: string };

function isValidValue(value: string): boolean {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed);
}

function normalizeLatestObservations(observations: PCRObservation[], limit = 5): PCRObservation[] {
  return observations
    .filter((obs) => obs.date && isValidValue(obs.value))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
    .reverse();
}

function parseLatestObservationsFromCsv(text: string, seriesId: string): PCRObservation[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) throw new Error('CSV: no data rows');

  const header = lines[0]
    .split(',')
    .map((h) => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, '').toUpperCase());
  const dateCol = header.findIndex((h) => h.includes('DATE'));
  const ratioCol = header.findIndex((h) => h.includes('RATIO') || h === 'TOTAL_PC' || h === seriesId.toUpperCase());

  if (dateCol < 0 || ratioCol < 0) {
    throw new Error(`CSV: missing columns (header: ${header.join(',')})`);
  }

  const dataLines = lines.slice(1);
  const parsed = dataLines.map((line) => {
    const cols = line.split(',');
    return {
      date: cols[dateCol]?.trim().replace(/^"|"$/g, '') ?? '',
      value: cols[ratioCol]?.trim().replace(/^"|"$/g, '') ?? '',
    };
  });

  return normalizeLatestObservations(parsed);
}

async function fetchFromCBOE(): Promise<PCRObservation[]> {
  const url = 'https://cdn.cboe.com/api/global/us_indices/daily_prices/TOTAL_PC.csv';
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`CBOE CSV error: ${resp.status}`);
  const text = await resp.text();
  return parseLatestObservationsFromCsv(text, 'TOTAL_PC');
}

async function fetchFromFREDApi(apiKey: string): Promise<PCRObservation[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=PUTCALL&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`FRED API error: ${resp.status}`);
  const data = await resp.json();
  return normalizeLatestObservations(data?.observations ?? []);
}

async function fetchFromFREDCsv(): Promise<PCRObservation[]> {
  const url = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=PUTCALL';
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`FRED CSV error: ${resp.status}`);
  const text = await resp.text();
  return parseLatestObservationsFromCsv(text, 'PUTCALL');
}

export async function GET() {
  const apiKey = env.FRED_API_KEY;

  try {
    const observations = await fetchFromCBOE();
    return NextResponse.json({ observations }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.warn('[/api/putcall] CBOE CSV en échec, bascule sur FRED :', {
      message: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    });
  }

  if (apiKey) {
    try {
      const observations = await fetchFromFREDApi(apiKey);
      return NextResponse.json({ observations }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    } catch (err) {
      console.warn('[/api/putcall] Clé API FRED en échec, bascule sur CSV public :', {
        message: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      });
    }
  }

  try {
    const observations = await fetchFromFREDCsv();
    return NextResponse.json({ observations }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('[/api/putcall] Fallback FRED CSV en échec :', {
      message: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
