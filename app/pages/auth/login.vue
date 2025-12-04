<script setup lang="ts">
definePageMeta({
  layout: false,
});

const { login } = useAuth();
const router = useRouter();

// If setup is needed, redirect to setup
onMounted(async () => {
  const result = await $fetch<{ needsSetup: boolean }>('/api/auth/check');
  if (result.needsSetup) {
    router.replace('/auth/setup');
  }
});

const form = reactive({
  email: '',
  password: '',
});

const error = ref('');
const isLoading = ref(false);

async function handleSubmit() {
  error.value = '';

  if (!form.email.trim()) {
    error.value = 'Email is required';
    return;
  }

  if (!form.password) {
    error.value = 'Password is required';
    return;
  }

  isLoading.value = true;

  try {
    await login(form.email, form.password);
    await router.push('/');
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } };
    error.value = err.data?.message || 'Invalid email or password';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-lg shadow-md border border-gray-200 p-8">
        <div class="text-center mb-8">
          <div
            class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary-50 mb-4"
          >
            <Icon name="lucide:package" class="w-6 h-6 text-primary-600" />
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p class="text-sm text-gray-500 mt-2">
            Sign in to your OpenStock account
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div
            v-if="error"
            class="p-3 rounded-md bg-red-50 border border-red-200"
          >
            <p class="text-sm text-red-600 flex items-center gap-2">
              <Icon name="lucide:alert-circle" class="w-4 h-4" />
              {{ error }}
            </p>
          </div>

          <UiInput
            v-model="form.email"
            type="email"
            label="Email Address"
            placeholder="admin@company.com"
            icon="lucide:mail"
            :disabled="isLoading"
          />

          <UiInput
            v-model="form.password"
            type="password"
            label="Password"
            placeholder="••••••••"
            icon="lucide:lock"
            :disabled="isLoading"
          />

          <UiButton
            type="submit"
            block
            :loading="isLoading"
            :disabled="isLoading"
          >
            <Icon v-if="!isLoading" name="lucide:log-in" class="w-4 h-4 mr-2" />
            Sign In
          </UiButton>
        </form>
      </div>
    </div>
  </div>
</template>
