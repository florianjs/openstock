export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  description?: string;
  href?: string;
  read: boolean;
  createdAt: Date;
}

const notifications = ref<Notification[]>([]);
const readGeneratedIds = ref<Set<string>>(new Set());

export function useNotifications() {
  // Fetch products to check for low stock
  const { data: products, refresh: refreshProducts } = useFetch(
    '/api/products',
    {
      key: 'notifications-products',
      lazy: true,
    }
  );

  // Generate notifications from products (low stock alerts)
  const generatedNotifications = computed(() => {
    const alerts: Notification[] = [];

    if (products.value) {
      for (const product of products.value) {
        // Check main product stock
        if (product.stockQuantity !== null && product.stockMin !== null) {
          if (product.stockQuantity <= 0) {
            const id = `out-of-stock-${product.id}`;
            alerts.push({
              id,
              type: 'error',
              title: 'Out of Stock',
              description: `${product.name} is out of stock`,
              href: `/products/${product.id}`,
              read: readGeneratedIds.value.has(id),
              createdAt: new Date(),
            });
          } else if (product.stockQuantity <= product.stockMin) {
            const id = `low-stock-${product.id}`;
            alerts.push({
              id,
              type: 'warning',
              title: 'Low Stock Alert',
              description: `${product.name} has only ${product.stockQuantity} units left (min: ${product.stockMin})`,
              href: `/products/${product.id}`,
              read: readGeneratedIds.value.has(id),
              createdAt: new Date(),
            });
          }
        }

        // Check variant stock
        if (product.variants) {
          for (const variant of product.variants) {
            if (variant.stockQuantity !== null && variant.stockMin !== null) {
              if (variant.stockQuantity <= 0) {
                const id = `out-of-stock-variant-${variant.id}`;
                alerts.push({
                  id,
                  type: 'error',
                  title: 'Out of Stock',
                  description: `${product.name} - ${variant.name} is out of stock`,
                  href: `/products/${product.id}`,
                  read: readGeneratedIds.value.has(id),
                  createdAt: new Date(),
                });
              } else if (variant.stockQuantity <= variant.stockMin) {
                const id = `low-stock-variant-${variant.id}`;
                alerts.push({
                  id,
                  type: 'warning',
                  title: 'Low Stock Alert',
                  description: `${product.name} - ${variant.name} has only ${variant.stockQuantity} units left`,
                  href: `/products/${product.id}`,
                  read: readGeneratedIds.value.has(id),
                  createdAt: new Date(),
                });
              }
            }
          }
        }
      }
    }

    return alerts;
  });

  // Combine generated and manual notifications
  const allNotifications = computed(() => {
    const combined = [...generatedNotifications.value, ...notifications.value];
    // Sort by date, newest first
    return combined.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  });

  const unreadCount = computed(() => {
    return allNotifications.value.filter((n) => !n.read).length;
  });

  function addNotification(
    notification: Omit<Notification, 'id' | 'read' | 'createdAt'>
  ) {
    notifications.value.unshift({
      ...notification,
      id: `manual-${Date.now()}`,
      read: false,
      createdAt: new Date(),
    });
  }

  function markAsRead(id: string) {
    const notification = notifications.value.find((n) => n.id === id);
    if (notification) {
      notification.read = true;
    }
    // Also mark generated notifications as read
    readGeneratedIds.value.add(id);
  }

  function markAllAsRead() {
    notifications.value.forEach((n) => {
      n.read = true;
    });
    // Mark all generated notifications as read
    generatedNotifications.value.forEach((n) => {
      readGeneratedIds.value.add(n.id);
    });
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  }

  function clearAll() {
    notifications.value = [];
  }

  return {
    notifications: allNotifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    refresh: refreshProducts,
  };
}
