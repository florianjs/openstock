<script setup lang="ts">
import type { StockMovement } from '~~/server/database/schema';

const toast = useToast();

// Fetch movements
const { data: movements, pending, refresh } = await useFetch('/api/movements');

// Modal state
const isModalOpen = ref(false);
const isSubmitting = ref(false);

// Form state
const form = reactive({
  productId: '',
  type: 'in' as 'in' | 'out' | 'adjustment',
  quantity: 1,
  reason: '',
  reference: '',
  supplierId: '',
});

// Fetch products and suppliers for dropdowns
const { data: products } = await useFetch('/api/products');
const { data: suppliers } = await useFetch('/api/suppliers');

// Filters
const filters = reactive({
  search: '',
  type: '' as '' | 'in' | 'out' | 'adjustment',
  productId: '',
});

const filteredMovements = computed(() => {
  if (!movements.value) return [];

  return movements.value.filter((movement) => {
    // Filter by type
    if (filters.type && movement.type !== filters.type) {
      return false;
    }

    // Filter by product
    if (filters.productId && movement.productId !== filters.productId) {
      return false;
    }

    // Filter by search (reference, reason, product name)
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesReference = movement.reference
        ?.toLowerCase()
        .includes(search);
      const matchesReason = movement.reason?.toLowerCase().includes(search);
      const matchesProduct = movement.product?.name
        ?.toLowerCase()
        .includes(search);
      const matchesSku = movement.product?.sku?.toLowerCase().includes(search);

      if (
        !matchesReference &&
        !matchesReason &&
        !matchesProduct &&
        !matchesSku
      ) {
        return false;
      }
    }

    return true;
  });
});

function clearFilters() {
  filters.search = '';
  filters.type = '';
  filters.productId = '';
}

const hasActiveFilters = computed(() => {
  return filters.search || filters.type || filters.productId;
});

// Table columns
const columns = [
  { key: 'date', label: 'Date' },
  { key: 'product', label: 'Product' },
  { key: 'type', label: 'Type' },
  { key: 'quantity', label: 'Qty', class: 'text-right' },
  { key: 'stock', label: 'After', class: 'text-right' },
  { key: 'reference', label: 'Reference' },
];

