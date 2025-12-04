<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
});

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };
  return sizes[props.size];
});

function close() {
  emit('update:open', false);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close();
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    }
  }
);

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
          @click="close"
        />

        <Transition
          enter-active-class="duration-200 ease-out"
          enter-from-class="scale-95 opacity-0 translate-y-4 sm:translate-y-0"
          enter-to-class="scale-100 opacity-100 translate-y-0"
          leave-active-class="duration-150 ease-in"
          leave-from-class="scale-100 opacity-100 translate-y-0"
          leave-to-class="scale-95 opacity-0 translate-y-4 sm:translate-y-0"
        >
          <div
            v-if="open"
            class="relative z-10 w-full overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[90vh]"
            :class="sizeClasses"
          >
            <div class="flex items-start justify-between border-b border-gray-200 px-5 py-4 bg-white">
              <div class="pr-6">
                <h2 class="text-base font-semibold leading-6 text-gray-900 tracking-tight">
                  {{ title }}
                </h2>
                <p v-if="description" class="mt-1 text-xs text-gray-500">
                  {{ description }}
                </p>
              </div>
              
              <button
                class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1"
                @click="close"
                aria-label="Close"
              >
                <Icon name="lucide:x" class="h-4 w-4" />
              </button>
            </div>

            <div class="px-5 py-5 overflow-y-auto">
              <slot />
            </div>

            <div 
              v-if="$slots.footer" 
              class="bg-gray-50 px-5 py-4 flex items-center justify-end gap-3 border-t border-gray-200"
            >
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>