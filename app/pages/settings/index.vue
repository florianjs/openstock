<script setup lang="ts">
const loading = ref(false);
const seedLoading = ref(false);
const clearLoading = ref(false);
const { settings: fetchedSettings, updateSettings } = useSettings();

const isDev = import.meta.dev;

const settings = ref<{
  businessName: string;
  currency: 'EUR' | 'USD' | 'GBP';
  defaultMargin: number;
  stockAlerts: {
    lowStock: boolean;
    outOfStock: boolean;
    emailDaily: boolean;
  };
} | null>(null);

watch(
  fetchedSettings,
  (newVal) => {
    if (newVal) {
      settings.value = JSON.parse(JSON.stringify(newVal));
    }
  },
  { immediate: true }
);

const toast = useToast();

async function seedDatabase() {
  if (!isDev) return;

  seedLoading.value = true;
  try {
    const result = await $fetch('/api/__seed', { method: 'POST' });
    toast.success(
      'Database seeded',
      `Created ${result.counts.products} products, ${result.counts.categories} categories, ${result.counts.suppliers} suppliers`
    );
  } catch (error: any) {
    toast.error('Seed failed', error.message || 'Failed to seed database');
  } finally {
    seedLoading.value = false;
  }
}

async function clearDatabase() {
  if (!isDev) return;

  clearLoading.value = true;
  try {
    await $fetch('/api/__clear', { method: 'POST' });
    toast.success(
      'Database cleared',
      'All data has been removed (settings preserved).'
    );
  } catch (error: any) {
    toast.error('Clear failed', error.message || 'Failed to clear database');
  } finally {
    clearLoading.value = false;
  }
}

async function saveSettings() {
  if (!settings.value) return;

  loading.value = true;
  const success = await updateSettings(settings.value);
  loading.value = false;

  if (success) {
    toast.success('Configuration saved', 'Your settings have been updated.');
  } else {
    toast.error('Error', 'Failed to save settings.');
  }
}

