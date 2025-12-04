<script setup lang="ts">
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
  isActive: boolean;
  createdAt: string;
}

const { user: currentUser } = useAuth();
const toast = useToast();

const { data: users, refresh } = await useFetch<User[]>('/api/users');

const showModal = ref(false);
const showEditModal = ref(false);
const editingUser = ref<User | null>(null);
const isSubmitting = ref(false);

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'member' as 'member' | 'viewer',
});

const editForm = reactive({
  name: '',
  email: '',
  password: '',
  role: 'member' as 'member' | 'viewer',
  isActive: true,
});

function openCreateModal() {
  form.name = '';
  form.email = '';
  form.password = '';
  form.role = 'member';
  showModal.value = true;
}

function openEditModal(user: User) {
  editingUser.value = user;
  editForm.name = user.name;
  editForm.email = user.email;
  editForm.password = '';
  editForm.role = user.role === 'admin' ? 'member' : user.role;
  editForm.isActive = user.isActive;
  showEditModal.value = true;
}

async function createUser() {
  if (!form.name.trim() || !form.email.trim() || !form.password) {
    toast.error('Please fill all fields');
    return;
  }

  if (form.password.length < 8) {
    toast.error('Password must be at least 8 characters');
    return;
  }

  isSubmitting.value = true;

  try {
    await $fetch('/api/users', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      },
    });

    toast.success('User created successfully');
    showModal.value = false;
    await refresh();
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } };
    toast.error(err.data?.message || 'Failed to create user');
  } finally {
    isSubmitting.value = false;
  }
}

async function updateUser() {
  if (!editingUser.value) return;

  if (!editForm.name.trim() || !editForm.email.trim()) {
    toast.error('Name and email are required');
    return;
  }

  if (editForm.password && editForm.password.length < 8) {
    toast.error('Password must be at least 8 characters');
    return;
  }

  isSubmitting.value = true;

  try {
    const body: Record<string, unknown> = {
      name: editForm.name,
      email: editForm.email,
      isActive: editForm.isActive,
    };

    // Only include role if not editing an admin
    if (editingUser.value.role !== 'admin') {
      body.role = editForm.role;
    }

    if (editForm.password) {
      body.password = editForm.password;
    }

    await $fetch(`/api/users/${editingUser.value.id}`, {
      method: 'PUT',
      body,
    });

    toast.success('User updated successfully');
    showEditModal.value = false;
    editingUser.value = null;
    await refresh();
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } };
    toast.error(err.data?.message || 'Failed to update user');
  } finally {
    isSubmitting.value = false;
  }
}

async function deleteUser(user: User) {
  if (user.id === currentUser.value?.id) {
    toast.error('You cannot delete your own account');
    return;
  }

  if (!confirm(`Are you sure you want to delete ${user.name}?`)) {
    return;
  }

  try {
    await $fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    toast.success('User deleted successfully');
    await refresh();
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } };
    toast.error(err.data?.message || 'Failed to delete user');
  }
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Users
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          Manage user accounts and access levels.
        </p>
      </div>
      <UiButton @click="openCreateModal">
        <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
        Add User
      </UiButton>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              <th
                class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
              >
                User
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
              >
                Role
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
              >
                Created
              </th>
              <th class="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="user in users"
              :key="user.id"
              class="hover:bg-gray-50/50 transition-colors"
            >
              <td class="px-4 py-3">
                <div>
                  <p class="text-sm font-medium text-gray-900">
                    {{ user.name }}
                    <span
                      v-if="user.id === currentUser?.id"
                      class="text-xs text-gray-400 ml-1"
                      >(you)</span
                    >
                  </p>
                  <p class="text-xs text-gray-500">{{ user.email }}</p>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  :class="{
                    'bg-purple-100 text-purple-700': user.role === 'admin',
                    'bg-blue-100 text-blue-700': user.role === 'member',
                    'bg-amber-100 text-amber-700': user.role === 'viewer',
                  }"
                >
                  {{
                    user.role === 'admin'
                      ? 'Administrator'
                      : user.role === 'member'
                      ? 'Member'
                      : 'Viewer'
                  }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  :class="
                    user.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  "
                >
                  {{ user.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(user)"
                    class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Edit user"
                  >
                    <Icon name="lucide:pencil" class="w-4 h-4" />
                  </button>
                  <button
                    v-if="user.id !== currentUser?.id && user.role !== 'admin'"
                    @click="deleteUser(user)"
                    class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete user"
                  >
                    <Icon name="lucide:trash-2" class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <UiEmptyState
        v-if="users?.length === 0"
        icon="lucide:users"
        title="No users yet"
        description="Create your first user to get started."
      />
    </div>

    <!-- Create User Modal -->
    <UiModal v-model:open="showModal" title="Add New User">
      <form @submit.prevent="createUser" class="space-y-4">
        <UiInput
          v-model="form.name"
          label="Full Name"
          placeholder="John Doe"
          :disabled="isSubmitting"
        />

        <UiInput
          v-model="form.email"
          type="email"
          label="Email Address"
          placeholder="user@company.com"
          :disabled="isSubmitting"
        />

        <UiInput
          v-model="form.password"
          type="password"
          label="Password"
          placeholder="Minimum 8 characters"
          :disabled="isSubmitting"
        />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Role
          </label>
          <select
            v-model="form.role"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            :disabled="isSubmitting"
          >
            <option value="member">Member (Full access)</option>
            <option value="viewer">Viewer (Read-only)</option>
          </select>
          <p class="mt-1 text-xs text-gray-500">
            Members can create and modify data. Viewers have read-only access.
          </p>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton
            type="button"
            variant="ghost"
            @click="showModal = false"
            :disabled="isSubmitting"
          >
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="isSubmitting">
            Create User
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit User Modal -->
    <UiModal v-model:open="showEditModal" title="Edit User">
      <form @submit.prevent="updateUser" class="space-y-4">
        <UiInput
          v-model="editForm.name"
          label="Full Name"
          placeholder="John Doe"
          :disabled="isSubmitting"
        />

        <UiInput
          v-model="editForm.email"
          type="email"
          label="Email Address"
          placeholder="user@company.com"
          :disabled="isSubmitting"
        />

        <UiInput
          v-model="editForm.password"
          type="password"
          label="New Password (leave blank to keep current)"
          placeholder="Minimum 8 characters"
          :disabled="isSubmitting"
        />

        <div
          v-if="editingUser?.id !== currentUser?.id"
          class="flex items-center gap-3"
        >
          <input
            type="checkbox"
            v-model="editForm.isActive"
            id="isActive"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label for="isActive" class="text-sm text-gray-700">
            Account is active
          </label>
        </div>

        <div v-if="editingUser?.role !== 'admin'">
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Role
          </label>
          <select
            v-model="editForm.role"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            :disabled="isSubmitting"
          >
            <option value="member">Member (Full access)</option>
            <option value="viewer">Viewer (Read-only)</option>
          </select>
          <p class="mt-1 text-xs text-gray-500">
            Members can create and modify data. Viewers have read-only access.
          </p>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton
            type="button"
            variant="ghost"
            @click="showEditModal = false"
            :disabled="isSubmitting"
          >
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="isSubmitting">
            Save Changes
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
