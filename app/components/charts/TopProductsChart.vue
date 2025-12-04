<script setup lang="ts">
import { Bar } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';

const props = defineProps<{
  data: {
    name: string;
    stockValue: number;
  }[];
}>();

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.data.map((d) => truncateName(d.name)),
  datasets: [
    {
      data: props.data.map((d) => d.stockValue),
      backgroundColor: '#3B82F6',
      borderRadius: 4,
      barThickness: 20,
    },
  ],
}));

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => formatCurrency(context.parsed.x ?? 0),
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
      ticks: {
        font: {
          size: 11,
        },
        callback: (value) => formatCurrency(value as number),
      },
    },
    y: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 11,
        },
      },
    },
  },
};

function truncateName(name: string, maxLength = 20): string {
  return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
}

const { currencySymbol } = useSettings();

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `${currencySymbol.value}${(value / 1000).toFixed(1)}k`;
  }
  return `${currencySymbol.value}${value.toFixed(0)}`;
}
</script>

<template>
  <div class="h-64">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
