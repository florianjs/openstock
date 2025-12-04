import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
} from 'chart.js';

export default defineNuxtPlugin(() => {
  // Register Chart.js components globally
  ChartJS.register(
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Filler
  );

  // Set default options for all charts
  ChartJS.defaults.font.family = 'Inter, system-ui, sans-serif';
  ChartJS.defaults.color = '#6B7280';
  ChartJS.defaults.plugins.legend.display = false;
  ChartJS.defaults.plugins.tooltip.backgroundColor = '#1F2937';
  ChartJS.defaults.plugins.tooltip.padding = 10;
  ChartJS.defaults.plugins.tooltip.cornerRadius = 6;
  ChartJS.defaults.plugins.tooltip.titleFont = { weight: '600' };
});
