import { Store } from '@/lib/types';
import { useAssets } from '@/context/AssetsContext';
import Card from '@/components/ui/Card';

export default function DrawdownOverview({ store }: { store: Store }) {
  const { assets, portfolioKeys } = useAssets();
  const items = portfolioKeys.map((key) => {
    const d = store[key];
    if (!d?.drawdown) return null;
    const dd = d.drawdown;
    const current = dd[dd.length - 1];
    if (current == null) return null;
    const maxDD = dd.reduce<number | null>((min, v) => {
      if (v == null) return min;
      if (min == null) return v;
      return v < min ? v : min;
    }, null);
    const severity = current < -20 ? '#ef4444' : current < -10 ? '#f59e0b' : current < -5 ? '#eab308' : '#10b981';
    const label = current < -20 ? 'Critique' : current < -10 ? 'Modéré' : current < -5 ? 'Léger' : 'Faible';
    return { key, name: assets[key]?.name ?? key, current, maxDD, severity, label };
  }).filter(Boolean);

  return (
    <Card title="Drawdown - Vue d'ensemble" className="mb-0">
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-[100px] text-[var(--muted)]">Aucune donnée Drawdown</div>
      ) : (
        items.map((item) => item && (
          <div key={item.key} className="flex items-center gap-2 md:gap-3 py-2">
            <div className="w-[90px] md:w-[120px] text-xs md:text-[13px] font-semibold truncate shrink-0">{item.name}</div>
            <div className="flex-1 h-2 bg-[var(--border)] rounded relative overflow-visible min-w-0">
              <div
                className="h-full rounded"
                style={{ width: `${Math.min(Math.abs(item.current), 100)}%`, background: item.severity, opacity: 0.3 }}
              />
              <div
                className="absolute top-[-4px] w-4 h-4 rounded-full border-2 border-[var(--panel)]"
                style={{ left: `${Math.min(Math.abs(item.current), 100)}%`, background: item.severity, transform: 'translateX(-50%)' }}
              />
            </div>
            <div className="w-[100px] md:w-[120px] text-right shrink-0">
              <span className="text-base md:text-lg font-bold" style={{ color: item.severity }}>{item.current.toFixed(2)}%</span>
              <div className="text-[10px] text-[var(--muted)]">{item.label} (max: {item.maxDD?.toFixed(1)}%)</div>
            </div>
          </div>
        ))
      )}
    </Card>
  );
}
