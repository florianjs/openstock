<script setup lang="ts">
import { Doughnut } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';

const props = defineProps<{
  data: {
    stockStatus: string;
    count: number;
  }[];
}>();

const statusConfig: Record<string, { label: string; color: string }> = {
  normal: { label: 'Normal', color: '#10B981' },
  low_stock: { label: 'Low Stock', color: '#F59E0B' },
  out_of_stock: { label: 'Out of Stock', color: '#EF4444' },
  overstock: { label: 'Overstock', color: '#3B82F6' },
};

const sortedData = computed(() => {
  const order = ['normal', 'low_stock', 'out_of_stock', 'overstock'];
  return [...props.data].sort(
    (a, b) => order.indexOf(a.stockStatus) - order.indexOf(b.stockStatus)
  );
});

const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: sortedData.value.map(
    (d) => statusConfig[d.stockStatus]?.label || d.stockStatus
  ),
  datasets: [
    {
      data: sortedData.value.map((d) => d.count),
      backgroundColor: sortedData.value.map(
        (d) => statusConfig[d.stockStatus]?.color || '#6B7280'
      ),
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
}));

const chartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const total = context.dataset.data.reduce(
            (a, b) => (a as number) + (b as number),
            0
          ) as number;
          const percentage = ((context.parsed / total) * 100).toFixed(1);
          return `${context.label}: ${context.parsed} (${percentage}%)`;
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
  <div class="flex items-center gap-6">
    <!-- Chart -->
    <div class="relative h-36 w-36 shrink-0">
      <Doughnut :data="chartData" :options="chartOptions" />
      <div
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div class="text-center">
          <p class="text-xl font-bold text-gray-900">{{ totalProducts }}</p>
          <p class="text-xs text-gray-500">Total</p>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex-1 space-y-2">
      <div
        v-for="item in sortedData"
        :key="item.stockStatus"
        class="flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <div
            class="h-3 w-3 rounded-full"
            :style="{ backgroundColor: statusConfig[item.stockStatus]?.color }"
          />
          <span class="text-sm text-gray-600">
            {{ statusConfig[item.stockStatus]?.label || item.stockStatus }}
          </span>
        </div>
        <span class="text-sm font-medium text-gray-900">{{ item.count }}</span>
      </div>
    </div>
  </div>
</template>
