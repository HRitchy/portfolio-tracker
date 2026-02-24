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
    <div className="flex gap-1 mb-3">
      {periods.map((p) => (
        <button
          key={p.days}
          onClick={() => onChange(p.days)}
          className={`px-3.5 py-1.5 border rounded-md text-xs cursor-pointer transition-all ${
            activeDays === p.days
              ? 'bg-[#6366f1] text-white border-[#6366f1]'
              : 'bg-[#242836] text-[#9da3b4] border-[#2e3347] hover:border-[#6366f1]'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
