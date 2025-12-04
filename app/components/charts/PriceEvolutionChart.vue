<script setup lang="ts">
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const props = defineProps<{
  productId: string;
  currencySymbol: string;
}>();

const { data: priceData, pending } = await useFetch(
  () => `/api/products/${props.productId}/price-history`
);

const chartData = computed(() => {
  if (!priceData.value) {
    return { labels: [], datasets: [] };
  }

  const colors = [
    'rgb(59, 130, 246)', // Blue
    'rgb(34, 197, 94)', // Green
    'rgb(249, 115, 22)', // Orange
    'rgb(168, 85, 247)', // Purple
    'rgb(236, 72, 153)', // Pink
    'rgb(20, 184, 166)', // Teal
  ];

  const datasets = [
    {
      label: 'Selling Price',
      data: priceData.value.sellingPrice.data,
      borderColor: 'rgb(239, 68, 68)', // Red
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.3,
      fill: false,
      borderWidth: 2,
      pointRadius: 4,
    },
    ...priceData.value.suppliers.map((supplier: any, index: number) => {
      const color = colors[index % colors.length] || 'rgb(107, 114, 128)';
      return {
        label: `${supplier.supplierName} (Purchase)`,
        data: supplier.data,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
        tension: 0.3,
        fill: false,
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 3,
      };
    }),
  ];

  return {
    labels: priceData.value.labels.map((date: string) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets,
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} ${
            props.currencySymbol
          }`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: false,
      ticks: {
        callback: (value: any) => `${value} ${props.currencySymbol}`,
      },
    },
  },
}));

const hasData = computed(() => {
  return (
    priceData.value &&
    (priceData.value.sellingPrice.data.length > 1 ||
      priceData.value.suppliers.some((s: any) => s.data.length > 1))
  );
});
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
    <h2 class="text-lg font-medium text-gray-900 mb-4">Price Evolution</h2>

    <div v-if="pending" class="flex justify-center py-8">
      <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <div v-else-if="!hasData" class="text-center py-8 text-gray-500">
      <Icon
        name="lucide:trending-up"
        class="h-8 w-8 mx-auto mb-2 text-gray-300"
      />
      <p>Not enough price history data to display the chart.</p>
      <p class="text-sm mt-1">Price changes will be tracked over time.</p>
    </div>

    <div v-else class="h-64">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
