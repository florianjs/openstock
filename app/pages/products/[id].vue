<script setup lang="ts">
import { format } from 'date-fns';
import type {
  Product,
  Category,
  Supplier,
  Tax,
  ProductVariant,
  SupplierPrice,
  SupplierPriceHistory,
  VariantSupplierExclusion,
} from '~~/server/database/schema';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { currencySymbol } = useSettings();

const productId = route.params.id as string;

// Extended type for supplier price with exclusions
type ExtendedSupplierPrice = SupplierPrice & {
  supplier: Supplier;
  priceHistory?: SupplierPriceHistory[];
  variantExclusions?: VariantSupplierExclusion[];
};

// Fetch product data
const {
  data: product,
  pending,
  refresh,
  error,
} = await useFetch<
  Product & {
    category?: Category;
    tax?: Tax;
    supplier?: Supplier;
    variants?: ProductVariant[];
    productSuppliers?: ExtendedSupplierPrice[];
    bestSupplierId?: string | null;
    bestSupplierPrice?: number | null;
  }
>(`/api/products/${productId}`);

// Computed
const suppliersList = computed(() => product.value?.productSuppliers || []);
const variantsList = computed(() => product.value?.variants || []);

// Best supplier
const bestSupplier = computed(() => {
  if (!product.value?.bestSupplierId) return null;
  return suppliersList.value.find(
    (s) => s.supplierId === product.value?.bestSupplierId
  );
});

// State for modals
const isAddSupplierModalOpen = ref(false);
const isEditSupplierModalOpen = ref(false);
const isHistoryModalOpen = ref(false);
const isVariantSupplierModalOpen = ref(false);

const selectedSupplierPrice = ref<ExtendedSupplierPrice | null>(null);

// Form state for supplier
const supplierForm = reactive({
  supplierId: '',
  price: 0,
  minQuantity: 1,
  leadTimeDays: 0,
  supplierSku: '',
  purchaseUrl: '',
  isPreferred: false,
});

// Fetch all suppliers for the dropdown
const { data: allSuppliers } = await useFetch<Supplier[]>('/api/suppliers');

// Variant-supplier availability state
const variantSupplierAvailability = ref<
  Record<string, Record<string, boolean>>
>({});

// Initialize variant-supplier availability from product data
watchEffect(() => {
  if (!product.value) return;

  const availability: Record<string, Record<string, boolean>> = {};

  // Default: all variants available from all suppliers
  for (const variant of variantsList.value) {
    if (!availability[variant.id]) {
      availability[variant.id] = {};
    }
    for (const sp of suppliersList.value) {
      // Check if there's an exclusion
      const isExcluded = sp.variantExclusions?.some(
        (e) => e.variantId === variant.id
      );
      availability[variant.id]![sp.id] = !isExcluded;
    }
  }

  variantSupplierAvailability.value = availability;
});

// Methods
function openAddSupplierModal() {
  resetSupplierForm();
  isAddSupplierModalOpen.value = true;
}

function openEditSupplierModal(sp: ExtendedSupplierPrice) {
  selectedSupplierPrice.value = sp;
  Object.assign(supplierForm, {
    supplierId: sp.supplierId,
    price: sp.price,
    minQuantity: sp.minQuantity || 1,
    leadTimeDays: sp.leadTimeDays || 0,
    supplierSku: sp.supplierSku || '',
    purchaseUrl: sp.purchaseUrl || '',
    isPreferred: sp.isPreferred || false,
  });
  isEditSupplierModalOpen.value = true;
}

function openHistoryModal(sp: ExtendedSupplierPrice) {
  selectedSupplierPrice.value = sp;
  isHistoryModalOpen.value = true;
}

function openVariantSupplierModal() {
  isVariantSupplierModalOpen.value = true;
}

function resetSupplierForm() {
  Object.assign(supplierForm, {
    supplierId: '',
    price: 0,
    minQuantity: 1,
    leadTimeDays: 0,
    supplierSku: '',
    purchaseUrl: '',
    isPreferred: false,
  });
  selectedSupplierPrice.value = null;
}

