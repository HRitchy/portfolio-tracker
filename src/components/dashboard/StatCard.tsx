import { fmtPrice, fmtPct, chgClass, getDigitsForKey } from '@/lib/formatting';
import { AssetKey, ProcessedAsset } from '@/lib/types';
import { ASSETS } from '@/lib/config';

const colorMap: Record<string, string> = {
  up: 'text-[var(--success)]',
  down: 'text-[var(--danger)]',
  neutral: 'text-[var(--muted)]',
};

export default function StatCard({ assetKey, data }: { assetKey: AssetKey; data: ProcessedAsset | null | undefined }) {
  const cfg = ASSETS[assetKey];
  const series = data?.series;
  const last = series?.length ? series[series.length - 1] : undefined;
  const digits = getDigitsForKey(assetKey);
  const direction = last ? chgClass(last.variation) : 'neutral';

  return (
    <div className="data-card p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="text-xs text-[var(--muted)] flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: cfg.color }} />
          {cfg.name}
        </div>
        <div className={`text-[11px] font-semibold px-2 py-1 rounded-full bg-[var(--panel-hover)] ${colorMap[direction]}`}>
          {last?.variation == null ? '--' : last.variation >= 0 ? 'Hausse' : 'Baisse'}
        </div>
      </div>

      <div className={`text-[30px] leading-none font-bold mb-2 ${colorMap[direction]}`}>
        {last ? fmtPrice(last.close, digits) : '--'}
      </div>

      <div className="flex items-end justify-between">
        <div className={`text-sm font-semibold ${colorMap[direction]}`}>
          {last ? fmtPct(last.variation) : '--'}
        </div>
        <div className="text-[11px] text-[var(--muted)]">Derniere seance</div>
      </div>
    </div>
  );
}
