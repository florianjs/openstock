// API response shape (flat)
interface ApiSettings {
  id: number;
  businessName: string | null;
  currency: string | null;
  defaultMargin: number | null;
  lowStockAlert: boolean | number | null;
  outOfStockAlert: boolean | number | null;
  emailDailyReport: boolean | number | null;
  updatedAt: string | null;
}

// Frontend shape (nested for UI)
export interface Settings {
  businessName: string;
  currency: 'EUR' | 'USD' | 'GBP';
  defaultMargin: number;
  stockAlerts: {
    lowStock: boolean;
    outOfStock: boolean;
    emailDaily: boolean;
  };
}

// Transform API response to frontend shape
function transformFromApi(api: ApiSettings): Settings {
  return {
    businessName: api.businessName ?? 'OpenStock Inc.',
    currency: (api.currency as Settings['currency']) ?? 'EUR',
    defaultMargin: api.defaultMargin ?? 30,
    stockAlerts: {
      lowStock: Boolean(api.lowStockAlert),
      outOfStock: Boolean(api.outOfStockAlert),
      emailDaily: Boolean(api.emailDailyReport),
    },
  };
}

// Transform frontend shape to API payload
function transformToApi(settings: Settings): Partial<ApiSettings> {
  return {
    businessName: settings.businessName,
    currency: settings.currency,
    defaultMargin: settings.defaultMargin,
    lowStockAlert: settings.stockAlerts.lowStock,
    outOfStockAlert: settings.stockAlerts.outOfStock,
    emailDailyReport: settings.stockAlerts.emailDaily,
  };
}

export const useSettings = () => {
  const { data: rawSettings, refresh } = useAsyncData<ApiSettings>(
    'settings',
    () => $fetch('/api/settings')
  );

  // Transform raw API data to frontend shape
  const settings = computed<Settings | null>(() => {
    if (!rawSettings.value) return null;
    return transformFromApi(rawSettings.value);
  });

  const currencySymbol = computed(() => {
    switch (settings.value?.currency) {
      case 'EUR':
        return '€';
      case 'USD':
        return '$';
      case 'GBP':
        return '£';
      default:
        return '€';
    }
  });

  const currencyIcon = computed(() => {
    switch (settings.value?.currency) {
      case 'EUR':
        return 'lucide:euro';
      case 'USD':
        return 'lucide:dollar-sign';
      case 'GBP':
        return 'lucide:pound-sterling';
      default:
        return 'lucide:euro';
    }
  });

  async function updateSettings(newSettings: Settings) {
    try {
      await $fetch('/api/settings', {
        method: 'POST',
        body: transformToApi(newSettings),
      });
      await refresh();
      return true;
    } catch (e) {
      console.error('Failed to save settings', e);
      return false;
    }
  }

  return {
    settings,
    currencySymbol,
    currencyIcon,
    updateSettings,
    refresh,
  };
};
