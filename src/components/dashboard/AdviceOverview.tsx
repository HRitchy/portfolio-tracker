import Card from '@/components/ui/Card';
import { getAdviceDescription, getAssetAdvice, getAssetClassLabel, adviceTone } from '@/lib/advice';
import { ASSETS } from '@/lib/config';
import { Store } from '@/lib/types';

export default function AdviceOverview({ store }: { store: Store }) {
  const excludedAssets = new Set(['vix', 'eurusd']);
  const adviceByAsset = getAssetAdvice(store).filter((item) => !excludedAssets.has(item.key));

  return (
    <Card title="Conseils automatiques par classe d'actifs" className="mb-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {adviceByAsset.map((item) => {
          const cfg = ASSETS[item.key];
          return (
            <div key={item.key} className="rounded-xl border border-[var(--border)] p-4 bg-[var(--bg-soft)]/30">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <div className="text-xs text-[var(--muted)] uppercase tracking-wide">{getAssetClassLabel(item.key)}</div>
                  <div className="font-semibold">{cfg.name}</div>
                </div>
                <div className={`text-xs font-semibold px-3 py-1 rounded-full ${adviceTone(item.advice)}`}>
                  {item.advice}
                </div>
              </div>

              <p className="text-sm text-[var(--muted)] mb-2">{getAdviceDescription(item.advice)}</p>

              <ul className="text-xs text-[var(--muted)] space-y-1 list-disc pl-4">
                {item.reasons.slice(0, 2).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
