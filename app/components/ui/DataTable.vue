<script setup lang="ts">
interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  class?: string;
  headerClass?: string;
  width?: string;
}

interface Props {
  columns: Column[];
  data: any[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  hoverable?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  emptyTitle: 'No data',
  emptyDescription: 'No items found in this view.',
  emptyIcon: 'lucide:inbox',
  hoverable: true,
});

defineSlots<{
  [key: string]: (props: { item: any; index: number }) => any;
  empty: () => any;
}>();
</script>

<template>
  <div
    class="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ring-1 ring-gray-900/5"
  >
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm whitespace-nowrap">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 select-none"
              :class="[
                column.headerClass,
                column.width,
                column.align === 'right' ? 'text-right' : 'text-left',
                column.align === 'center' ? 'text-center' : '',
              ]"
            >
              <div
                class="flex items-center gap-1.5 group cursor-pointer"
                :class="[
                  column.align === 'right' ? 'justify-end' : '',
                  column.align === 'center' ? 'justify-center' : '',
                ]"
              >
                <span>{{ column.label }}</span>
                <Icon
                  v-if="column.sortable"
                  name="lucide:arrow-up-down"
                  class="h-3 w-3 text-gray-300 transition-colors group-hover:text-gray-600"
                />
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-if="loading">
            <td :colspan="columns.length" class="h-32 text-center">
              <div class="flex flex-col items-center justify-center gap-3">
                <Icon
                  name="lucide:loader-2"
                  class="h-5 w-5 animate-spin text-gray-900"
                />
                <span class="text-xs font-medium text-gray-500 animate-pulse"
                  >Loading data...</span
                >
              </div>
            </td>
          </tr>

          <tr v-else-if="!data.length">
            <td :colspan="columns.length" class="p-0">
              <slot name="empty">
                <div
                  class="flex flex-col items-center justify-center py-12 text-center bg-gray-50/30"
                >
                  <div class="rounded-full bg-gray-100 p-3 mb-3">
                    <Icon :name="emptyIcon" class="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 class="text-sm font-medium text-gray-900">
                    {{ emptyTitle }}
                  </h3>
                  <p class="mt-1 text-xs text-gray-500">
                    {{ emptyDescription }}
                  </p>
                </div>
              </slot>
            </td>
          </tr>

          <template v-else>
            <tr
              v-for="(item, index) in data"
              :key="item.id || index"
              class="group transition-colors duration-150 ease-in-out"
              :class="[hoverable ? 'hover:bg-gray-50' : '']"
            >
              <td
                v-for="column in columns"
                :key="column.key"
                class="h-10 px-4 py-2 text-sm text-gray-600"
                :class="[
                  column.class,
                  column.align === 'right' ? 'text-right' : 'text-left',
                  column.align === 'center' ? 'text-center' : '',
                ]"
              >
                <slot :name="column.key" :item="item" :index="index">
                  <span :class="{ 'font-medium text-gray-900': index === 0 }">
                    {{ item[column.key] }}
                  </span>
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
