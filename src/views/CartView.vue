<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { token } from '../auth';
import { createOrder } from '../api';

const router = useRouter();
const cart = useCartStore();
const sending = ref(false);
const orderError = ref(null);

async function sendOrder() {
  sending.value = true;
  orderError.value = null;
  try {
    const items = cart.items.map((i) => ({ productId: i.product.id, quantity: i.quantity }));
    await createOrder(token.value, items);
    cart.clearCart();
    router.push('/orders');
  } catch (err) {
    orderError.value = err.message;
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <section>
    <h1>Cart</h1>
    <p v-if="cart.items.length === 0">Your cart is empty.</p>
    <template v-else>
      <ul class="cart-list">
        <li v-for="item in cart.items" :key="item.product.id" class="cart-item">
          <span class="cart-item-name">{{ item.product.name }}</span>
          <span class="cart-item-qty">{{ item.quantity }}</span>
          <span class="price">${{ Number(item.product.company_price).toFixed(2) }}</span>
          <button type="button" class="remove-btn" @click="cart.removeItem(item.product.id)">Remove</button>
        </li>
      </ul>
      <p class="cart-subtotal">Subtotal: ${{ cart.subtotal.toFixed(2) }}</p>
      <p v-if="orderError" role="alert">{{ orderError }}</p>
      <button type="button" class="send-order-btn" :disabled="sending" @click="sendOrder">
        {{ sending ? 'Sending…' : 'Send Order' }}
      </button>
    </template>
  </section>
</template>
