<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchOrders } from '../api';
import { token, logout } from '../auth';

const router = useRouter();
const orders = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    orders.value = await fetchOrders(token.value);
  } catch (err) {
    if (err.status === 401) {
      logout();
      router.push({ path: '/login', query: { redirect: '/orders' } });
    } else {
      error.value = err.message;
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <h1>Order History</h1>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <p v-else-if="orders.length === 0">No orders yet.</p>
    <template v-else>
      <div v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-header">
          <span class="order-status">{{ order.status }}</span>
          <span class="order-date">{{ new Date(order.createdAt).toLocaleDateString() }}</span>
        </div>
        <ul class="order-items">
          <li v-for="item in order.items" :key="item.id" class="order-item">
            <span>{{ item.productName }}</span>
            <span>×{{ item.quantity }}</span>
            <span>${{ Number(item.unitPrice).toFixed(2) }}</span>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
