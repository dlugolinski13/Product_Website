<script setup>
import { useCartStore } from '../stores/cart';

const cart = useCartStore();
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
    </template>
  </section>
</template>
