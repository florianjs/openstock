<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const { notifications, unreadCount, markAsRead, markAllAsRead } =
  useNotifications();
const isNotificationsOpen = ref(false);

function toggleNotifications() {
  isNotificationsOpen.value = !isNotificationsOpen.value;
}

function closeNotifications() {
  isNotificationsOpen.value = false;
}

function handleNotificationClick(notification: any) {
  markAsRead(notification.id);
  if (notification.href) {
    router.push(notification.href);
  }
  closeNotifications();
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('[data-notifications-container]')) {
    closeNotifications();
  }
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', handleClickOutside);
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('click', handleClickOutside);
  }
});

const breadcrumbs = computed(() => {
  const path = route.path;
  if (path === '/') {
    return [{ name: 'Dashboard', href: '/', icon: 'lucide:layout-dashboard' }];
  }

  const segments = path.split('/').filter(Boolean);
  const crumbs: { name: string; href: string; icon?: string }[] = [
    { name: 'Dashboard', href: '/', icon: 'lucide:home' },
  ];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const name = segment.charAt(0).toUpperCase() + segment.slice(1);
    crumbs.push({ name, href: currentPath });
  }

  return crumbs;
});

const isSearchOpen = ref(false);
const searchQuery = ref('');
const isSearching = ref(false);

interface SearchResult {
  type: 'product' | 'supplier' | 'category';
  id: string;
  name: string;
  description?: string;
  href: string;
  icon: string;
}

const searchResults = ref<SearchResult[]>([]);

const { data: products } = useFetch('/api/products');
const { data: suppliers } = useFetch('/api/suppliers');
const { data: categories } = useFetch('/api/categories');

const filteredResults = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return [];

  const results: SearchResult[] = [];

  if (products.value) {
    for (const product of products.value) {
      if (
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'product',
          id: product.id,
          name: product.name,
          description: product.sku ? `SKU: ${product.sku}` : undefined,
          href: `/products/${product.id}`,
          icon: 'lucide:package',
        });
      }
      if (product.variants) {
        for (const variant of product.variants) {
          if (
            variant.name.toLowerCase().includes(query) ||
            variant.sku?.toLowerCase().includes(query)
          ) {
            results.push({
              type: 'product',
              id: product.id,
              name: `${product.name} - ${variant.name}`,
              description: variant.sku ? `SKU: ${variant.sku}` : undefined,
              href: `/products/${product.id}`,
              icon: 'lucide:package',
            });
          }
        }
      }
    }
  }

  // Search in suppliers
  if (suppliers.value) {
    for (const supplier of suppliers.value) {
      if (
        supplier.name.toLowerCase().includes(query) ||
        supplier.email?.toLowerCase().includes(query) ||
        supplier.phone?.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'supplier',
          id: supplier.id,
          name: supplier.name,
          description: supplier.email || undefined,
          href: '/suppliers',
          icon: 'lucide:truck',
        });
      }
    }
  }

  // Search in categories
  if (categories.value) {
    for (const category of categories.value) {
      if (
        category.name.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'category',
          id: category.id,
          name: category.name,
          description: category.description || undefined,
          href: '/categories',
          icon: 'lucide:folder',
        });
      }
    }
  }

  // Limit results
  return results.slice(0, 10);
});

function toggleSearch() {
  isSearchOpen.value = !isSearchOpen.value;
  if (isSearchOpen.value) {
    searchQuery.value = '';
    nextTick(() => {
      document.getElementById('global-search')?.focus();
    });
  }
}

function closeSearch() {
  isSearchOpen.value = false;
  searchQuery.value = '';
}

function navigateToResult(result: SearchResult) {
  closeSearch();
  router.push(result.href);
}

// Keyboard shortcut for search
onMounted(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      e.stopPropagation();
      toggleSearch();
    }
    if (e.key === 'Escape' && isSearchOpen.value) {
      e.preventDefault();
      e.stopPropagation();
      closeSearch();
    }
  };
  window.addEventListener('keydown', handler, true);
  onUnmounted(() => window.removeEventListener('keydown', handler, true));
});
</script>

