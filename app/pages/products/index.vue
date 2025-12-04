<script setup lang="ts">
import type {
  Product,
  Category,
  Supplier,
  Tax,
  ProductVariant as DBProductVariant,
} from '~~/server/database/schema';

const toast = useToast();
const router = useRouter();
const { currencySymbol, currencyIcon } = useSettings();

function navigateToProduct(id: string) {
  router.push(`/products/${id}`);
}

const {
  data: products,
  pending,
  refresh,
} = await useFetch<
  (Product & { variants?: DBProductVariant[]; category?: Category })[]
>('/api/products');

const isModalOpen = ref(false);
const editingProduct = ref<Product | null>(null);
const isSubmitting = ref(false);

const expandedProducts = ref<Set<string>>(new Set());

function toggleProduct(productId: string) {
  if (expandedProducts.value.has(productId)) {
    expandedProducts.value.delete(productId);
  } else {
    expandedProducts.value.add(productId);
  }
  expandedProducts.value = new Set(expandedProducts.value);
}

function isExpanded(productId: string) {
  return expandedProducts.value.has(productId);
}

const hasVariants = ref(false);

interface VariantOption {
  name: string;
  valuesInput: string;
  values: string[];
}

interface ProductVariant {
  id?: string;
  name: string;
  sku: string | null;
  price: number;
  stockQuantity: number | null;
  costPrice: number;
  stockMin: number | null;
}

const form = reactive({
  name: '',
  sku: '',
  barcode: '',
  description: '',
  categoryId: '',
  costPrice: 0,
  marginPercent: 30,
  sellingPrice: 0,
  taxId: '',
  stockQuantity: 0,
  stockMin: 0,
  unit: 'unit',
  supplierId: '',
  options: [] as VariantOption[],
  variants: [] as ProductVariant[],
});

const { data: categories } = await useFetch<Category[]>('/api/categories');
const { data: suppliers } = await useFetch<Supplier[]>('/api/suppliers');
const { data: taxes } = await useFetch<Tax[]>('/api/taxes');

watch([() => form.costPrice, () => form.marginPercent], ([cost, margin]) => {
  if (cost != null && margin != null) {
    form.sellingPrice = Number((cost * (1 + margin / 100)).toFixed(2));
  }
});

function openCreateModal() {
  editingProduct.value = null;
  resetForm();
  isModalOpen.value = true;
}

function openEditModal(product: Product & { variants?: ProductVariant[] }) {
  editingProduct.value = product;

  resetForm();

  Object.assign(form, {
    name: product.name,
    sku: product.sku || '',
    barcode: product.barcode || '',
    description: product.description || '',
    categoryId: product.categoryId || '',
    costPrice: product.costPrice || 0,
    marginPercent: product.marginPercent || 30,
    sellingPrice: product.sellingPrice || 0,
    taxId: product.taxId || '',
    stockQuantity: product.stockQuantity || 0,
    stockMin: product.stockMin || 0,
    unit: product.unit || 'unit',
    supplierId: product.supplierId || '',
  });

  if (
    product.options &&
    Array.isArray(product.options) &&
    product.options.length > 0
  ) {
    hasVariants.value = true;
    form.options = product.options.map((opt: any) => ({
      name: opt.name,
      values: opt.values,
      valuesInput: opt.values.join(', '),
    }));

    if (product.variants && product.variants.length > 0) {
      form.variants = product.variants.map((v: any) => ({
        id: v.id,
        name: v.name,
        sku: v.sku || '',
        price: v.price || 0,
        costPrice: v.costPrice || 0,
        stockQuantity: v.stockQuantity || 0,
        stockMin: v.stockMin || 0,
      }));
    }
  } else {
    hasVariants.value = false;
  }

  isModalOpen.value = true;
}

function resetForm() {
  hasVariants.value = false;
  Object.assign(form, {
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    costPrice: 0,
    marginPercent: 30,
    sellingPrice: 0,
    taxId: '',
    stockQuantity: 0,
    stockMin: 0,
    unit: 'unit',
    supplierId: '',
    options: [],
    variants: [],
  });
}

function addOption() {
  form.options.push({ name: '', valuesInput: '', values: [] });
}

function removeOption(index: number) {
  form.options.splice(index, 1);
}

