'use client';

const periods = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1A', days: 365 },
  { label: 'Max', days: 9999 },
];

export default function PeriodSelector({
  activeDays,
  onChange,
}: {
  activeDays: number;
  onChange: (days: number) => void;
}) {
  return (
    <div className="flex gap-1 md:gap-1.5">
      {periods.map((p) => (
        <button
          key={p.days}
          onClick={() => onChange(p.days)}
          className={`px-3 py-2 md:px-3.5 md:py-1.5 border rounded-md text-xs cursor-pointer transition-all ${
            activeDays === p.days
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]'
              : 'bg-[var(--panel-hover)] text-[var(--nav-text)] border-[var(--border)] hover:border-[var(--accent)]'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