<template>
  <header
    class="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md px-6 transition-all"
  >
    <!-- Left side: Breadcrumbs -->
    <nav class="flex items-center gap-2 text-sm">
      <template v-for="(crumb, index) in breadcrumbs" :key="crumb.href">
        <!-- Separator -->
        <Icon
          v-if="index > 0"
          name="lucide:chevron-right"
          class="h-4 w-4 text-gray-400"
        />

        <!-- Crumb -->
        <NuxtLink
          :to="crumb.href"
          class="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors"
          :class="
            index === breadcrumbs.length - 1
              ? 'font-semibold text-gray-900 bg-gray-100/50'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          "
        >
          <Icon v-if="crumb.icon" :name="crumb.icon" class="h-4 w-4" />
          <span>{{ crumb.name }}</span>
        </NuxtLink>
      </template>
    </nav>

    <!-- Right side: Actions -->
    <div class="flex items-center gap-3">
      <!-- Search button -->
      <UiButton
        variant="ghost"
        size="icon"
        @click="toggleSearch"
        aria-label="Search"
        class="text-gray-500 hover:text-gray-900"
      >
        <Icon name="lucide:search" class="h-5 w-5" />
      </UiButton>

      <!-- Notifications -->
      <div class="relative" data-notifications-container>
        <UiButton
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          class="relative text-gray-500 hover:text-gray-900"
          @click.stop="toggleNotifications"
        >
          <Icon name="lucide:bell" class="h-5 w-5" />
          <!-- Notification badge -->
          <span
            v-if="unreadCount > 0"
            class="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </UiButton>

        <!-- Notifications dropdown -->
        <Transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isNotificationsOpen"
            class="absolute right-0 top-full mt-2 w-80 origin-top-right rounded-xl border border-gray-200 bg-white shadow-lg z-50"
          >
            <!-- Header -->
            <div
              class="flex items-center justify-between border-b border-gray-100 px-4 py-3"
            >
              <h3 class="font-semibold text-gray-900">Notifications</h3>
              <button
                v-if="unreadCount > 0"
                class="text-xs text-primary-600 hover:text-primary-700 font-medium"
                @click="markAllAsRead"
              >
                Mark all as read
              </button>
            </div>

            <!-- Notifications list -->
            <div class="max-h-80 overflow-y-auto">
              <template v-if="notifications.length > 0">
                <button
                  v-for="notification in notifications.slice(0, 10)"
                  :key="notification.id"
                  class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  :class="{ 'bg-primary-50/50': !notification.read }"
                  @click="handleNotificationClick(notification)"
                >
                  <div
                    class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    :class="{
                      'bg-red-100 text-red-600': notification.type === 'error',
                      'bg-amber-100 text-amber-600':
                        notification.type === 'warning',
                      'bg-blue-100 text-blue-600': notification.type === 'info',
                      'bg-green-100 text-green-600':
                        notification.type === 'success',
                    }"
                  >
                    <Icon
                      :name="
                        notification.type === 'error'
                          ? 'lucide:alert-circle'
                          : notification.type === 'warning'
                          ? 'lucide:alert-triangle'
                          : notification.type === 'success'
                          ? 'lucide:check-circle'
                          : 'lucide:info'
                      "
                      class="h-4 w-4"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {{ notification.title }}
                    </p>
                    <p
                      v-if="notification.description"
                      class="text-xs text-gray-500 mt-0.5 line-clamp-2"
                    >
                      {{ notification.description }}
                    </p>
                  </div>
                  <div
                    v-if="!notification.read"
                    class="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500"
                  />
                </button>
              </template>
              <div
                v-else
                class="flex flex-col items-center justify-center py-8 text-gray-400"
              >
                <Icon name="lucide:bell-off" class="h-8 w-8 mb-2" />
                <p class="text-sm">No notifications</p>
              </div>
            </div>

            <!-- Footer -->
            <div
              v-if="notifications.length > 0"
              class="border-t border-gray-100 p-2"
            >
              <NuxtLink
                to="/movements"
                class="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                @click="closeNotifications"
              >
                View all activity
                <Icon name="lucide:arrow-right" class="h-4 w-4" />
              </NuxtLink>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Separator -->
      <div class="mx-2 h-6 w-px bg-gray-200" />

      <!-- Quick Actions - Compact buttons -->
      <div class="flex items-center gap-2">
        <NuxtLink to="/movements">
          <UiButton variant="outline" size="sm" class="gap-2">
            <Icon name="lucide:arrow-down" class="h-4 w-4 text-emerald-600" />
            <span>In</span>
          </UiButton>
        </NuxtLink>
        <NuxtLink to="/movements">
          <UiButton variant="outline" size="sm" class="gap-2">
            <Icon name="lucide:arrow-up" class="h-4 w-4 text-red-600" />
            <span>Out</span>
          </UiButton>
        </NuxtLink>
        <NuxtLink to="/products">
          <UiButton
            variant="primary"
            size="sm"
            class="gap-2 shadow-md shadow-primary-500/20"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
            <span>Product</span>
          </UiButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Search modal/overlay -->
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
          v-if="isSearchOpen"
          class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-gray-950/40 backdrop-blur-[2px]"
            @click="isSearchOpen = false"
          />

          <!-- Search box -->
          <div
            class="relative z-10 w-full max-w-lg rounded-xl border border-gray-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            @keydown.escape.stop.prevent="closeSearch"
          >
            <div class="flex items-center gap-3 px-3 py-2">
              <Icon
                name="lucide:search"
                class="h-5 w-5 shrink-0 text-gray-400"
              />
              <input
                id="global-search"
                v-model="searchQuery"
                type="text"
                placeholder="Search products, suppliers, categories..."
                class="h-10 flex-1 bg-transparent text-base outline-none placeholder:text-gray-400"
                @keydown.escape.stop.prevent="closeSearch"
              />
              <kbd
                class="hidden h-6 items-center rounded border border-gray-200 bg-gray-50 px-2 font-mono text-[10px] font-medium text-gray-500 sm:flex"
              >
                ESC
              </kbd>
            </div>

            <!-- Search Results -->
            <div
              v-if="searchQuery && filteredResults.length > 0"
              class="mt-2 border-t border-gray-100 pt-2"
            >
              <p
                class="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"
              >
                Results ({{ filteredResults.length }})
              </p>
              <div class="flex flex-col p-2 max-h-64 overflow-y-auto">
                <button
                  v-for="result in filteredResults"
                  :key="`${result.type}-${result.id}`"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left w-full"
                  @click="navigateToResult(result)"
                >
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-md text-gray-500"
                    :class="{
                      'bg-blue-100 text-blue-600': result.type === 'product',
                      'bg-green-100 text-green-600': result.type === 'supplier',
                      'bg-purple-100 text-purple-600':
                        result.type === 'category',
                    }"
                  >
                    <Icon :name="result.icon" class="h-4 w-4" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{{ result.name }}</p>
                    <p
                      v-if="result.description"
                      class="text-xs text-gray-400 truncate"
                    >
                      {{ result.description }}
                    </p>
                  </div>
                  <span
                    class="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full"
                    :class="{
                      'bg-blue-100 text-blue-600': result.type === 'product',
                      'bg-green-100 text-green-600': result.type === 'supplier',
                      'bg-purple-100 text-purple-600':
                        result.type === 'category',
                    }"
                  >
                    {{ result.type }}
                  </span>
                </button>
              </div>
            </div>

            <!-- No results -->
            <div
              v-else-if="searchQuery && filteredResults.length === 0"
              class="mt-2 border-t border-gray-100 pt-2"
            >
              <div
                class="flex flex-col items-center justify-center py-8 text-gray-400"
              >
                <Icon name="lucide:search-x" class="h-8 w-8 mb-2" />
                <p class="text-sm">No results found for "{{ searchQuery }}"</p>
              </div>
            </div>

            <!-- Quick links (shown when no search query) -->
            <div v-else class="mt-2 border-t border-gray-100 pt-2">
              <p
                class="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"
              >
                Quick Links
              </p>
              <div class="flex flex-col p-2">
                <NuxtLink
                  to="/products"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  @click="isSearchOpen = false"
                >
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-500"
                  >
                    <Icon name="lucide:package" class="h-4 w-4" />
                  </div>
                  <span>Products</span>
                </NuxtLink>
                <NuxtLink
                  to="/movements"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  @click="isSearchOpen = false"
                >
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-500"
                  >
                    <Icon name="lucide:arrow-left-right" class="h-4 w-4" />
                  </div>
                  <span>Stock Movements</span>
                </NuxtLink>
                <NuxtLink
                  to="/suppliers"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  @click="isSearchOpen = false"
                >
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-500"
                  >
                    <Icon name="lucide:truck" class="h-4 w-4" />
                  </div>
                  <span>Suppliers</span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>
