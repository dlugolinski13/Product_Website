<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchProducts } from '../api';
import { token, logout } from '../auth';

const router = useRouter();
const products = ref([]);
const loading = ref(true);
const error = ref('');
const search = ref('');

const filteredProducts = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return products.value;
  return products.value.filter(p =>
    p.item_number?.toLowerCase().includes(q) ||
    p.name?.toLowerCase().includes(q) ||
    p.description?.toLowerCase().includes(q)
  );
});

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
    <input
      v-model="search"
      type="search"
      placeholder="Search by name, item number, or description…"
      class="search-input"
    />
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="products.length === 0">No products available yet.</p>
    <p v-else-if="filteredProducts.length === 0">No products match your search.</p>
    <ul v-else class="product-list">
      <li v-for="product in filteredProducts" :key="product.id" class="product">
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
