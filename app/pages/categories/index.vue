<script setup lang="ts">
import type { Category } from '~~/server/database/schema';

const toast = useToast();

// Fetch categories
const {
  data: categories,
  pending,
  refresh,
} = await useFetch('/api/categories');

// Modal state
const isModalOpen = ref(false);
const editingCategory = ref<Category | null>(null);
const isSubmitting = ref(false);

// Form state
const form = reactive({
  name: '',
  description: '',
  parentId: '',
  color: '#6B7280',
});

// Preset colors with labels
const presetColors = [
  { value: '#6B7280', label: 'Gray' },
  { value: '#EF4444', label: 'Red' },
  { value: '#F97316', label: 'Orange' },
  { value: '#EAB308', label: 'Yellow' },
  { value: '#22C55E', label: 'Green' },
  { value: '#14B8A6', label: 'Teal' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#F43F5E', label: 'Rose' },
];

// Table columns
const columns = [
  { key: 'name', label: 'Category' },
  { key: 'parent', label: 'Parent' },
  {
    key: 'products',
    label: 'Products',
    class: 'text-right',
    headerClass: 'text-right',
  },
  { key: 'actions', label: '', class: 'w-24' },
];

function openCreateModal() {
  editingCategory.value = null;
  resetForm();
  isModalOpen.value = true;
}

function openEditModal(category: Category) {
  editingCategory.value = category;
  Object.assign(form, {
    name: category.name,
    description: category.description || '',
    parentId: category.parentId || '',
    color: category.color || '#6B7280',
  });
  isModalOpen.value = true;
}

function resetForm() {
  Object.assign(form, {
    name: '',
    description: '',
    parentId: '',
    color: '#6B7280',
  });
}

async function saveCategory() {
  if (!form.name.trim()) {
    toast.warning('Please enter a category name');
    return;
  }

  isSubmitting.value = true;
  try {
    if (editingCategory.value) {
      await $fetch(`/api/categories/${editingCategory.value.id}`, {
        method: 'PUT',
        body: form,
      });
      toast.success('Category updated successfully');
    } else {
      await $fetch('/api/categories', {
        method: 'POST',
        body: form,
      });
      toast.success('Category created successfully');
    }
    isModalOpen.value = false;
    refresh();
  } catch (error) {
    console.error('Failed to save category:', error);
    toast.error('Failed to save category');
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteCategory(id: string, name: string) {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

  try {
    await $fetch(`/api/categories/${id}`, { method: 'DELETE' });
    toast.success('Category deleted successfully');
    refresh();
  } catch (error) {
    console.error('Failed to delete category:', error);
    toast.error('Failed to delete category');
  }
}

// Filter out current category from parent options to prevent circular reference
const parentOptions = computed(() => {
  if (!categories.value) return [];
  if (!editingCategory.value) return categories.value;
  return categories.value.filter((c) => c.id !== editingCategory.value?.id);
});

// Stats computed
const totalCategories = computed(() => categories.value?.length ?? 0);
const topLevelCategories = computed(
  () => categories.value?.filter((c) => !c.parentId).length ?? 0
);
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900">Categories</h1>
        <p class="text-xs text-gray-500">Organize products by category</p>
      </div>
      <button class="btn-primary" @click="openCreateModal">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
        Add
      </button>
    </div>

    <!-- Quick Stats -->
    <div class="flex gap-3">
      <div
        class="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-1.5"
      >
        <Icon name="lucide:folder" class="h-3.5 w-3.5 text-gray-400" />
        <span class="text-xs">
          <span class="font-medium font-mono">{{ totalCategories }}</span>
          <span class="text-gray-500"> total</span>
        </span>
      </div>
      <div
        class="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-1.5"
      >
        <Icon name="lucide:folder-tree" class="h-3.5 w-3.5 text-gray-400" />
        <span class="text-xs">
          <span class="font-medium font-mono">{{ topLevelCategories }}</span>
          <span class="text-gray-500"> top level</span>
        </span>
      </div>
    </div>

    <!-- Categories Table -->
    <div class="card overflow-hidden">
      <UiDataTable
        :columns="columns"
        :data="categories || []"
        :loading="pending"
        empty-title="No categories"
        empty-description="Create categories to organize products."
        empty-icon="lucide:folder-plus"
        hoverable
      >
        <template #name="{ item }">
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-7 w-7 items-center justify-center rounded"
              :style="{ backgroundColor: (item.color || '#6B7280') + '15' }"
            >
              <div
                class="h-2.5 w-2.5 rounded-full"
                :style="{ backgroundColor: item.color || '#6B7280' }"
              />
            </div>
            <div>
              <p class="text-xs font-medium text-gray-900">{{ item.name }}</p>
              <p
                v-if="item.description"
                class="max-w-[200px] truncate text-xs text-gray-500"
              >
                {{ item.description }}
              </p>
            </div>
          </div>
        </template>

        <template #parent="{ item }">
          <span v-if="item.parent" class="badge">
            <div
              class="mr-1 h-1.5 w-1.5 rounded-full"
              :style="{ backgroundColor: item.parent.color || '#6B7280' }"
            />
            {{ item.parent.name }}
          </span>
          <span v-else class="text-gray-400">—</span>
        </template>

        <template #products="{ item }">
          <span class="font-mono text-xs tabular-nums text-gray-600">{{
            item._count?.products ?? 0
          }}</span>
        </template>

        <template #actions="{ item }">
          <div
            class="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              @click="openEditModal(item)"
              aria-label="Edit"
            >
              <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
            </button>
            <button
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              @click="deleteCategory(item.id, item.name)"
              aria-label="Delete"
            >
              <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
            </button>
          </div>
        </template>
      </UiDataTable>
    </div>

    <!-- Create/Edit Modal -->
    <UiModal
      v-model:open="isModalOpen"
      :title="editingCategory ? 'Edit Category' : 'New Category'"
      size="md"
    >
      <form id="category-form" class="space-y-4" @submit.prevent="saveCategory">
        <div>
          <label class="label">Name <span class="text-red-500">*</span></label>
          <UiInput
            v-model="form.name"
            placeholder="e.g., Electronics"
            autofocus
          />
        </div>

        <div>
          <label class="label">Description</label>
          <textarea
            v-model="form.description"
            class="input min-h-[80px] resize-none"
            placeholder="Brief description..."
          />
        </div>

        <div>
          <label class="label">Parent Category</label>
          <select v-model="form.parentId" class="input">
            <option value="">None (top level)</option>
            <option v-for="cat in parentOptions" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="label">Color</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="color in presetColors"
              :key="color.value"
              type="button"
              class="relative h-7 w-7 rounded border-2 transition-all hover:scale-105"
              :class="
                form.color === color.value
                  ? 'border-gray-900'
                  : 'border-transparent'
              "
              :style="{ backgroundColor: color.value }"
              :title="color.label"
              @click="form.color = color.value"
            >
              <Icon
                v-if="form.color === color.value"
                name="lucide:check"
                class="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow"
              />
            </button>
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          class="btn-secondary"
          :disabled="isSubmitting"
          @click="isModalOpen = false"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          form="category-form"
          class="btn-primary" 
          :disabled="isSubmitting"
        >
          <Icon
            v-if="isSubmitting"
            name="lucide:loader-2"
            class="h-3.5 w-3.5 animate-spin"
          />
          {{ editingCategory ? 'Update' : 'Create' }}
        </button>
      </template>
    </UiModal>
  </div>
</template>
