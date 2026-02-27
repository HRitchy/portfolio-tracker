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

function applyChartTheme() {
  ChartJS.defaults.color = getCssVar('--nav-text', '#9da3b4');
  ChartJS.defaults.borderColor = getCssVar('--border', 'rgba(46,51,71,0.5)');
}

applyChartTheme();

if (typeof window !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        applyChartTheme();
        break;
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

ChartJS.defaults.font.family = "'Segoe UI',system-ui,sans-serif";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.plugins.legend.labels.boxWidth = 12;
ChartJS.defaults.plugins.legend.labels.padding = 16;
(ChartJS.defaults.animation as Record<string, unknown>).duration = 500;

export function chartOpts(yLabel?: string) {
  applyChartTheme();
  const panel = getCssVar('--panel', '#1a1d27');
  const border = getCssVar('--border', '#2e3347');
  const navText = getCssVar('--nav-text', '#9da3b4');
  const text = getCssVar('--text', '#e2e8f0');
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
        titleColor: text,
        bodyColor: text,
        footerColor: text,
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y?: number | null } }) => {
            const datasetLabel = context.dataset.label ?? '';
            const value = context.parsed?.y;
            if (value === null || value === undefined || Number.isNaN(value)) return datasetLabel;
            const rounded = Math.round(value * 100) / 100;
            return datasetLabel ? `${datasetLabel}: ${rounded}` : `${rounded}`;
          },
        },
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
