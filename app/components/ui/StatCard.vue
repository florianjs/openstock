<script setup lang="ts">
interface Props {
  title: string;
  value: string | number;
  icon: string;
  iconColor?: 'default' | 'success' | 'warning' | 'destructive' | 'primary';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: 'default',
});

const iconColorClasses = computed(() => {
  const colors = {
    default: 'text-gray-500',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    destructive: 'text-red-600',
    primary: 'text-primary-600',
  };
  return colors[props.iconColor];
});

const iconBgClasses = computed(() => {
  const colors = {
    default: 'bg-gray-100',
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    destructive: 'bg-red-50',
    primary: 'bg-primary-50',
  };
  return colors[props.iconColor];
});
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-gray-500">{{ title }}</p>
      <div class="flex h-8 w-8 items-center justify-center rounded-lg" :class="iconBgClasses">
        <Icon :name="icon" class="h-4 w-4" :class="iconColorClasses" />
      </div>
    </div>
    <div class="mt-4 flex items-baseline gap-2">
      <h3 class="text-2xl font-semibold text-gray-900 tracking-tight">{{ value }}</h3>
      <span
        v-if="trend"
        class="flex items-center text-xs font-medium"
        :class="trend.isPositive ? 'text-emerald-600' : 'text-red-600'"
      >
        <Icon
          :name="trend.isPositive ? 'lucide:trending-up' : 'lucide:trending-down'"
          class="mr-1 h-3 w-3"
        />
        {{ trend.value }}%
      </span>
    </div>
  </div>
</template>
