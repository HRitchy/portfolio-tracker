'use client';

import { useCallback } from 'react';
import { ProcessedAsset, AssetConfig, AssetKey } from '@/lib/types';
import { fmtPrice, fmtPct, getDigitsForKey } from '@/lib/formatting';

function buildCsvRows(
  data: ProcessedAsset,
  config: AssetConfig,
  assetKey: AssetKey
): string {
  const digits = getDigitsForKey(assetKey);
  const hasMM200 = !!data.mm200;

  const headers = ['Date', 'Cours', 'Var. %'];
  if (config.hasMM) headers.push('MM50');
  if (config.hasMM && hasMM200) headers.push('MM200');
  if (config.hasRSI) headers.push('RSI 14');

  const rows = data.series.map((s, i) => {
    const row = [s.date, fmtPrice(s.close, digits), fmtPct(s.variation)];
    if (config.hasMM) row.push(data.mm50?.[i] != null ? fmtPrice(data.mm50[i]!, digits) : '--');
    if (config.hasMM && hasMM200) row.push(data.mm200?.[i] != null ? fmtPrice(data.mm200[i]!, digits) : '--');
    if (config.hasRSI) row.push(String(data.rsi14?.[i] ?? '--'));
    return row.join(';');
  });

  return [headers.join(';'), ...rows].join('\n');
}

export default function DataTable({ data, config, assetKey }: { data: ProcessedAsset; config: AssetConfig; assetKey: AssetKey }) {
  const digits = getDigitsForKey(assetKey);
  const hasMM200 = !!data.mm200;
  const last50 = data.series.slice(-50).reverse();

  const handleExportCsv = useCallback(() => {
    const csv = buildCsvRows(data, config, assetKey);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assetKey}_données.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, config, assetKey]);

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="text-[13px] text-[var(--muted)] uppercase tracking-wide font-semibold">
          Dernières données
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-[var(--panel-hover)] text-[var(--nav-text)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
          aria-label="Exporter les données en CSV"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exporter CSV
        </button>
      </div>
      <div className="overflow-x-auto max-h-[400px] md:max-h-[500px] 3xl:max-h-[650px] overflow-y-auto">
        <table className="w-full border-collapse text-xs md:text-[13px]">
          <thead className="sticky top-0 bg-[var(--panel)]">
            <tr>
              <th className="text-left px-3 py-2.5 text-[var(--muted)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wide">Date</th>
              <th className="text-left px-3 py-2.5 text-[var(--muted)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wide">Cours</th>
              <th className="text-left px-3 py-2.5 text-[var(--muted)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wide">Var. %</th>
              {config.hasMM && (
                <th className="text-left px-3 py-2.5 text-[var(--muted)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wide">MM50</th>
              )}
              {config.hasMM && hasMM200 && (
                <th className="text-left px-3 py-2.5 text-[var(--muted)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wide">MM200</th>
              )}
              {config.hasRSI && (
                <th className="text-left px-3 py-2.5 text-[var(--muted)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wide">RSI 14</th>
              )}
            </tr>
          </thead>
          <tbody>
            {last50.map((s, idx) => {
              const i = data.series.length - 1 - idx;
              const varColor = s.variation == null ? '' : s.variation >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]';
              return (
                <tr key={s.date + i} className="hover:bg-[var(--panel-hover)]">
                  <td className="px-3 py-2.5 border-b border-[var(--border)]">{s.date}</td>
                  <td className={`px-3 py-2.5 border-b border-[var(--border)] ${varColor}`}>{fmtPrice(s.close, digits)}</td>
                  <td className={`px-3 py-2.5 border-b border-[var(--border)] ${varColor}`}>{fmtPct(s.variation)}</td>
                  {config.hasMM && (
                    <td className="px-3 py-2.5 border-b border-[var(--border)]">{data.mm50?.[i] != null ? fmtPrice(data.mm50[i]!, digits) : '--'}</td>
                  )}
                  {config.hasMM && hasMM200 && (
                    <td className="px-3 py-2.5 border-b border-[var(--border)]">{data.mm200?.[i] != null ? fmtPrice(data.mm200[i]!, digits) : '--'}</td>
                  )}
                  {config.hasRSI && (
                    <td className="px-3 py-2.5 border-b border-[var(--border)]">{data.rsi14?.[i] ?? '--'}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
