<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
  compact?: boolean;
  inline?: boolean;
}

withDefaults(defineProps<Props>(), {
  compact: false,
  inline: false,
});
</script>

<template>
  <div
    :class="[
      inline
        ? 'empty-state-inline'
        : compact
        ? 'empty-state-compact'
        : 'empty-state',
    ]"
  >
    <div class="empty-icon" :class="compact ? 'h-10 w-10' : 'h-12 w-12'">
      <slot name="icon">
        <Icon
          name="lucide:inbox"
          class="text-gray-400"
          :class="compact ? 'h-5 w-5' : 'h-6 w-6'"
        />
      </slot>
    </div>

    <h3 class="empty-title">
      {{ title }}
    </h3>

    <p v-if="description" class="empty-description">
      {{ description }}
    </p>

    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
