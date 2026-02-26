import { Store } from '@/lib/types';
import { ASSETS, RSI_KEYS } from '@/lib/config';
import Card from '@/components/ui/Card';

export default function RSIOverview({ store }: { store: Store }) {
  const items = RSI_KEYS.map((key) => {
    const d = store[key];
    if (!d?.rsi14) return null;
    const val = d.rsi14[d.rsi14.length - 1];
    if (val == null) return null;
    const color = val > 70 ? '#ef4444' : val < 30 ? '#10b981' : '#6366f1';
    const label = val > 70 ? 'Suracheté' : val < 30 ? 'Survendu' : 'Neutre';
    return { key, name: ASSETS[key].name, val, color, label };
  }).filter(Boolean);

  return (
    <Card title="RSI - Vue d'ensemble" className="mb-0">
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-[100px] text-[var(--muted)]">Aucune donnée RSI</div>
      ) : (
        items.map((item) => item && (
          <div key={item.key} className="flex items-center gap-3 py-2">
            <div className="w-[120px] text-[13px] font-semibold">{item.name}</div>
            <div className="flex-1 h-2 bg-[var(--border)] rounded relative overflow-visible">
              <div
                className="h-full rounded"
                style={{ width: `${item.val}%`, background: item.color, opacity: 0.3 }}
              />
              <div
                className="absolute top-[-4px] w-4 h-4 rounded-full border-2 border-[var(--panel)]"
                style={{ left: `${item.val}%`, background: item.color, transform: 'translateX(-50%)' }}
              />
            </div>
            <div className="w-[80px] text-right">
              <span className="text-lg font-bold" style={{ color: item.color }}>{item.val}</span>
              <div className="text-[10px] text-[var(--muted)]">{item.label}</div>
            </div>
          </div>
        ))
      )}
    </Card>
  );
}
