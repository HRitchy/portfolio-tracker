import { NextResponse } from 'next/server';

type PCRObservation = { date: string; value: string };

async function fetchFromCBOE(): Promise<PCRObservation[]> {
  const url = 'https://cdn.cboe.com/api/global/us_indices/daily_prices/TOTAL_PC.csv';
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`CBOE CSV error: ${resp.status}`);
  const text = await resp.text();

  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CBOE CSV: no data rows');

  // Strip surrounding double-quotes before matching, in case CBOE delivers quoted CSV headers.
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toUpperCase());
  const dateCol = header.findIndex((h) => h.includes('DATE'));
  const ratioCol = header.findIndex((h) => h.includes('RATIO') || h === 'TOTAL_PC');

  if (dateCol < 0 || ratioCol < 0) {
    console.error('[/api/putcall] CBOE CSV: en-têtes reçus :', header);
    throw new Error(`CBOE CSV: colonnes introuvables (header: ${header.join(',')})`);
  }

  const dataLines = lines.slice(1).filter((l) => l.trim());
  return dataLines.slice(-5).reverse().map((line) => {
    const cols = line.split(',');
    return {
      // Strip surrounding double-quotes from data values as well.
      date: cols[dateCol].trim().replace(/^"|"$/g, ''),
      value: cols[ratioCol].trim().replace(/^"|"$/g, ''),
    };
  });
}

export async function GET() {
  try {
    const observations = await fetchFromCBOE();
    return NextResponse.json({ observations }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('[/api/putcall] CBOE CSV en échec :', {
      message: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