async function saveSupplier() {
  try {
    const url = selectedSupplierPrice.value
      ? `/api/products/${productId}/suppliers/${selectedSupplierPrice.value.supplierId}`
      : `/api/products/${productId}/suppliers`;

    const method = selectedSupplierPrice.value ? 'PUT' : 'POST';

    await $fetch(url, {
      method,
      body: supplierForm,
    });

    toast.success(
      selectedSupplierPrice.value ? 'Supplier updated' : 'Supplier added',
      'The supplier information has been saved.'
    );

    isAddSupplierModalOpen.value = false;
    isEditSupplierModalOpen.value = false;
    refresh();
  } catch (err: any) {
    console.error(err);
    toast.error(
      'Error',
      err.data?.statusMessage || 'Failed to save supplier information.'
    );
  }
}

async function removeSupplier(supplierId: string) {
  if (!confirm('Are you sure you want to remove this supplier?')) return;

  try {
    await $fetch(`/api/products/${productId}/suppliers/${supplierId}`, {
      method: 'DELETE',
    });
    toast.success(
      'Supplier removed',
      'The supplier has been removed from this product.'
    );
    refresh();
  } catch (err: any) {
    toast.error('Error', 'Failed to remove supplier.');
  }
}

async function toggleVariantSupplier(
  variantId: string,
  supplierPriceId: string,
  currentValue: boolean
) {
  try {
    await $fetch(`/api/products/${productId}/variant-suppliers`, {
      method: 'POST',
      body: {
        variantId,
        supplierPriceId,
        exclude: currentValue, // If currently available, we want to exclude it
      },
    });

    // Update local state
    if (variantSupplierAvailability.value[variantId]) {
      variantSupplierAvailability.value[variantId][supplierPriceId] =
        !currentValue;
    }

    toast.success('Updated', 'Variant supplier availability updated.');
  } catch (err: any) {
    toast.error('Error', 'Failed to update variant supplier availability.');
  }
}

