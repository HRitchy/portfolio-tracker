import { NextResponse } from 'next/server';

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

function parseLatestObservationsFromCsv(text: string): PCRObservation[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) throw new Error('CSV: no data rows');

  const header = lines[0]
    .split(',')
    .map((h) => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, '').toUpperCase());
  const dateCol = header.findIndex((h) => h.includes('DATE'));
  const ratioCol = header.findIndex((h) => h.includes('RATIO') || h === 'TOTAL_PC');

  if (dateCol < 0 || ratioCol < 0) {
    throw new Error(`CSV: missing columns (header: ${header.join(',')})`);
  }

  const parsed = lines.slice(1).map((line) => {
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
  return parseLatestObservationsFromCsv(text);
}

export async function GET() {
  try {
    const observations = await fetchFromCBOE();
    return NextResponse.json(
      { observations },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (err) {
    console.error('[/api/putcall] CBOE requis mais indisponible :', {
      message: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'CBOE put/call data unavailable',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
