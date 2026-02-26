import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

type PCRObservation = { date: string; value: string };
type PutCallSource = 'cboe' | 'cboe_page' | 'fred_api' | 'fred_csv' | 'static_fallback';

const STATIC_FALLBACK_OBSERVATIONS: PCRObservation[] = [
  { date: '2024-12-31', value: '0.76' },
  { date: '2024-12-30', value: '0.79' },
  { date: '2024-12-27', value: '0.81' },
  { date: '2024-12-26', value: '0.83' },
  { date: '2024-12-24', value: '0.78' },
];

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

/** Normalise a date string to YYYY-MM-DD regardless of input format. */
function normalizeDate(raw: string): string {
  // Handle MM/DD/YYYY (CBOE format)
  const mdyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Already YYYY-MM-DD or other ISO-like format — return as-is
  return raw;
}

function parseLatestObservationsFromCsv(text: string, seriesId: string): PCRObservation[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) throw new Error('CSV: no data rows');

  // Auto-detect header row: find the first line whose columns contain "DATE".
  // This handles CBOE CSVs that have metadata lines before the actual header.
  let headerIdx = -1;
  let header: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = lines[i]
      .split(',')
      .map((h) => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, '').toUpperCase());
    if (cols.some((h) => h.includes('DATE'))) {
      headerIdx = i;
      header = cols;
      break;
    }
  }

  if (headerIdx < 0) {
    throw new Error(`CSV: no header row found in first 10 lines`);
  }

  const dateCol = header.findIndex((h) => h.includes('DATE'));
  const ratioCol = header.findIndex(
    (h) => h.includes('RATIO') || h === 'TOTAL_PC' || h === seriesId.toUpperCase(),
  );

  if (dateCol < 0 || ratioCol < 0) {
    throw new Error(`CSV: missing columns (header: ${header.join(',')})`);
  }

  const dataLines = lines.slice(headerIdx + 1);
  const parsed = dataLines.map((line) => {
    const cols = line.split(',');
    return {
      date: normalizeDate(cols[dateCol]?.trim().replace(/^"|"$/g, '') ?? ''),
      value: cols[ratioCol]?.trim().replace(/^"|"$/g, '') ?? '',
    };
  });

  return normalizeLatestObservations(parsed);
}

/**
 * Maximum age (in calendar days) we accept for CBOE CSV data.
 * CBOE doesn't publish on weekends/holidays, so 7 days is a generous but
 * safe threshold. If the latest observation is older than this we treat the
 * CSV as stale and fall through to the next source.
 */
const MAX_DATA_AGE_DAYS = 7;

function assertFresh(observations: PCRObservation[], sourceName: string): void {
  if (observations.length === 0) return;
  const latestDate = new Date(observations[0].date);
  const diffDays = (Date.now() - latestDate.getTime()) / 86_400_000;
  if (diffDays > MAX_DATA_AGE_DAYS) {
    throw new Error(
      `${sourceName} data is stale: latest date is ${observations[0].date} (${Math.floor(diffDays)} days old)`,
    );
  }
}

/** Common browser-like headers to reduce bot-detection 403s from CBOE CDN. */
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/csv,text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.cboe.com/',
};

async function fetchFromCBOE(): Promise<PCRObservation[]> {
  const url = 'https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/totalpc.csv';
  const resp = await fetch(url, {
    cache: 'no-store',
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`CBOE CSV error: ${resp.status}`);
  const text = await resp.text();
  const observations = parseLatestObservationsFromCsv(text, 'TOTAL_PC');
  assertFresh(observations, 'CBOE CSV');
  return observations;
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function extractRatioFromCBOEPage(html: string): string {
  const rowMatch = html.match(/<tr[^>]*>[\s\S]*?(?:total\s*)?put\/?\s*call\s*ratio[\s\S]*?<\/tr>/i);
  if (!rowMatch) throw new Error('CBOE page: PUT/CALL RATIO row not found in HTML');

  const cells = [...rowMatch[0].matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((match) => stripTags(match[1]));
  const numericCell = cells.find((cell) => /^\d*\.?\d+$/.test(cell));
  if (!numericCell) throw new Error('CBOE page: ratio cell not found in PUT/CALL row');
  if (!isValidValue(numericCell)) throw new Error(`CBOE page: invalid ratio value "${numericCell}"`);
  return numericCell;
}

/**
 * Scrape the CBOE Daily Market Statistics HTML page.
 * The page shows a table with TOTAL PUT/CALL RATIO in the first data column
 * ("Exchange Listed"). This serves as a fallback when the CBOE CDN CSV is blocked.
 */
async function fetchFromCBOEPage(): Promise<PCRObservation[]> {
  const url = 'https://www.cboe.com/us/options/market_statistics/daily/';
  const resp = await fetch(url, {
    cache: 'no-store',
    headers: {
      ...BROWSER_HEADERS,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`CBOE page error: ${resp.status}`);
  const html = await resp.text();

  const value = extractRatioFromCBOEPage(html);

  // Extract the report date from the page (ISO date in input, or MM/DD/YYYY text).
  const isoDate = html.match(/value="(\d{4}-\d{2}-\d{2})"/);
  const mdyDate = html.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  const date = isoDate
    ? isoDate[1]
    : mdyDate
      ? normalizeDate(mdyDate[1])
      : new Date().toISOString().slice(0, 10);

  return [{ date, value }];
}

async function fetchFromFREDApi(apiKey: string): Promise<PCRObservation[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=PUTCALL&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
  const resp = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`FRED API error: ${resp.status}`);
  const data = await resp.json();
  return normalizeLatestObservations(data?.observations ?? []);
}

async function fetchFromFREDCsv(): Promise<PCRObservation[]> {
  const url = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=PUTCALL';
  const resp = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`FRED CSV error: ${resp.status}`);
  const text = await resp.text();
  return parseLatestObservationsFromCsv(text, 'PUTCALL');
}

export async function GET() {
  const apiKey = env.FRED_API_KEY;

  const jsonResponse = (observations: PCRObservation[], source: PutCallSource, warning?: string) => NextResponse.json(
    warning ? { observations, source, warning } : { observations, source },
    {
      headers: {
        'Cache-Control': source === 'static_fallback'
          ? 'public, max-age=300'
          : 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    }
  );

  // 1. CBOE CSV (primary — direct CDN file)
  try {
    const observations = await fetchFromCBOE();
    return jsonResponse(observations, 'cboe');
  } catch (err) {
    console.warn('[/api/putcall] CBOE CSV en échec, tentative page HTML :', {
      message: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    });
  }

  // 2. CBOE HTML page scraping (fallback when CDN CSV is blocked)
  try {
    const observations = await fetchFromCBOEPage();
    return jsonResponse(observations, 'cboe_page');
  } catch (err) {
    console.warn('[/api/putcall] CBOE page en échec, bascule sur FRED :', {
      message: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    });
  }

  // 3. FRED API (requires API key)
  if (apiKey) {
    try {
      const observations = await fetchFromFREDApi(apiKey);
      return jsonResponse(observations, 'fred_api');
    } catch (err) {
      console.warn('[/api/putcall] Clé API FRED en échec, bascule sur CSV public :', {
        message: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      });
    }
  }

  try {
    const observations = await fetchFromFREDCsv();
    return jsonResponse(observations, 'fred_csv');
  } catch (err) {
    console.error('[/api/putcall] Fallback FRED CSV en échec :', {
      message: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
    });

    return jsonResponse(
      STATIC_FALLBACK_OBSERVATIONS,
      'static_fallback',
      'Live data unavailable, using embedded fallback snapshot.'
    );
  }
}