const movementTypes = [
  {
    value: 'in',
    label: 'In',
    description: 'Receive',
    icon: 'lucide:arrow-down',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    value: 'out',
    label: 'Out',
    description: 'Sales',
    icon: 'lucide:arrow-up',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    value: 'adjustment',
    label: 'Adjust',
    description: 'Correction',
    icon: 'lucide:settings-2',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
];

function openCreateModal() {
  resetForm();
  isModalOpen.value = true;
}

function resetForm() {
  Object.assign(form, {
    productId: '',
    type: 'in',
    quantity: 1,
    reason: '',
    reference: '',
    supplierId: '',
  });
}

async function createMovement() {
  if (!form.productId) {
    toast.warning('Select a product');
    return;
  }

  isSubmitting.value = true;
  try {
    await $fetch('/api/movements', {
      method: 'POST',
      body: form,
    });
    toast.success('Movement recorded');
    isModalOpen.value = false;
    refresh();
  } catch (error) {
    toast.error('Failed to record');
    console.error('Failed to create movement:', error);
  } finally {
    isSubmitting.value = false;
  }
}

function getMovementType(type: string) {
  return movementTypes.find((t) => t.value === type) || movementTypes[0];
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-gray-900">Stock Movements</h1>
        <p class="text-xs text-gray-500">Track inventory changes</p>
      </div>
      <button class="btn-primary" @click="openCreateModal">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
        New
      </button>
    </div>

    <!-- Quick action buttons -->
    <div class="flex gap-2">
      <button
        class="flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
        @click="
          openCreateModal();
          form.type = 'in';
        "
      >
        <Icon name="lucide:arrow-down" class="h-3.5 w-3.5" />
        Stock In
      </button>
      <button
        class="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
        @click="
          openCreateModal();
          form.type = 'out';
        "
      >
        <Icon name="lucide:arrow-up" class="h-3.5 w-3.5" />
        Stock Out
      </button>
      <button
        class="flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
        @click="
          openCreateModal();
          form.type = 'adjustment';
        "
      >
        <Icon name="lucide:settings-2" class="h-3.5 w-3.5" />
        Adjust
      </button>
    </div>

    <!-- Filters -->
    <div class="card p-3">
      <div class="flex flex-wrap items-center gap-3">
        <!-- Search -->
        <div class="relative flex-1 min-w-[200px]">
          <Icon
            name="lucide:search"
            class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search reference, product..."
            class="input pl-8 h-8 text-xs"
          />
        </div>

        <!-- Type filter -->
        <select
          v-model="filters.type"
          class="input h-8 text-xs w-auto min-w-[120px]"
        >
          <option value="">All types</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
          <option value="adjustment">Adjustment</option>
        </select>

        <!-- Product filter -->
        <select
          v-model="filters.productId"
          class="input h-8 text-xs w-auto min-w-[150px]"
        >
          <option value="">All products</option>
          <option
            v-for="product in products"
            :key="product.id"
            :value="product.id"
          >
            {{ product.name }}
          </option>
        </select>

        <!-- Clear filters -->
        <button
          v-if="hasActiveFilters"
          class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          @click="clearFilters"
        >
          <Icon name="lucide:x" class="h-3.5 w-3.5" />
          Clear
        </button>

        <!-- Results count -->
        <span v-if="movements" class="text-xs text-gray-400 ml-auto">
          {{ filteredMovements.length }} of {{ movements.length }} movements
        </span>
      </div>
    </div>

    <!-- Movements Table -->
    <div class="card overflow-hidden">
      <UiDataTable
        :columns="columns"
        :data="filteredMovements"
        :loading="pending"
        empty-title="No movements"
        empty-description="Record stock changes here."
        empty-icon="lucide:arrow-left-right"
      >
        <template #date="{ item }">
          <span class="text-xs text-gray-500 font-mono">{{
            formatDate(item.createdAt)
          }}</span>
        </template>

        <template #product="{ item }">
          <div class="flex items-center gap-2">
            <div
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100"
            >
              <Icon name="lucide:package" class="h-3 w-3 text-gray-500" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-xs font-medium text-gray-900">
                {{ item.product?.name || 'Unknown' }}
              </p>
              <p
                v-if="item.product?.sku"
                class="truncate text-xs text-gray-400 font-mono"
              >
                {{ item.product.sku }}
              </p>
            </div>
          </div>
        </template>

        <template #type="{ item }">
          <div class="flex items-center gap-1.5">
            <div
              class="flex h-5 w-5 items-center justify-center rounded"
              :class="getMovementType(item.type).bgColor"
            >
              <Icon
                :name="getMovementType(item.type).icon"
                class="h-3 w-3"
                :class="getMovementType(item.type).color"
              />
            </div>
            <span class="text-xs font-medium">{{
              getMovementType(item.type).label
            }}</span>
          </div>
        </template>

        <template #quantity="{ item }">
          <span
            class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium font-mono tabular-nums"
            :class="
              item.type === 'in'
                ? 'bg-green-50 text-green-700'
                : item.type === 'out'
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-600'
            "
          >
            {{ item.type === 'in' ? '+' : item.type === 'out' ? '-' : ''
            }}{{ Math.abs(item.quantity) }}
          </span>
        </template>

        <template #stock="{ item }">
          <span class="font-mono text-xs tabular-nums text-gray-600">{{
            item.stockAfter
          }}</span>
        </template>

        <template #reference="{ item }">
          <div class="max-w-[150px]">
            <p
              v-if="item.reference"
              class="truncate text-xs font-medium text-gray-900"
            >
              {{ item.reference }}
            </p>
            <p v-if="item.reason" class="truncate text-xs text-gray-500">
              {{ item.reason }}
            </p>
            <span v-if="!item.reference && !item.reason" class="text-gray-400"
              >—</span
            >
          </div>
        </template>
      </UiDataTable>
    </div>

    <!-- Create Modal -->
    <UiModal v-model:open="isModalOpen" title="New Movement">
      <form
        id="movement-form"
        class="space-y-4"
        @submit.prevent="createMovement"
      >
        <div>
          <label class="label"
            >Product <span class="text-red-500">*</span></label
          >
          <select v-model="form.productId" class="input" required>
            <option value="">Select product</option>
            <option
              v-for="product in products"
              :key="product.id"
              :value="product.id"
            >
              {{ product.name }} ({{ product.stockQuantity }} in stock)
            </option>
          </select>
        </div>

        <div>
          <label class="label">Type <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="type in movementTypes"
              :key="type.value"
              type="button"
              class="flex flex-col items-center gap-1.5 rounded border p-3 transition-all"
              :class="
                form.type === type.value
                  ? `${type.bgColor} ${type.borderColor}`
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              "
              @click="form.type = type.value as 'in' | 'out' | 'adjustment'"
            >
              <div
                class="flex h-7 w-7 items-center justify-center rounded"
                :class="form.type === type.value ? type.bgColor : 'bg-gray-100'"
              >
                <Icon :name="type.icon" class="h-4 w-4" :class="type.color" />
              </div>
              <span class="text-xs font-medium">{{ type.label }}</span>
            </button>
          </div>
        </div>

        <div>
          <label class="label"
            >Quantity <span class="text-red-500">*</span></label
          >
          <input
            v-model.number="form.quantity"
            type="number"
            min="1"
            class="input font-mono"
            required
          />
        </div>

        <div v-if="form.type === 'in'">
          <label class="label">Supplier</label>
          <select v-model="form.supplierId" class="input">
            <option value="">Select (optional)</option>
            <option
              v-for="supplier in suppliers"
              :key="supplier.id"
              :value="supplier.id"
            >
              {{ supplier.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="label">Reference</label>
          <input
            v-model="form.reference"
            class="input"
            placeholder="Order #, Invoice #"
          />
        </div>

        <div>
          <label class="label">Notes</label>
          <textarea
            v-model="form.reason"
            class="input min-h-[60px] resize-none"
            placeholder="Optional notes..."
          />
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          class="btn-secondary"
          @click="isModalOpen = false"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="movement-form"
          class="btn-primary"
          :disabled="isSubmitting"
        >
          <Icon
            v-if="isSubmitting"
            name="lucide:loader-2"
            class="h-3.5 w-3.5 animate-spin"
          />
          Record
        </button>
      </template>
    </UiModal>
  </div>
</template>