function updateOptionValues(index: number) {
  const opt = form.options[index];
  if (opt && opt.valuesInput) {
    opt.values = opt.valuesInput
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v);
  } else if (opt) {
    opt.values = [];
  }
}

function removeVariant(index: number) {
  form.variants.splice(index, 1);
}

function generateVariants() {
  if (form.options.length === 0) return;

  const groupedOptions = new Map<string, Set<string>>();

  form.options.forEach((opt) => {
    const name = opt.name.trim();
    if (!name) return;

    if (!groupedOptions.has(name)) {
      groupedOptions.set(name, new Set());
    }

    opt.values.forEach((v) => groupedOptions.get(name)!.add(v));
  });

  const newOptions: VariantOption[] = [];
  groupedOptions.forEach((valuesSet, name) => {
    const values = Array.from(valuesSet);
    newOptions.push({
      name,
      values,
      valuesInput: values.join(', '),
    });
  });

  if (newOptions.length > 0) {
    form.options = newOptions;
  }

  const optionValues = form.options.map((opt) => opt.values);
  if (optionValues.some((vals) => vals.length === 0)) {
    toast.error('Incomplete Options', 'Please add values for all options.');
    return;
  }

  const cartesian = (...a: any[]) =>
    a.reduce((a, b) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())));

  let combinations: string[][] = [];
  if (optionValues.length === 1 && optionValues[0]) {
    combinations = optionValues[0].map((v) => [v]);
  } else {
    combinations = cartesian(...optionValues);
  }

  form.variants = combinations.map((combo) => {
    const name = combo.join(' / ');
    const existing = form.variants.find((v) => v.name === name);
    if (existing) return existing;

    return {
      name,
      sku: `${form.sku}-${combo.join('-').toUpperCase()}`,
      price: form.sellingPrice,
      costPrice: form.costPrice,
      stockQuantity: 0,
      stockMin: 0,
    };
  });
}

async function saveProduct() {
  if (!form.name.trim()) {
    toast.error('Validation error', 'Product name is required');
    return;
  }

  isSubmitting.value = true;
  try {
    const payload: any = { ...form };

    if (hasVariants.value) {
      payload.options = form.options.map((o) => ({
        name: o.name,
        values: o.values,
      }));
      // Ensure variants are included
      payload.variants = form.variants;
    } else {
      payload.options = null;
      payload.variants = [];
    }

    const method = editingProduct.value ? 'PUT' : 'POST';
    const url = editingProduct.value
      ? `/api/products/${editingProduct.value.id}`
      : '/api/products';

    await $fetch(url, { method, body: payload });

    toast.success(
      editingProduct.value ? 'Product updated' : 'Product created',
      `"${form.name}" has been saved.`
    );

    isModalOpen.value = false;
    refresh();
  } catch (error) {
    console.error(error);
    toast.error('Error', 'Failed to save product.');
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteProduct(product: Product) {
  if (!confirm(`Delete "${product.name}"?`)) return;
  try {
    await $fetch(`/api/products/${product.id}`, { method: 'DELETE' });
    toast.success('Deleted', `"${product.name}" removed.`);
    refresh();
  } catch (error) {
    toast.error('Error', 'Failed to delete product.');
  }
}

function getStockStatus(product: Product & { variants?: ProductVariant[] }) {
  const stock = getTotalStock(product);
  const stockMin = getMinStock(product);

  if (stock <= 0) {
    return {
      class: 'text-red-600 bg-red-50 border-red-100',
      label: 'Out of stock',
    };
  }
  if (stockMin && stock <= stockMin) {
    return {
      class: 'text-amber-600 bg-amber-50 border-amber-100',
      label: 'Low stock',
    };
  }
  return {
    class: 'text-green-600 bg-green-50 border-green-100',
    label: 'In stock',
  };
}

function getTotalStock(product: Product & { variants?: ProductVariant[] }) {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
  }
  return product.stockQuantity || 0;
}

function getMinStock(product: Product & { variants?: ProductVariant[] }) {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((acc, v) => acc + (v.stockMin || 0), 0);
  }
  return product.stockMin || 0;
}

function hasProductVariants(
  product: Product & { variants?: ProductVariant[] }
) {
  return product.variants && product.variants.length > 0;
}

