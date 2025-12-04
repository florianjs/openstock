<script setup lang="ts">
interface Props {
  modelValue: string | number;
  type?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
  icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
  label: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700">
      {{ label }}
    </label>
    <div class="relative">
      <Icon
        v-if="icon"
        :name="icon"
        class="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
      />
      <input
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        class="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
        :class="[
          { 'border-red-500 focus-visible:ring-red-500': error },
          { 'pl-9': icon }
        ]"
      />
    </div>
    <p v-if="error" class="text-[0.8rem] font-medium text-destructive">{{ error }}</p>
  </div>
</template>
