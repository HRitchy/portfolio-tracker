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

ChartJS.defaults.color = '#9da3b4';
ChartJS.defaults.borderColor = 'rgba(46,51,71,0.5)';
ChartJS.defaults.font.family = "'Segoe UI',system-ui,sans-serif";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.plugins.legend.labels.boxWidth = 12;
ChartJS.defaults.plugins.legend.labels.padding = 16;
(ChartJS.defaults.animation as Record<string, unknown>).duration = 500;

export function chartOpts(yLabel?: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        backgroundColor: 'rgba(26,29,39,0.95)',
        borderColor: '#2e3347',
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
        grid: { color: 'rgba(46,51,71,0.5)' },
      },
    },
  };
}
