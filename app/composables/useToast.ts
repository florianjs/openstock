import type { ToastType } from '~/components/ui/Toast.vue';

interface ToastOptions {
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface Toast {
  add: (options: ToastOptions) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  remove: (id: string) => void;
  clear: () => void;
}

export function useToast(): Toast {
  // Try to get from injection first
  const injected = inject<Toast | null>('toast', null);
  if (injected) {
    return injected;
  }

  // Fallback to window.$toast if available
  if (import.meta.client && (window as any).$toast) {
    return (window as any).$toast;
  }

  // Return a no-op toast if nothing is available
  console.warn(
    'Toast system not initialized. Make sure UiToastContainer is in your app.'
  );
  return {
    add: () => '',
    success: () => '',
    error: () => '',
    warning: () => '',
    info: () => '',
    remove: () => {},
    clear: () => {},
  };
}