function formatDate(date: string | Date | null) {
  if (!date) return '-';
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

function isBestPrice(sp: ExtendedSupplierPrice) {
  return product.value?.bestSupplierId === sp.supplierId;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UiButton variant="ghost" size="icon" @click="router.back()">
          <Icon name="lucide:arrow-left" class="h-5 w-5" />
        </UiButton>
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
            {{ product?.name }}
          </h1>
          <p class="text-sm text-gray-500 flex items-center gap-2">
            <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{{
              product?.sku || 'No SKU'
            }}</span>
            <span v-if="product?.category" class="text-gray-400">•</span>
            <span v-if="product?.category">{{ product.category.name }}</span>
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <UiButton variant="outline" @click="router.push('/products')">
          Back to Products
        </UiButton>
      </div>
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="error" class="text-center py-12 text-red-600">
      <p>Error loading product: {{ error.message }}</p>
      <UiButton variant="outline" class="mt-4" @click="refresh">Retry</UiButton>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Product Info -->
      <div class="lg:col-span-2 space-y-6">
        <!-- General Info Card -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">
            General Information
          </h2>
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-500"
                >Description</label
              >
              <p class="mt-1 text-sm text-gray-900">
                {{ product?.description || 'No description provided.' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500"
                >Barcode</label
              >
              <p class="mt-1 text-sm text-gray-900 font-mono">
                {{ product?.barcode || '—' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500"
                >Stock</label
              >
              <p class="mt-1 text-sm text-gray-900">
                {{ product?.stockQuantity }} {{ product?.unit }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500">Tax</label>
              <p class="mt-1 text-sm text-gray-900">
                {{ product?.tax?.name || '—' }} ({{
                  (product?.tax?.rate || 0) * 100
                }}%)
              </p>
            </div>
          </div>
        </div>

        <!-- Variants Card -->
        <div
          v-if="variantsList.length"
          class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
        >
          <div
            class="px-6 py-4 border-b border-gray-200 flex justify-between items-center"
          >
            <h2 class="text-lg font-medium text-gray-900">
              Variants
              <span class="text-sm font-normal text-gray-500 ml-2"
                >({{ variantsList.length }})</span
              >
            </h2>
            <UiButton
              v-if="suppliersList.length > 0"
              size="sm"
              variant="outline"
              @click="openVariantSupplierModal"
            >
              <Icon name="lucide:settings-2" class="h-4 w-4 mr-2" />
              Supplier Availability
            </UiButton>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-3 font-medium text-gray-500">Name</th>
                  <th class="px-6 py-3 font-medium text-gray-500">SKU</th>
                  <th class="px-6 py-3 font-medium text-gray-500">Barcode</th>
                  <th class="px-6 py-3 font-medium text-gray-500 text-right">
                    Cost
                  </th>
                  <th class="px-6 py-3 font-medium text-gray-500 text-right">
                    Price
                  </th>
                  <th class="px-6 py-3 font-medium text-gray-500 text-right">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="variant in variantsList"
                  :key="variant.id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-6 py-3 font-medium text-gray-900">
                    {{ variant.name }}
                  </td>
                  <td class="px-6 py-3 font-mono text-gray-500 text-xs">
                    {{ variant.sku || '—' }}
                  </td>
                  <td class="px-6 py-3 font-mono text-gray-500 text-xs">
                    {{ variant.barcode || '—' }}
                  </td>
                  <td class="px-6 py-3 text-right text-gray-500">
                    {{ variant.costPrice?.toFixed(2) }} {{ currencySymbol }}
                  </td>
                  <td class="px-6 py-3 text-right font-medium">
                    {{ variant.price.toFixed(2) }} {{ currencySymbol }}
                  </td>
                  <td class="px-6 py-3 text-right">
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        (variant.stockQuantity || 0) <= (variant.stockMin || 0)
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700',
                      ]"
                    >
                      {{ variant.stockQuantity }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Suppliers Card -->
        <div
          class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
        >
          <div
            class="px-6 py-4 border-b border-gray-200 flex justify-between items-center"
          >
            <h2 class="text-lg font-medium text-gray-900">Suppliers</h2>
            <UiButton size="sm" @click="openAddSupplierModal">
              <Icon name="lucide:plus" class="h-4 w-4 mr-2" />
              Add Supplier
            </UiButton>
          </div>

          <div
            v-if="suppliersList.length === 0"
            class="p-8 text-center text-gray-500"
          >
            No suppliers associated with this product yet.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-3 font-medium text-gray-500">Supplier</th>
                  <th class="px-6 py-3 font-medium text-gray-500">SKU</th>
                  <th class="px-6 py-3 font-medium text-gray-500 text-right">
                    Price
                  </th>
                  <th class="px-6 py-3 font-medium text-gray-500 text-right">
                    Min Qty
                  </th>
                  <th class="px-6 py-3 font-medium text-gray-500">Link</th>
                  <th class="px-6 py-3 font-medium text-gray-500 w-24"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="sp in suppliersList"
                  :key="sp.id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-6 py-3">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-gray-900">{{
                        sp.supplier.name
                      }}</span>
                      <span
                        v-if="isBestPrice(sp)"
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        <Icon name="lucide:trophy" class="h-3 w-3 mr-1" />
                        Best Price
                      </span>
                      <span
                        v-if="sp.isPreferred"
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                      >
                        Preferred
                      </span>
                    </div>
                    <div
                      v-if="sp.leadTimeDays"
                      class="text-xs text-gray-400 mt-0.5"
                    >
                      Lead time: {{ sp.leadTimeDays }} days
                    </div>
                  </td>
                  <td class="px-6 py-3 font-mono text-gray-500 text-xs">
                    {{ sp.supplierSku || '—' }}
                  </td>
                  <td class="px-6 py-3 text-right">
                    <span
                      :class="[
                        'font-medium',
                        isBestPrice(sp) ? 'text-green-600' : 'text-gray-900',
                      ]"
                    >
                      {{ sp.price.toFixed(2) }} {{ currencySymbol }}
                    </span>
                  </td>
                  <td class="px-6 py-3 text-right text-gray-500">
                    {{ sp.minQuantity }}
                  </td>
                  <td class="px-6 py-3">
                    <a
                      v-if="sp.purchaseUrl"
                      :href="sp.purchaseUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 transition-colors"
                    >
                      <Icon name="lucide:external-link" class="h-4 w-4" />
                      <span class="text-xs">Order</span>
                    </a>
                    <span v-else class="text-gray-400 text-xs">—</span>
                  </td>
                  <td class="px-6 py-3">
                    <div class="flex justify-end gap-2">
                      <button
                        class="text-gray-400 hover:text-primary-600 transition-colors"
                        title="Price History"
                        @click="openHistoryModal(sp)"
                      >
                        <Icon name="lucide:history" class="h-4 w-4" />
                      </button>
                      <button
                        class="text-gray-400 hover:text-gray-900 transition-colors"
                        title="Edit"
                        @click="openEditSupplierModal(sp)"
                      >
                        <Icon name="lucide:pencil" class="h-4 w-4" />
                      </button>
                      <button
                        class="text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove"
                        @click="removeSupplier(sp.supplierId)"
                      >
                        <Icon name="lucide:trash-2" class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Price Evolution Chart -->
        <ChartsPriceEvolutionChart
          v-if="suppliersList.length > 0"
          :product-id="productId"
          :currency-symbol="currencySymbol"
        />
      </div>

      <!-- Right Column: Pricing & Stats -->
      <div class="space-y-6">
        <!-- Pricing Card -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Pricing</h2>
          <div class="space-y-4">
            <div
              class="flex justify-between items-center py-2 border-b border-gray-100"
            >
              <span class="text-sm text-gray-500">Cost Price</span>
              <span class="font-medium"
                >{{ product?.costPrice?.toFixed(2) }} {{ currencySymbol }}</span
              >
            </div>
            <div
              class="flex justify-between items-center py-2 border-b border-gray-100"
            >
              <span class="text-sm text-gray-500">Margin</span>
              <span class="font-medium">{{ product?.marginPercent }}%</span>
            </div>
            <div class="flex justify-between items-center py-2">
              <span class="text-sm text-gray-900 font-medium"
                >Selling Price</span
              >
              <span class="text-lg font-bold text-primary-600">
                {{ product?.sellingPrice?.toFixed(2) }} {{ currencySymbol }}
              </span>
            </div>
          </div>
        </div>

        <!-- Best Supplier Card -->
        <div
          v-if="bestSupplier"
          class="bg-green-50 rounded-lg border border-green-200 shadow-sm p-6"
        >
          <div class="flex items-center gap-2 mb-4">
            <Icon name="lucide:trophy" class="h-5 w-5 text-green-600" />
            <h2 class="text-lg font-medium text-green-900">
              Best Supplier Price
            </h2>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-green-700">Supplier</span>
              <span class="font-medium text-green-900">{{
                bestSupplier.supplier.name
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-green-700">Price</span>
              <span class="text-xl font-bold text-green-600">
                {{ bestSupplier.price.toFixed(2) }} {{ currencySymbol }}
              </span>
            </div>
            <div
              v-if="bestSupplier.leadTimeDays"
              class="flex justify-between items-center"
            >
              <span class="text-sm text-green-700">Lead Time</span>
              <span class="font-medium text-green-900"
                >{{ bestSupplier.leadTimeDays }} days</span
              >
            </div>
            <a
              v-if="bestSupplier.purchaseUrl"
              :href="bestSupplier.purchaseUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-4 w-full inline-flex justify-center items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Icon name="lucide:shopping-cart" class="h-4 w-4" />
              Order from Supplier
            </a>
          </div>
        </div>

        <!-- Stock Summary -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Stock Summary</h2>
          <div class="space-y-3">
            <div
              class="flex justify-between items-center py-2 border-b border-gray-100"
            >
              <span class="text-sm text-gray-500">Product Stock</span>
              <span class="font-medium"
                >{{ product?.stockQuantity }} {{ product?.unit }}</span
              >
            </div>
            <div
              v-if="variantsList.length > 0"
              class="flex justify-between items-center py-2 border-b border-gray-100"
            >
              <span class="text-sm text-gray-500">Total Variants Stock</span>
              <span class="font-medium">
                {{
                  variantsList.reduce(
                    (sum, v) => sum + (v.stockQuantity || 0),
                    0
                  )
                }}
              </span>
            </div>
            <div class="flex justify-between items-center py-2">
              <span class="text-sm text-gray-500">Min Stock Alert</span>
              <span class="font-medium">{{ product?.stockMin }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Supplier Modal -->
    <UiModal v-model:open="isAddSupplierModalOpen" title="Add Supplier">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Supplier</label
          >
          <select
            v-model="supplierForm.supplierId"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="" disabled>Select a supplier</option>
            <option v-for="s in allSuppliers" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <UiInput
            v-model="supplierForm.price"
            type="number"
            label="Purchase Price"
            step="0.01"
            :min="0"
          />
          <UiInput
            v-model="supplierForm.minQuantity"
            type="number"
            label="Min Quantity"
            :min="1"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <UiInput
            v-model="supplierForm.supplierSku"
            label="Supplier SKU"
            placeholder="Optional"
          />
          <UiInput
            v-model="supplierForm.leadTimeDays"
            type="number"
            label="Lead Time (Days)"
            :min="0"
          />
        </div>
        <UiInput
          v-model="supplierForm.purchaseUrl"
          label="Purchase URL"
          placeholder="https://supplier.com/product/..."
        />
        <div class="flex items-center gap-2">
          <input
            id="isPreferred"
            v-model="supplierForm.isPreferred"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label for="isPreferred" class="text-sm text-gray-700"
            >Preferred Supplier</label
          >
        </div>
      </div>
      <template #footer>
        <UiButton variant="outline" @click="isAddSupplierModalOpen = false"
          >Cancel</UiButton
        >
        <UiButton @click="saveSupplier">Add Supplier</UiButton>
      </template>
    </UiModal>

    <!-- Edit Supplier Modal -->
    <UiModal v-model:open="isEditSupplierModalOpen" title="Edit Supplier Price">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UiInput
            v-model="supplierForm.price"
            type="number"
            label="Purchase Price"
            step="0.01"
            :min="0"
          />
          <UiInput
            v-model="supplierForm.minQuantity"
            type="number"
            label="Min Quantity"
            :min="1"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <UiInput
            v-model="supplierForm.supplierSku"
            label="Supplier SKU"
            placeholder="Optional"
          />
          <UiInput
            v-model="supplierForm.leadTimeDays"
            type="number"
            label="Lead Time (Days)"
            :min="0"
          />
        </div>
        <UiInput
          v-model="supplierForm.purchaseUrl"
          label="Purchase URL"
          placeholder="https://supplier.com/product/..."
        />
        <div class="flex items-center gap-2">
          <input
            id="isPreferredEdit"
            v-model="supplierForm.isPreferred"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label for="isPreferredEdit" class="text-sm text-gray-700"
            >Preferred Supplier</label
          >
        </div>
      </div>
      <template #footer>
        <UiButton variant="outline" @click="isEditSupplierModalOpen = false"
          >Cancel</UiButton
        >
        <UiButton @click="saveSupplier">Save Changes</UiButton>
      </template>
    </UiModal>

    <!-- History Modal -->
    <UiModal v-model:open="isHistoryModalOpen" title="Price History">
      <div v-if="selectedSupplierPrice" class="space-y-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-medium text-gray-900">
            {{ selectedSupplierPrice.supplier.name }}
          </h3>
          <span class="text-sm text-gray-500"
            >Current: {{ selectedSupplierPrice.price.toFixed(2) }}
            {{ currencySymbol }}</span
          >
        </div>

        <div class="max-h-60 overflow-y-auto border rounded-md">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-4 py-2 font-medium text-gray-500">Date</th>
                <th class="px-4 py-2 font-medium text-gray-500 text-right">
                  Price
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="history in selectedSupplierPrice.priceHistory"
                :key="history.id"
              >
                <td class="px-4 py-2 text-gray-600">
                  {{ formatDate(history.createdAt) }}
                </td>
                <td class="px-4 py-2 text-right font-medium">
                  {{ history.price.toFixed(2) }} {{ currencySymbol }}
                </td>
              </tr>
              <tr v-if="!selectedSupplierPrice.priceHistory?.length">
                <td colspan="2" class="px-4 py-4 text-center text-gray-400">
                  No history available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <UiButton @click="isHistoryModalOpen = false">Close</UiButton>
      </template>
    </UiModal>

    <!-- Variant-Supplier Availability Modal -->
    <UiModal
      v-model:open="isVariantSupplierModalOpen"
      title="Variant Supplier Availability"
      size="lg"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-500">
          By default, all variants are available from all suppliers. Uncheck a
          box to mark a variant as unavailable from that supplier.
        </p>

        <div class="overflow-x-auto border rounded-lg">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-500">
                  Variant
                </th>
                <th
                  v-for="sp in suppliersList"
                  :key="sp.id"
                  class="px-4 py-3 text-center font-medium text-gray-500 min-w-[120px]"
                >
                  {{ sp.supplier.name }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="variant in variantsList"
                :key="variant.id"
                class="hover:bg-gray-50"
              >
                <td class="px-4 py-3 font-medium text-gray-900">
                  {{ variant.name }}
                </td>
                <td
                  v-for="sp in suppliersList"
                  :key="sp.id"
                  class="px-4 py-3 text-center"
                >
                  <input
                    type="checkbox"
                    :checked="
                      variantSupplierAvailability[variant.id]?.[sp.id] ?? true
                    "
                    class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    @change="
                      toggleVariantSupplier(
                        variant.id,
                        sp.id,
                        variantSupplierAvailability[variant.id]?.[sp.id] ?? true
                      )
                    "
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <UiButton @click="isVariantSupplierModalOpen = false">Close</UiButton>
      </template>
    </UiModal>
  </div>
</template>
