<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchProducts } from '../api';
import { token, logout } from '../auth';

const router = useRouter();
const products = ref([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    products.value = await fetchProducts(token.value);
  } catch (err) {
    if (err.status === 401) {
      // expired or invalid token — send the user back to log in
      logout();
      router.push({ path: '/login', query: { redirect: '/products' } });
      return;
    }
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <h1>Products</h1>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="products.length === 0">No products available yet.</p>
    <ul v-else class="product-list">
      <li v-for="product in products" :key="product.id" class="product">
        <img v-if="product.images.length" :src="product.images[0]" :alt="product.name" />
        <div>
          <h2>{{ product.name }}</h2>
          <p class="item-number">{{ product.item_number }}</p>
          <p>{{ product.description }}</p>
          <p class="price">${{ Number(product.company_price).toFixed(2) }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>