function getVariantStockStatus(variant: ProductVariant) {
  const stock = variant.stockQuantity || 0;
  if (stock <= 0) {
    return {
      class: 'text-red-600 bg-red-50 border-red-100',
      label: 'Out of stock',
    };
  }
  if (variant.stockMin && stock <= variant.stockMin) {
    return {
      class: 'text-amber-600 bg-amber-50 border-amber-100',
      label: 'Low stock',
    };
  }
  return {
    class: 'text-green-600 bg-green-50 border-green-100',
    label: 'In stock',
  };
}

const isVariantModalOpen = ref(false);
const editingVariant = ref<ProductVariant | null>(null);
const editingVariantParent = ref<
  (Product & { variants?: ProductVariant[] }) | null
>(null);
const isVariantSubmitting = ref(false);

const variantForm = reactive({
  id: '',
  name: '',
  sku: '',
  barcode: '',
  costPrice: 0,
  marginPercent: 30,
  price: 0,
  taxId: '',
  stockQuantity: 0,
  stockMin: 0,
  supplierId: '',
});

// Calculate selling price for variant
watch(
  [() => variantForm.costPrice, () => variantForm.marginPercent],
  ([cost, margin]) => {
    if (cost != null && margin != null) {
      variantForm.price = Number((cost * (1 + margin / 100)).toFixed(2));
    }
  }
);

function openVariantModal(
  variant: ProductVariant,
  parentProduct: Product & { variants?: ProductVariant[] }
) {
  editingVariant.value = variant;
  editingVariantParent.value = parentProduct;

  Object.assign(variantForm, {
    id: variant.id || '',
    name: variant.name || '',
    sku: variant.sku || '',
    barcode: (variant as any).barcode || '',
    costPrice: variant.costPrice || 0,
    marginPercent: (variant as any).marginPercent || 30,
    price: variant.price || 0,
    taxId: (variant as any).taxId || '',
    stockQuantity: variant.stockQuantity || 0,
    stockMin: variant.stockMin || 0,
    supplierId: (variant as any).supplierId || '',
  });

  isVariantModalOpen.value = true;
}

async function saveVariant() {
  if (!editingVariant.value || !editingVariantParent.value) return;

  isVariantSubmitting.value = true;
  try {
    await $fetch(
      `/api/products/${editingVariantParent.value.id}/variants/${variantForm.id}`,
      {
        method: 'PUT',
        body: variantForm,
      }
    );

    toast.success('Variant updated', `"${variantForm.name}" has been saved.`);
    isVariantModalOpen.value = false;
    refresh();
  } catch (error) {
    console.error(error);
    toast.error('Error', 'Failed to save variant.');
  } finally {
    isVariantSubmitting.value = false;
  }
}

