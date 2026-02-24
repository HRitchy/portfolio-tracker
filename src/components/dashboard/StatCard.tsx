import { fmtPrice, fmtPct, chgClass, getDigitsForKey } from '@/lib/formatting';
import { AssetKey, ProcessedAsset } from '@/lib/types';
import { ASSETS } from '@/lib/config';

const colorMap: Record<string, string> = {
  up: 'text-[#10b981]',
  down: 'text-[#ef4444]',
  neutral: 'text-[#6b7280]',
};

export default function StatCard({ assetKey, data }: { assetKey: AssetKey; data: ProcessedAsset | null | undefined }) {
  const cfg = ASSETS[assetKey];
  const last = data?.series?.[data.series.length - 1];
  const digits = getDigitsForKey(assetKey);

  return (
    <div className="bg-[#1a1d27] border border-[#2e3347] rounded-xl p-5">
      <div className="text-xs text-[#6b7280] mb-2 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: cfg.color }} />
        {cfg.name}
      </div>
      <div className="text-[28px] font-bold mb-1">
        {last ? fmtPrice(last.close, digits) : '--'}
      </div>
      <div className={`text-[13px] font-medium ${colorMap[last ? chgClass(last.variation) : 'neutral']}`}>
        {last ? fmtPct(last.variation) : '--'}
      </div>
    </div>
  );
}
