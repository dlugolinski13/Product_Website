<script setup>
import { ref, onMounted } from 'vue';
import { fetchOrders } from '../api';
import { token } from '../auth';

const orders = ref([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    orders.value = await fetchOrders(token.value);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <h1>Order history</h1>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="orders.length === 0">You haven't placed any orders yet.</p>
    <ul v-else class="order-list">
      <li v-for="order in orders" :key="order.id" class="order">
        <p><strong>Order {{ order.id }}</strong> — {{ order.status }}</p>
        <p class="item-number">{{ new Date(order.createdAt).toLocaleString() }}</p>
        <ul>
          <li v-for="item in order.items" :key="item.id">
            {{ item.productName }} ({{ item.itemNumber }}) × {{ item.quantity }} — ${{ Number(item.unitPrice).toFixed(2) }}
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>
