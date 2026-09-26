<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { fetchProducts } from '../api';
import { token, logout } from '../auth';

const router = useRouter();
const products = ref([]);
const error = ref('');
const search = ref('');
const selectedCategory = ref('');
const showAll = ref(false);

const categories = computed(() => {
  const codes = [...new Set(products.value.map(p => p.group_code).filter(Boolean))];
  return codes.sort();
});

const hasInteracted = computed(() => showAll.value || !!search.value.trim() || !!selectedCategory.value);

const filteredProducts = computed(() => {
  if (!hasInteracted.value) return [];
  const q = search.value.trim().toLowerCase();
  return products.value.filter(p => {
    const matchesSearch = !q ||
      p.item_number?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q);
    const matchesCategory = !selectedCategory.value || p.group_code === selectedCategory.value;
    return matchesSearch && matchesCategory;
  });
});

onMounted(async () => {
  try {
    products.value = await fetchProducts(token.value);
  } catch (err) {
    if (err.status === 401) {
      logout();
      router.push({ path: '/login', query: { redirect: '/products' } });
      return;
    }
    error.value = err.message;
  }
});
</script>

<template>
  <section>
    <h1>Products</h1>
    <div class="search-controls">
      <input
        v-model="search"
        type="search"
        placeholder="Search by name, item number, or description…"
        class="search-input"
      />
      <select v-model="selectedCategory" class="category-select">
        <option value="">All categories</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <button type="button" class="show-all-btn" @click="showAll = true">Show All</button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="!hasInteracted">Select a category or search for a product.</p>
    <p v-else-if="products.length === 0">No products available yet.</p>
    <p v-else-if="filteredProducts.length === 0">No products match your search.</p>
    <ul v-else class="product-list">
      <li v-for="product in filteredProducts" :key="product.id" class="product">
        <RouterLink :to="'/products/' + product.id">
          <img v-if="product.images.length" :src="product.images[0]" :alt="product.name" />
          <p>{{ product.description }}</p>
          <p class="price">${{ Number(product.company_price).toFixed(2) }}</p>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
