<script setup>
import { useRouter } from 'vue-router';
import { token, logout } from './auth';

const router = useRouter();

function handleLogout() {
  logout();
  router.push('/login');
}
</script>

<template>
  <header>
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/products">Products</RouterLink>
      <button v-if="token" type="button" @click="handleLogout">Log out</button>
      <RouterLink v-else to="/login">Log in</RouterLink>
    </nav>
  </header>
  <main>
    <RouterView />
  </main>
</template>
