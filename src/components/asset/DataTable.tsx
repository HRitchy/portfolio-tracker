import { ProcessedAsset, AssetConfig, AssetKey } from '@/lib/types';
import { fmtPrice, fmtPct, getDigitsForKey } from '@/lib/formatting';

export default function DataTable({ data, config, assetKey }: { data: ProcessedAsset; config: AssetConfig; assetKey: AssetKey }) {
  const digits = getDigitsForKey(assetKey);
  const last50 = data.series.slice(-50).reverse();
  const showMM200 = assetKey !== 'vix';

  return (
    <div className="bg-[#1a1d27] border border-[#2e3347] rounded-xl p-5 max-h-[500px] overflow-y-auto">
      <div className="text-[13px] text-[#6b7280] uppercase tracking-wide mb-3 font-semibold">Dernieres donnees</div>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="text-left px-3 py-2.5 text-[#6b7280] font-semibold border-b border-[#2e3347] text-[11px] uppercase tracking-wide">Date</th>
            <th className="text-left px-3 py-2.5 text-[#6b7280] font-semibold border-b border-[#2e3347] text-[11px] uppercase tracking-wide">Cours</th>
            <th className="text-left px-3 py-2.5 text-[#6b7280] font-semibold border-b border-[#2e3347] text-[11px] uppercase tracking-wide">Var. %</th>
            {config.hasMM && (
              <>
                <th className="text-left px-3 py-2.5 text-[#6b7280] font-semibold border-b border-[#2e3347] text-[11px] uppercase tracking-wide">MM50</th>
                {showMM200 && <th className="text-left px-3 py-2.5 text-[#6b7280] font-semibold border-b border-[#2e3347] text-[11px] uppercase tracking-wide">MM200</th>}
              </>
            )}
            {config.hasRSI && (
              <th className="text-left px-3 py-2.5 text-[#6b7280] font-semibold border-b border-[#2e3347] text-[11px] uppercase tracking-wide">RSI 14</th>
            )}
          </tr>
        </thead>
        <tbody>
          {last50.map((s, idx) => {
            const i = data.series.length - 1 - idx;
            const varColor = s.variation == null ? '' : s.variation >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]';
            return (
              <tr key={s.date + i} className="hover:bg-[#242836]">
                <td className="px-3 py-2.5 border-b border-[#2e3347]">{s.date}</td>
                <td className="px-3 py-2.5 border-b border-[#2e3347]">{fmtPrice(s.close, digits)}</td>
                <td className={`px-3 py-2.5 border-b border-[#2e3347] ${varColor}`}>{fmtPct(s.variation)}</td>
                {config.hasMM && (
                  <>
                    <td className="px-3 py-2.5 border-b border-[#2e3347]">{data.mm50?.[i] != null ? fmtPrice(data.mm50[i]!, digits) : '--'}</td>
                    {showMM200 && <td className="px-3 py-2.5 border-b border-[#2e3347]">{data.mm200?.[i] != null ? fmtPrice(data.mm200[i]!, digits) : '--'}</td>}
                  </>
                )}
                {config.hasRSI && (
                  <td className="px-3 py-2.5 border-b border-[#2e3347]">{data.rsi14?.[i] ?? '--'}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
