<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { token, user, logout } from './auth';
import { useCartStore } from './stores/cart';
import { saveCart, discardSavedCart } from './api';

const router = useRouter();
const cart = useCartStore();
const showSaveCartModal = ref(false);

function handleLogout() {
  if (cart.itemCount > 0) {
    showSaveCartModal.value = true;
  } else {
    logout();
    router.push('/login');
  }
}

async function handleSave() {
  const currentToken = token.value;
  showSaveCartModal.value = false;
  try {
    await saveCart(currentToken, cart.items.map((i) => ({ productId: i.product.id, quantity: i.quantity })));
  } catch {
    // proceed with logout regardless
  }
  cart.clearCart();
  logout();
  router.push('/login');
}

async function handleDiscard() {
  const currentToken = token.value;
  showSaveCartModal.value = false;
  try {
    await discardSavedCart(currentToken);
  } catch {
    // proceed with logout regardless
  }
  cart.clearCart();
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
        <RouterLink v-if="user?.role === 'admin' || user?.role === 'salesperson'" to="/admin">Admin</RouterLink>
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
            <div class="user-actions">
              <RouterLink to="/account" class="account-link">Account</RouterLink>
              <button type="button" @click="handleLogout">Sign out</button>
            </div>
          </div>
        </template>
        <RouterLink v-else to="/login">Log in</RouterLink>
      </div>
    </nav>
  </header>
  <main>
    <RouterView />
  </main>

  <div v-if="showSaveCartModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="save-cart-title">
    <div class="modal">
      <p id="save-cart-title">Save cart for next login?</p>
      <div class="modal-actions">
        <button type="button" @click="handleSave">Save</button>
        <button type="button" @click="handleDiscard">Discard</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-email {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  padding: 1.5rem 2rem;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 280px;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
</style>
