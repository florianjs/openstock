<script setup lang="ts">
import { Doughnut } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';

const props = defineProps<{
  data: {
    categoryName: string | null;
    categoryColor: string | null;
    count: number;
  }[];
}>();

const defaultColors = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: props.data.map((d) => d.categoryName || 'Uncategorized'),
  datasets: [
    {
      data: props.data.map((d) => d.count),
      backgroundColor: props.data.map(
        (d, i) => d.categoryColor || defaultColors[i % defaultColors.length]
      ),
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
}));

const chartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      display: true,
      position: 'right',
      labels: {
        boxWidth: 12,
        boxHeight: 12,
        padding: 12,
        usePointStyle: true,
        pointStyle: 'circle',
        font: {
          size: 12,
        },
        generateLabels: (chart) => {
          const datasets = chart.data.datasets;
          const dataset = datasets[0];
          if (!dataset) return [];
          const bgColors = dataset.backgroundColor as string[];
          return (chart.data.labels ?? []).map((label, i) => ({
            text: `${label} (${dataset.data[i] ?? 0})`,
            fillStyle: bgColors[i] ?? '#6B7280',
            strokeStyle: bgColors[i] ?? '#6B7280',
            hidden: false,
            index: i,
            pointStyle: 'circle' as const,
          }));
        },
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const total = context.dataset.data.reduce(
            (a, b) => (a as number) + (b as number),
            0
          ) as number;
          const percentage = ((context.parsed / total) * 100).toFixed(1);
          return `${context.label}: ${context.parsed} products (${percentage}%)`;
        },
      },
    },
  },
};

const totalProducts = computed(() =>
  props.data.reduce((sum, d) => sum + d.count, 0)
);
</script>

<template>
  <div class="relative h-56">
    <Doughnut :data="chartData" :options="chartOptions" />
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
      style="left: -25%"
    >
      <div class="text-center">
        <p class="text-2xl font-bold text-gray-900">{{ totalProducts }}</p>
        <p class="text-xs text-gray-500">Products</p>
      </div>
    </div>
  </div>
</template>