const ui = {
  card: 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden',
  cardHeader:
    'px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between',
  cardTitle: 'text-xs font-bold text-gray-700 uppercase tracking-wider',
  cardBody: 'p-5',
  label:
    'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5',
  input:
    'block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm h-9 placeholder:text-gray-300 transition-shadow',
  inputSelect:
    'block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm h-9 bg-white',
  switchBase:
    'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2',
  switchActive: 'bg-gray-900',
  switchInactive: 'bg-gray-200',
  switchKnob:
    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
  switchKnobActive: 'translate-x-4',
  switchKnobInactive: 'translate-x-0',
};
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Settings
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          Manage your workspace preferences and defaults.
        </p>
      </div>
      <button
        @click="saveSettings"
        :disabled="loading"
        class="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Icon
          v-if="loading"
          name="lucide:loader-2"
          class="h-4 w-4 animate-spin"
        />
        <Icon v-else name="lucide:save" class="h-4 w-4" />
        Save Changes
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-12">
      <div v-if="settings" class="lg:col-span-8 space-y-6">
        <div :class="ui.card">
          <div :class="ui.cardHeader">
            <h2 :class="ui.cardTitle">General Configuration</h2>
            <Icon name="lucide:settings-2" class="h-4 w-4 text-gray-400" />
          </div>
          <div :class="ui.cardBody">
            <div class="grid gap-5 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label :class="ui.label">Workspace Name</label>
                <input
                  v-model="settings.businessName"
                  type="text"
                  :class="ui.input"
                  placeholder="Ex: My Awesome Shop"
                />
              </div>

              <div>
                <label :class="ui.label">Currency</label>
                <select v-model="settings.currency" :class="ui.inputSelect">
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>

              <div>
                <label :class="ui.label">Default Margin</label>
                <div class="relative rounded-md shadow-sm">
                  <input
                    v-model="settings.defaultMargin"
                    type="number"
                    :class="[ui.input, 'pr-8 font-mono']"
                  />
                  <div
                    class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    <span class="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <NuxtLink
            to="/taxes"
            class="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 transition-colors"
              >
                <Icon
                  name="lucide:percent"
                  class="h-4 w-4 text-gray-500 group-hover:text-gray-900"
                />
              </div>
              <Icon
                name="lucide:arrow-right"
                class="h-4 w-4 text-gray-300 group-hover:text-gray-600 -rotate-45 group-hover:rotate-0 transition-transform duration-300"
              />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Tax Rules</h3>
              <p class="text-xs text-gray-500 mt-1">
                Manage VAT & regional taxes.
              </p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/categories"
            class="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 transition-colors"
              >
                <Icon
                  name="lucide:folder-tree"
                  class="h-4 w-4 text-gray-500 group-hover:text-gray-900"
                />
              </div>
              <Icon
                name="lucide:arrow-right"
                class="h-4 w-4 text-gray-300 group-hover:text-gray-600 -rotate-45 group-hover:rotate-0 transition-transform duration-300"
              />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Categories</h3>
              <p class="text-xs text-gray-500 mt-1">Organize your inventory.</p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/suppliers"
            class="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-gray-200 transition-colors"
              >
                <Icon
                  name="lucide:truck"
                  class="h-4 w-4 text-gray-500 group-hover:text-gray-900"
                />
              </div>
              <Icon
                name="lucide:arrow-right"
                class="h-4 w-4 text-gray-300 group-hover:text-gray-600 -rotate-45 group-hover:rotate-0 transition-transform duration-300"
              />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Suppliers</h3>
              <p class="text-xs text-gray-500 mt-1">Manage vendor directory.</p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <div class="lg:col-span-4 space-y-6">
        <div v-if="settings" :class="ui.card">
          <div :class="ui.cardHeader">
            <h2 :class="ui.cardTitle">Notifications</h2>
            <Icon name="lucide:bell" class="h-4 w-4 text-gray-400" />
          </div>

          <div class="divide-y divide-gray-100">
            <div class="flex items-center justify-between p-4">
              <div class="flex-1 pr-4">
                <p class="text-sm font-medium text-gray-900">Low Stock Alert</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Notify when items reach min level.
                </p>
              </div>
              <button
                type="button"
                class="group"
                @click="
                  settings.stockAlerts.lowStock = !settings.stockAlerts.lowStock
                "
              >
                <span
                  :class="[
                    settings.stockAlerts.lowStock
                      ? ui.switchActive
                      : ui.switchInactive,
                    ui.switchBase,
                  ]"
                >
                  <span
                    :class="[
                      settings.stockAlerts.lowStock
                        ? ui.switchKnobActive
                        : ui.switchKnobInactive,
                      ui.switchKnob,
                    ]"
                  />
                </span>
              </button>
            </div>

            <div class="flex items-center justify-between p-4">
              <div class="flex-1 pr-4">
                <p class="text-sm font-medium text-gray-900">Out of Stock</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Critical alert when stock is 0.
                </p>
              </div>
              <button
                type="button"
                class="group"
                @click="
                  settings.stockAlerts.outOfStock =
                    !settings.stockAlerts.outOfStock
                "
              >
                <span
                  :class="[
                    settings.stockAlerts.outOfStock
                      ? ui.switchActive
                      : ui.switchInactive,
                    ui.switchBase,
                  ]"
                >
                  <span
                    :class="[
                      settings.stockAlerts.outOfStock
                        ? ui.switchKnobActive
                        : ui.switchKnobInactive,
                      ui.switchKnob,
                    ]"
                  />
                </span>
              </button>
            </div>
          </div>

          <div class="bg-gray-50 px-4 py-3 border-t border-gray-100">
            <p class="text-xs text-gray-500 text-center">
              Alerts are sent to
              <span class="font-medium text-gray-900">admin@openstock.io</span>
            </p>
          </div>
        </div>

        <div
          v-if="isDev"
          :class="ui.card"
          class="border-amber-200 bg-amber-50/30"
        >
          <div :class="ui.cardHeader" class="bg-amber-50 border-amber-100">
            <h2 :class="ui.cardTitle" class="text-amber-700">
              Developer Tools
            </h2>
            <Icon name="lucide:code-2" class="h-4 w-4 text-amber-500" />
          </div>
          <div class="p-4 space-y-4">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 mt-0.5">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 border border-amber-200"
                >
                  <Icon name="lucide:database" class="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">Seed Database</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Populate the database with sample data. This will clear all
                  existing data.
                </p>
              </div>
            </div>
            <button
              @click="seedDatabase"
              :disabled="seedLoading || clearLoading"
              class="w-full inline-flex items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Icon
                v-if="seedLoading"
                name="lucide:loader-2"
                class="h-4 w-4 animate-spin"
              />
              <Icon v-else name="lucide:sparkles" class="h-4 w-4" />
              {{ seedLoading ? 'Seeding...' : 'Seed Sample Data' }}
            </button>

            <div class="border-t border-amber-200 pt-4 mt-4">
              <div class="flex items-start gap-3 mb-3">
                <div class="flex-shrink-0 mt-0.5">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 border border-red-200"
                  >
                    <Icon name="lucide:trash-2" class="h-4 w-4 text-red-600" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900">
                    Clear Database
                  </p>
                  <p class="text-xs text-gray-500 mt-0.5">
                    Remove all data except settings.
                  </p>
                </div>
              </div>
              <button
                @click="clearDatabase"
                :disabled="clearLoading || seedLoading"
                class="w-full inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Icon
                  v-if="clearLoading"
                  name="lucide:loader-2"
                  class="h-4 w-4 animate-spin"
                />
                <Icon v-else name="lucide:trash-2" class="h-4 w-4" />
                {{ clearLoading ? 'Clearing...' : 'Clear All Data' }}
              </button>
            </div>

            <p class="text-xs text-amber-600 text-center">
              <Icon
                name="lucide:alert-triangle"
                class="h-3 w-3 inline-block mr-1"
              />
              These actions cannot be undone
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
