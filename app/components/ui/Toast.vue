<script setup lang="ts">
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Props {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  duration: 4000,
});

const emit = defineEmits<{
  close: [id: string];
}>();

const isVisible = ref(true);
const progress = ref(100);

const iconMap = {
  success: 'lucide:check',
  error: 'lucide:x',
  warning: 'lucide:alert-triangle',
  info: 'lucide:info',
};

const colorClasses = {
  success: {
    container: 'bg-white border-gray-200',
    icon: 'text-green-600',
    progress: 'bg-green-600',
  },
  error: {
    container: 'bg-white border-gray-200',
    icon: 'text-red-600',
    progress: 'bg-red-600',
  },
  warning: {
    container: 'bg-white border-gray-200',
    icon: 'text-amber-600',
    progress: 'bg-amber-600',
  },
  info: {
    container: 'bg-white border-gray-200',
    icon: 'text-gray-900',
    progress: 'bg-gray-900',
  },
};

let timer: ReturnType<typeof setTimeout>;
let startTime: number;
let remainingTime: number;

function startTimer() {
  startTime = Date.now();
  remainingTime = props.duration;

  const updateProgress = () => {
    const elapsed = Date.now() - startTime;
    progress.value = Math.max(0, 100 - (elapsed / props.duration) * 100);

    if (progress.value > 0) {
      requestAnimationFrame(updateProgress);
    }
  };

  requestAnimationFrame(updateProgress);

  timer = setTimeout(() => {
    close();
  }, props.duration);
}

function close() {
  isVisible.value = false;
  setTimeout(() => {
    emit('close', props.id);
  }, 100);
}

function pauseTimer() {
  clearTimeout(timer);
  remainingTime -= Date.now() - startTime;
}

function resumeTimer() {
  startTime = Date.now();
  timer = setTimeout(close, remainingTime);
}

onMounted(() => {
  if (props.duration > 0) {
    startTimer();
  }
});

onUnmounted(() => {
  clearTimeout(timer);
});
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 translate-x-2"
    enter-to-class="opacity-100 translate-x-0"
    leave-active-class="transition-all duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0 translate-x-2"
  >
    <div
      v-if="isVisible"
      class="pointer-events-auto relative w-full max-w-xs overflow-hidden rounded border shadow-sm"
      :class="colorClasses[type].container"
      role="alert"
      @mouseenter="pauseTimer"
      @mouseleave="resumeTimer"
    >
      <div class="flex items-start gap-2.5 px-3 py-2.5">
        <!-- Icon -->
        <div class="shrink-0 mt-0.5">
          <Icon
            :name="iconMap[type]"
            class="h-4 w-4"
            :class="colorClasses[type].icon"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-gray-900">{{ title }}</p>
          <p v-if="description" class="text-xs text-gray-500 mt-0.5">
            {{ description }}
          </p>
        </div>

        <!-- Close button -->
        <button
          class="shrink-0 -mt-0.5 -mr-1 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          @click="close"
          aria-label="Dismiss"
        >
          <Icon name="lucide:x" class="h-3 w-3" />
        </button>
      </div>

      <!-- Progress bar -->
      <div
        v-if="duration > 0"
        class="absolute bottom-0 left-0 h-px transition-all duration-75"
        :class="colorClasses[type].progress"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </Transition>
</template>
