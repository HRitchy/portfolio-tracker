#!/usr/bin/env node

const SOURCES = [
  {
    name: 'CBOE',
    url: 'https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/totalpc.csv',
    parse: (text) => {
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('CSV vide');
      // Auto-detect header row (CBOE CSVs have metadata lines before the header)
      let headerIdx = -1;
      let headers = [];
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const cols = lines[i].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toUpperCase());
        if (cols.some((h) => h.includes('DATE'))) {
          headerIdx = i;
          headers = cols;
          break;
        }
      }
      if (headerIdx < 0) throw new Error('En-tête introuvable dans les 10 premières lignes');
      const dateCol = headers.findIndex((h) => h.includes('DATE'));
      const ratioCol = headers.findIndex((h) => h.includes('RATIO') || h === 'TOTAL_PC');
      if (dateCol < 0 || ratioCol < 0) throw new Error(`Colonnes introuvables: ${headers.join(', ')}`);
      const last = lines[lines.length - 1].split(',');
      return {
        date: last[dateCol]?.trim().replace(/^"|"$/g, ''),
        value: Number.parseFloat(last[ratioCol]),
      };
    },
  },
  {
    name: 'FRED CSV',
    url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=PUTCALL',
    parse: (text) => {
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('CSV vide');
      const [date, value] = lines[lines.length - 1].split(',');
      return {
        date: date.trim(),
        value: Number.parseFloat(value),
      };
    },
  },
];

async function fetchLatest(source) {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
      Accept: 'text/csv,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const text = await response.text();
  const parsed = source.parse(text);

  if (!Number.isFinite(parsed.value)) {
    throw new Error(`Valeur invalide: ${parsed.value}`);
  }

  return parsed;
}

for (const source of SOURCES) {
  try {
    const latest = await fetchLatest(source);
    console.log(`✅ ${source.name} OK → ${latest.value.toFixed(4)} (${latest.date})`);
    process.exit(0);
  } catch (error) {
    console.warn(`⚠️ ${source.name} indisponible: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.error('❌ Impossible de vérifier le Put/Call Ratio depuis cet environnement.');
process.exit(1);
