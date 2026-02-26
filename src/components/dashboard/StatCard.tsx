'use client';

import Link from 'next/link';
import { useRef, useEffect, memo } from 'react';
import { fmtPrice, fmtPct, chgClass, getDigitsForKey } from '@/lib/formatting';
import { AssetKey, ProcessedAsset } from '@/lib/types';
import { ASSETS } from '@/lib/config';

const colorMap: Record<string, string> = {
  up: 'text-[var(--success)]',
  down: 'text-[var(--danger)]',
  neutral: 'text-[var(--muted)]',
};

function Sparkline({ series, color }: { series: { close: number }[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || series.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const prices = series.map((s) => s.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    for (let i = 0; i < prices.length; i++) {
      const x = (i / (prices.length - 1)) * w;
      const y = h - ((prices[i] - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [series, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[40px]"
      role="img"
      aria-label="Graphique sparkline des 30 derniers jours"
    />
  );
}

const StatCard = memo(function StatCard({ assetKey, data }: { assetKey: AssetKey; data: ProcessedAsset | null | undefined }) {
  const cfg = ASSETS[assetKey];
  const series = data?.series;
  const last = series?.length ? series[series.length - 1] : undefined;
  const digits = getDigitsForKey(assetKey);
  const direction = last ? chgClass(last.variation) : 'neutral';
  const sparkData = series?.slice(-30) ?? [];

  return (
    <Link href={`/asset/${assetKey}`} className="block group">
      <div className="data-card p-5 transition-all duration-200 group-hover:shadow-lg group-hover:scale-[1.02] group-hover:border-[var(--accent)]/40 fade-in">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="text-xs text-[var(--muted)] flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: cfg.color }} />
            {cfg.name}
          </div>
          <div className={`text-[11px] font-semibold px-2 py-1 rounded-full bg-[var(--panel-hover)] ${colorMap[direction]}`}>
            {last?.variation == null ? '--' : last.variation >= 0 ? 'Hausse' : 'Baisse'}
          </div>
        </div>

        <div className={`text-[28px] leading-none font-bold mb-2 ${colorMap[direction]}`}>
          {last ? fmtPrice(last.close, digits) : '--'}
        </div>

        {sparkData.length > 1 && (
          <div className="mb-2">
            <Sparkline series={sparkData} color={cfg.color} />
          </div>
        )}

        <div className="flex items-end justify-between">
          <div className={`text-sm font-semibold ${colorMap[direction]}`}>
            {last ? fmtPct(last.variation) : '--'}
          </div>
          <div className="text-[11px] text-[var(--muted)]">Dernière séance</div>
        </div>
      </div>
    </Link>
  );
});

export default StatCard;
