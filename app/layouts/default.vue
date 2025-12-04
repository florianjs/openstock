<script setup lang="ts">
const { loggedIn } = useUserSession();
</script>

<template>
  <!-- Main layout when authenticated -->
  <div v-if="loggedIn" class="flex h-screen overflow-hidden bg-gray-100">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <AppHeader />

      <!-- Page content -->
      <main class="flex-1 overflow-auto">
        <div class="mx-auto max-w-7xl px-4 py-5">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
