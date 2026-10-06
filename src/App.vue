<script setup>
import { useRouter } from 'vue-router';
import { token, user, logout } from './auth';
import { useCartStore } from './stores/cart';

const router = useRouter();
const cart = useCartStore();

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
        <RouterLink v-if="user?.role === 'admin'" to="/upload-product">Upload Product</RouterLink>
        <RouterLink to="/cart" class="cart-link" aria-label="Cart">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span v-if="cart.itemCount > 0" class="cart-badge">{{ cart.itemCount }}</span>
        </RouterLink>
      </div>
      <div class="nav-account">
        <template v-if="token">
          <div class="user-block">
            <span class="user-email">{{ user?.email }}</span>
            <RouterLink to="/account" class="account-link">Account</RouterLink>
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

<style scoped>
.user-email {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: middle;
}
</style>
