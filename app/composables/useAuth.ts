interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
}

export function useAuth() {
  const {
    fetch: refreshSession,
    user,
    loggedIn,
    clear: clearSession,
  } = useUserSession();

  // Computed values derived directly from session
  const typedUser = computed(() => user.value as User | null);
  const isAuthenticated = computed(() => loggedIn.value);
  const isAdmin = computed(() => typedUser.value?.role === 'admin');
  const canEdit = computed(() => typedUser.value?.role !== 'viewer');

  async function login(email: string, password: string) {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    await refreshSession();

    return result;
  }

  async function setup(email: string, password: string, name: string) {
    const result = await $fetch('/api/auth/setup', {
      method: 'POST',
      body: { email, password, name },
    });

    await refreshSession();

    return result;
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' });
    await clearSession();
  }

  return {
    // State - directly from useUserSession
    user: typedUser,
    isAuthenticated,
    isAdmin,
    canEdit,

    // Actions
    login,
    setup,
    logout,
    refreshSession,
  };
}