function getSupplierName(supplierId: string | null | undefined) {
  if (!supplierId || !suppliers.value) return null;
  const supplier = suppliers.value.find((s) => s.id === supplierId);
  return supplier?.name || null;
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Products
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          Manage your inventory catalog and pricing strategies.
        </p>
      </div>
      <UiButton @click="openCreateModal">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Product
      </UiButton>
    </div>

    <!-- Custom Accordion Table -->
    <div
      class="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ring-1 ring-gray-900/5"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 w-8"
              ></th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Product
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                SKU
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Category
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right"
              >
                Stock
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right"
              >
                Cost
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right"
              >
                Price
              </th>
              <th
                class="h-9 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 w-20"
              ></th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100 bg-white">
            <!-- Loading State -->
            <tr v-if="pending">
              <td colspan="8" class="h-32 text-center">
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

            <!-- Empty State -->
            <tr v-else-if="!products?.length">
              <td colspan="8" class="p-0">
                <div
                  class="flex flex-col items-center justify-center py-12 text-center bg-gray-50/30"
                >
                  <div class="rounded-full bg-gray-100 p-3 mb-3">
                    <Icon
                      name="lucide:package-open"
                      class="h-5 w-5 text-gray-400"
                    />
                  </div>
                  <h3 class="text-sm font-medium text-gray-900">
                    Inventory empty
                  </h3>
                  <p class="mt-1 text-xs text-gray-500">
                    Get started by adding your first product.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Product Rows -->
            <template v-else v-for="(item, index) in products" :key="item.id">
              <!-- Main Product Row -->
              <tr
                class="group transition-colors duration-150 ease-in-out hover:bg-gray-50"
                :class="{ 'bg-gray-50/50': isExpanded(item.id) }"
              >
                <!-- Expand Button -->
                <td class="h-10 px-4 py-2">
                  <button
                    v-if="hasProductVariants(item)"
                    type="button"
                    class="p-1 rounded hover:bg-gray-200 transition-colors"
                    @click="toggleProduct(item.id)"
                  >
                    <Icon
                      name="lucide:chevron-right"
                      class="h-4 w-4 text-gray-500 transition-transform duration-200"
                      :class="{ 'rotate-90': isExpanded(item.id) }"
                    />
                  </button>
                </td>

                <!-- Product Name -->
                <td class="h-10 px-4 py-2">
                  <NuxtLink
                    :to="`/products/${item.id}`"
                    class="flex items-center gap-3 text-left w-full group-hover:text-primary-600 transition-colors"
                  >
                    <div
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50"
                    >
                      <Icon
                        name="lucide:box"
                        class="h-4.5 w-4.5 text-gray-400"
                      />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="truncate text-sm font-medium text-gray-900">
                          {{ item.name }}
                        </p>
                        <span
                          v-if="hasProductVariants(item)"
                          class="inline-flex items-center rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 border border-primary-100"
                        >
                          {{ item.variants?.length }} variants
                        </span>
                      </div>
                      <p
                        v-if="item.barcode"
                        class="truncate text-xs text-gray-500 font-mono tracking-tight"
                      >
                        {{ item.barcode }}
                      </p>
                    </div>
                  </NuxtLink>
                </td>

                <!-- SKU -->
                <td class="h-10 px-4 py-2">
                  <span
                    class="font-mono text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"
                    >{{ item.sku || '—' }}</span
                  >
                </td>

                <!-- Category -->
                <td class="h-10 px-4 py-2">
                  <div
                    v-if="item.category"
                    class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      :style="{
                        backgroundColor: item.category.color || '#9CA3AF',
                      }"
                    />
                    {{ item.category.name }}
                  </div>
                  <span v-else class="text-gray-400 text-xs">—</span>
                </td>

                <!-- Stock -->
                <td class="h-10 px-4 py-2 text-right">
                  <div class="flex flex-col items-end">
                    <span class="font-mono text-sm font-medium text-gray-900">
                      {{ getTotalStock(item) }}
                      <span class="text-gray-400 text-xs">{{ item.unit }}</span>
                    </span>
                    <span
                      :class="[
                        'text-[10px] px-1.5 py-0.5 rounded border mt-0.5',
                        getStockStatus(item).class,
                      ]"
                    >
                      {{ getStockStatus(item).label }}
                    </span>
                  </div>
                </td>

                <!-- Cost Price -->
                <td class="h-10 px-4 py-2 text-right">
                  <span class="font-mono text-xs text-gray-500"
                    >{{ item.costPrice?.toFixed(2) }} {{ currencySymbol }}</span
                  >
                </td>

                <!-- Selling Price -->
                <td class="h-10 px-4 py-2 text-right">
                  <span class="font-mono text-sm font-semibold text-gray-900"
                    >{{ item.sellingPrice?.toFixed(2) }}
                    {{ currencySymbol }}</span
                  >
                </td>

                <!-- Actions -->
                <td class="h-10 px-4 py-2">
                  <div class="flex justify-end gap-1">
                    <button
                      class="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                      @click="openEditModal(item)"
                    >
                      <Icon name="lucide:pencil" class="h-4 w-4" />
                    </button>
                    <button
                      class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      @click="deleteProduct(item)"
                    >
                      <Icon name="lucide:trash-2" class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Expanded Variants Section -->
              <tr v-if="hasProductVariants(item) && isExpanded(item.id)">
                <td colspan="8" class="p-0">
                  <div class="bg-gray-50/80 border-t border-gray-100">
                    <table class="w-full">
                      <tbody class="divide-y divide-gray-100">
                        <tr
                          v-for="variant in item.variants"
                          :key="variant.id"
                          class="hover:bg-white/80 transition-colors cursor-pointer"
                          @click="openVariantModal(variant, item)"
                        >
                          <!-- Empty cell for alignment -->
                          <td class="h-9 px-4 py-2 w-8"></td>

                          <!-- Variant Name -->
                          <td class="h-9 px-4 py-2">
                            <div class="flex items-center gap-3 pl-6">
                              <div
                                class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 bg-white"
                              >
                                <Icon
                                  name="lucide:git-branch"
                                  class="h-3.5 w-3.5 text-gray-400"
                                />
                              </div>
                              <div class="min-w-0">
                                <span class="text-sm text-gray-700">{{
                                  variant.name
                                }}</span>
                                <div
                                  v-if="getSupplierName((variant as any).supplierId)"
                                  class="text-[10px] text-gray-400 truncate"
                                >
                                  <Icon
                                    name="lucide:truck"
                                    class="h-2.5 w-2.5 inline mr-0.5"
                                  />
                                  {{
                                    getSupplierName((variant as any).supplierId)
                                  }}
                                </div>
                              </div>
                            </div>
                          </td>

                          <!-- Variant SKU -->
                          <td class="h-9 px-4 py-2">
                            <span
                              class="font-mono text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-100"
                              >{{ variant.sku || '—' }}</span
                            >
                          </td>

                          <!-- Barcode for variant -->
                          <td class="h-9 px-4 py-2">
                            <span
                              v-if="(variant as any).barcode"
                              class="font-mono text-xs text-gray-400"
                            >
                              {{ (variant as any).barcode }}
                            </span>
                          </td>

                          <!-- Variant Stock -->
                          <td class="h-9 px-4 py-2 text-right">
                            <div class="flex flex-col items-end">
                              <span class="font-mono text-sm text-gray-700">
                                {{ variant.stockQuantity || 0 }}
                                <span class="text-gray-400 text-xs">{{
                                  item.unit
                                }}</span>
                              </span>
                              <span
                                :class="[
                                  'text-[10px] px-1.5 py-0.5 rounded border mt-0.5',
                                  getVariantStockStatus(variant).class,
                                ]"
                              >
                                {{ getVariantStockStatus(variant).label }}
                              </span>
                            </div>
                          </td>

                          <!-- Variant Cost -->
                          <td class="h-9 px-4 py-2 text-right">
                            <span class="font-mono text-xs text-gray-500"
                              >{{ variant.costPrice?.toFixed(2) }}
                              {{ currencySymbol }}</span
                            >
                          </td>

                          <!-- Variant Price -->
                          <td class="h-9 px-4 py-2 text-right">
                            <span class="font-mono text-sm text-gray-700"
                              >{{ variant.price?.toFixed(2) }}
                              {{ currencySymbol }}</span
                            >
                          </td>

                          <!-- Edit action -->
                          <td class="h-9 px-4 py-2 w-20">
                            <div class="flex justify-end">
                              <button
                                class="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                @click.stop="openVariantModal(variant, item)"
                              >
                                <Icon
                                  name="lucide:pencil"
                                  class="h-3.5 w-3.5"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Variant Edit Modal -->
    <UiModal
      v-model:open="isVariantModalOpen"
      title="Edit Variant"
      :description="`Configure pricing, stock, and supplier for ${variantForm.name}`"
      size="lg"
    >
      <form id="variant-form" class="space-y-6" @submit.prevent="saveVariant">
        <!-- Identification -->
        <div>
          <h3
            class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2"
          >
            Identification
          </h3>
          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-12">
              <UiInput
                v-model="variantForm.name"
                label="Variant Name"
                placeholder="Ex: Red / XL"
                disabled
              />
            </div>

            <div class="col-span-6">
              <UiInput
                v-model="variantForm.sku"
                label="SKU / Ref"
                placeholder="PRO-001-RED"
              />
            </div>

            <div class="col-span-6">
              <UiInput
                v-model="variantForm.barcode"
                label="Barcode (EAN)"
                placeholder="Scan..."
                icon="lucide:scan-barcode"
              />
            </div>
          </div>
        </div>

        <!-- Financials -->
        <div>
          <h3
            class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2"
          >
            Financials
          </h3>
          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-4">
              <UiInput
                v-model.number="variantForm.costPrice"
                type="number"
                label="Cost Price"
                placeholder="0.00"
                :icon="currencyIcon"
              />
            </div>

            <div class="col-span-4">
              <UiInput
                v-model.number="variantForm.marginPercent"
                type="number"
                label="Margin (%)"
              />
            </div>

            <div class="col-span-4">
              <UiInput
                v-model.number="variantForm.price"
                type="number"
                label="Selling Price"
                :icon="currencyIcon"
                class="font-bold"
              />
            </div>

            <div class="col-span-6">
              <label class="block text-sm font-medium text-gray-700 mb-1.5"
                >Tax Rate</label
              >
              <select
                v-model="variantForm.taxId"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm h-9"
              >
                <option value="">No Tax (0%)</option>
                <option v-for="tax in taxes" :key="tax.id" :value="tax.id">
                  {{ tax.name }} ({{ tax.rate * 100 }}%)
                </option>
              </select>
            </div>

            <div class="col-span-6">
              <label class="block text-sm font-medium text-gray-700 mb-1.5"
                >Supplier</label
              >
              <select
                v-model="variantForm.supplierId"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm h-9"
              >
                <option value="">Select supplier...</option>
                <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">
                  {{ sup.name }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Inventory Control -->
        <div>
          <h3
            class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2"
          >
            Inventory Control
          </h3>
          <div
            class="grid grid-cols-12 gap-4 bg-gray-50/50 p-4 rounded-lg border border-gray-200/50"
          >
            <div class="col-span-6">
              <UiInput
                v-model.number="variantForm.stockQuantity"
                type="number"
                label="Current Stock"
                placeholder="0"
              />
            </div>

            <div class="col-span-6">
              <UiInput
                v-model.number="variantForm.stockMin"
                type="number"
                label="Low Stock Alert"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="isVariantModalOpen = false">
          Cancel
        </UiButton>

        <UiButton
          type="submit"
          form="variant-form"
          :loading="isVariantSubmitting"
        >
          <Icon
            v-if="!isVariantSubmitting"
            name="lucide:save"
            class="mr-2 h-4 w-4"
          />
          Save Variant
        </UiButton>
      </template>
    </UiModal>

    <UiModal
      v-model:open="isModalOpen"
      :title="editingProduct ? 'Edit Product' : 'New Product'"
      description="Fill in the details below to track this item in your inventory."
      size="lg"
    >
      <form id="product-form" class="space-y-6" @submit.prevent="saveProduct">
        <div>
          <h3
            class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2"
          >
            Identification
          </h3>
          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-12">
              <UiInput
                v-model="form.name"
                label="Product Name"
                placeholder="Ex: Wireless Mouse M100"
                required
              />
            </div>

            <div class="col-span-6 sm:col-span-4">
              <UiInput
                v-model="form.sku"
                label="SKU / Ref"
                placeholder="PRO-001"
              />
            </div>

            <div class="col-span-6 sm:col-span-4">
              <UiInput
                v-model="form.barcode"
                label="Barcode (EAN)"
                placeholder="Scan..."
                icon="lucide:scan-barcode"
              />
            </div>

            <div class="col-span-12 sm:col-span-4">
              <label class="block text-sm font-medium text-gray-700 mb-1.5"
                >Category</label
              >
              <div class="relative">
                <select
                  v-model="form.categoryId"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm h-9"
                >
                  <option value="">Uncategorized</option>
                  <option
                    v-for="cat in categories"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div
            class="flex items-center justify-between mb-3 border-b border-gray-100 pb-2"
          >
            <h3
              class="text-xs font-bold text-gray-900 uppercase tracking-wider"
            >
              Product Variants
            </h3>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">Has Variants?</span>
              <button
                type="button"
                class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                :class="hasVariants ? 'bg-gray-900' : 'bg-gray-200'"
                @click="hasVariants = !hasVariants"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="hasVariants ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>

          <div v-if="hasVariants" class="space-y-6">
            <!-- Options Builder -->
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div class="flex justify-between items-center mb-3">
                <h4 class="text-sm font-medium text-gray-900">Options</h4>
                <button
                  type="button"
                  class="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  @click="addOption"
                >
                  + Add Option
                </button>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(option, idx) in form.options"
                  :key="idx"
                  class="flex gap-3 items-start"
                >
                  <div class="w-1/3">
                    <input
                      v-model="option.name"
                      type="text"
                      placeholder="Name (e.g. Color)"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm h-8"
                    />
                  </div>
                  <div class="flex-1">
                    <input
                      v-model="option.valuesInput"
                      type="text"
                      placeholder="Values (comma separated, e.g. Red, Blue)"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm h-8"
                      @blur="updateOptionValues(idx)"
                    />
                  </div>
                  <button
                    type="button"
                    class="text-gray-400 hover:text-red-500 p-1"
                    @click="removeOption(idx)"
                  >
                    <Icon name="lucide:x" class="h-4 w-4" />
                  </button>
                </div>
                <div
                  v-if="form.options.length === 0"
                  class="text-center py-2 text-sm text-gray-500 italic"
                >
                  No options added. Click "Add Option" to start.
                </div>
              </div>

              <div class="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  class="text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 shadow-sm"
                  @click="generateVariants"
                >
                  Generate Variants
                </button>
              </div>
            </div>

            <!-- Variants List -->
            <div
              v-if="form.variants.length > 0"
              class="border border-gray-200 rounded-lg overflow-hidden"
            >
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Variant
                    </th>
                    <th
                      scope="col"
                      class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                    >
                      Price
                    </th>
                    <th
                      scope="col"
                      class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                    >
                      Stock
                    </th>
                    <th
                      scope="col"
                      class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                    >
                      SKU
                    </th>
                    <th scope="col" class="relative px-3 py-2">
                      <span class="sr-only">Delete</span>
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="(variant, idx) in form.variants" :key="idx">
                    <td class="px-3 py-2 text-sm font-medium text-gray-900">
                      <input
                        v-model="variant.name"
                        type="text"
                        class="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                      />
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-500">
                      <input
                        v-model.number="variant.price"
                        type="number"
                        class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-xs py-1"
                      />
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-500">
                      <input
                        v-model.number="variant.stockQuantity"
                        type="number"
                        class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-xs py-1"
                      />
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-500">
                      <input
                        v-model="variant.sku"
                        type="text"
                        class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-xs py-1"
                      />
                    </td>
                    <td class="px-3 py-2 text-right text-sm font-medium">
                      <button
                        type="button"
                        class="text-gray-400 hover:text-red-600"
                        @click="removeVariant(idx)"
                      >
                        <Icon name="lucide:trash-2" class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="!hasVariants">
          <h3
            class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2"
          >
            Financials
          </h3>
          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-4">
              <UiInput
                v-model.number="form.costPrice"
                type="number"
                label="Cost Price"
                placeholder="0.00"
                :icon="currencyIcon"
              />
            </div>

            <div class="col-span-4">
              <UiInput
                v-model.number="form.marginPercent"
                type="number"
                label="Margin (%)"
              />
            </div>

            <div class="col-span-4">
              <UiInput
                v-model.number="form.sellingPrice"
                type="number"
                label="Selling Price"
                :icon="currencyIcon"
                class="font-bold"
              />
            </div>

            <div class="col-span-6">
              <label class="block text-sm font-medium text-gray-700 mb-1.5"
                >Tax Rate</label
              >
              <select
                v-model="form.taxId"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm h-9"
              >
                <option value="">No Tax (0%)</option>
                <option v-for="tax in taxes" :key="tax.id" :value="tax.id">
                  {{ tax.name }} ({{ tax.rate * 100 }}%)
                </option>
              </select>
            </div>

            <div class="col-span-6">
              <label class="block text-sm font-medium text-gray-700 mb-1.5"
                >Supplier</label
              >
              <select
                v-model="form.supplierId"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm h-9"
              >
                <option value="">Select supplier...</option>
                <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">
                  {{ sup.name }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="!hasVariants">
          <h3
            class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2"
          >
            Inventory Control
          </h3>
          <div
            class="grid grid-cols-12 gap-4 bg-gray-50/50 p-4 rounded-lg border border-gray-200/50"
          >
            <div class="col-span-4">
              <UiInput
                v-model.number="form.stockQuantity"
                type="number"
                label="Current Stock"
                placeholder="0"
              />
            </div>

            <div class="col-span-4">
              <UiInput
                v-model.number="form.stockMin"
                type="number"
                label="Low Stock Alert"
                placeholder="0"
              />
            </div>

            <div class="col-span-4">
              <label class="block text-sm font-medium text-gray-700 mb-1.5"
                >Unit Type</label
              >
              <select
                v-model="form.unit"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm h-9"
              >
                <option value="unit">Pieces (pcs)</option>
                <option value="kg">Weight (kg)</option>
                <option value="m">Length (m)</option>
                <option value="l">Volume (L)</option>
              </select>
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="isModalOpen = false">
          Cancel
        </UiButton>

        <UiButton type="submit" form="product-form" :loading="isSubmitting">
          <Icon v-if="!isSubmitting" name="lucide:save" class="mr-2 h-4 w-4" />
          {{ editingProduct ? 'Save Changes' : 'Create Product' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
