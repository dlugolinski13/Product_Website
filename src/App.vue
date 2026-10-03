<script setup>
import { useRouter } from 'vue-router';
import { token, user, logout } from './auth';
import { itemCount } from './cart';

const router = useRouter();

function handleLogout() {
  logout();
  router.push('/login');
}
</script>

<template>
  <header>
    <nav>
      <div class="nav-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/products">Products</RouterLink>
        <RouterLink v-if="user?.role === 'admin'" to="/products/upload">Upload Product</RouterLink>
        <RouterLink v-if="token" to="/cart">Cart ({{ itemCount }})</RouterLink>
      </div>
      <div class="nav-account">
        <template v-if="token">
          <RouterLink to="/account" class="account-link">Account</RouterLink>
          <div class="user-block">
            <span class="user-email">{{ user?.email }}</span>
            <button type="button" @click="handleLogout">Sign out</button>
          </div>
        </template>
        <RouterLink v-else to="/login">Log in</RouterLink>
      </div>
    </nav>
  </header>
  <main>
    <RouterView />
  </main>
</template>
