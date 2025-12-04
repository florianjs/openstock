// Admin-only routes
const ADMIN_ROUTES = ['/users'];

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware for auth pages
  if (to.path.startsWith('/auth/')) {
    return;
  }

  // Use nuxt-auth-utils session directly for SSR compatibility
  const { loggedIn, user, fetch: refreshSession } = useUserSession();

  // Check if setup is needed
  const { data: authCheck } = await useFetch('/api/auth/check', {
    key: 'auth-check',
  });

  const needsSetup = authCheck.value?.needsSetup ?? false;

  // If no users exist, redirect to setup
  if (needsSetup) {
    if (to.path !== '/auth/setup') {
      return navigateTo('/auth/setup');
    }
    return;
  }

  // Ensure session is loaded
  if (!loggedIn.value) {
    await refreshSession();
  }

  // If still not authenticated, redirect to login
  if (!loggedIn.value) {
    if (to.path !== '/auth/login') {
      return navigateTo('/auth/login');
    }
    return;
  }

  // Check admin-only routes
  const isAdminRoute = ADMIN_ROUTES.some((route) => to.path.startsWith(route));
  if (isAdminRoute && (user.value as { role: string })?.role !== 'admin') {
    return navigateTo('/');
  }
});
