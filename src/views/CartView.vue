<script setup>
import { ref } from 'vue';
import { items, subtotal, updateQuantity, removeFromCart, clearCart } from '../cart';
import { token } from '../auth';
import { createOrder } from '../api';

const submitting = ref(false);
const error = ref('');
const success = ref(false);

function handleQuantityChange(productId, event) {
  updateQuantity(productId, Number(event.target.value));
}

async function handleSubmit() {
  error.value = '';
  submitting.value = true;
  try {
    await createOrder(
      token.value,
      items.value.map((item) => ({ productId: item.productId, quantity: item.quantity }))
    );
    clearCart();
    success.value = true;
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section>
    <h1>Cart</h1>
    <p v-if="success">Order submitted!</p>
    <template v-else>
      <p v-if="items.length === 0">Your cart is empty.</p>
      <template v-else>
        <ul class="cart-list">
          <li v-for="item in items" :key="item.productId" class="cart-item">
            <img v-if="item.image" :src="item.image" :alt="item.name" class="cart-thumb" />
            <div>
              <h2>{{ item.name }}</h2>
              <p class="item-number">{{ item.itemNumber }}</p>
              <label>
                Qty
                <input
                  type="number"
                  min="1"
                  class="quantity"
                  :value="item.quantity"
                  @change="handleQuantityChange(item.productId, $event)"
                />
              </label>
              <button type="button" class="remove" @click="removeFromCart(item.productId)">Remove</button>
            </div>
            <p class="price">${{ (item.price * item.quantity).toFixed(2) }}</p>
          </li>
        </ul>
        <p class="price">Subtotal: ${{ subtotal.toFixed(2) }}</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button type="button" class="place-order" :disabled="submitting" @click="handleSubmit">
          {{ submitting ? 'Submitting…' : 'Place order' }}
        </button>
      </template>
    </template>
  </section>
</template>
