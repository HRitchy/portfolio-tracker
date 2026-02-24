import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  TimeScale,
  Tooltip,
  Legend,
  Filler
);

function getCssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

ChartJS.defaults.color = getCssVar('--nav-text', '#9da3b4');
ChartJS.defaults.borderColor = getCssVar('--border', 'rgba(46,51,71,0.5)');
ChartJS.defaults.font.family = "'Segoe UI',system-ui,sans-serif";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.plugins.legend.labels.boxWidth = 12;
ChartJS.defaults.plugins.legend.labels.padding = 16;
(ChartJS.defaults.animation as Record<string, unknown>).duration = 500;

export function chartOpts(yLabel?: string) {
  const panel = getCssVar('--panel', '#1a1d27');
  const border = getCssVar('--border', '#2e3347');
  const navText = getCssVar('--nav-text', '#9da3b4');
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        backgroundColor: panel,
        borderColor: border,
        borderWidth: 1,
        titleFont: { weight: 'bold' as const },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'month' as const, tooltipFormat: 'dd/MM/yyyy' },
        grid: { display: false },
      },
      y: {
        title: { display: !!yLabel, text: yLabel },
        ticks: { color: navText },
        grid: { color: border },
      },
    },
  };
}
