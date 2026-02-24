const segments = [
  { label: 'MSCI World (MWRE)', pct: 70, color: '#6366f1' },
  { label: 'Bitcoin (BTC)', pct: 10, color: '#f7931a' },
  { label: 'Or (GLDA)', pct: 10, color: '#eab308' },
  { label: 'Fonds Monetaire (XEON)', pct: 10, color: '#10b981' },
];

export default function AllocationBar() {
  return (
    <div className="bg-[#1a1d27] border border-[#2e3347] rounded-xl p-5 mt-4">
      <div className="text-[13px] text-[#6b7280] uppercase tracking-wide mb-3 font-semibold">
        Repartition du portefeuille
      </div>
      <div className="flex h-8 rounded-lg overflow-hidden my-3">
        {segments.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-center text-[11px] font-semibold text-white"
            style={{ width: `${s.pct}%`, background: s.color }}
          >
            {s.pct}%
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 mt-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-[13px]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
