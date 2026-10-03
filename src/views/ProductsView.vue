<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchProducts } from '../api';
import { token, logout } from '../auth';
import { addToCart } from '../cart';

const router = useRouter();
const products = ref([]);
const loading = ref(true);
const error = ref('');
const quantities = reactive({});
const added = reactive({});
const zoomedImage = ref(null);

onMounted(async () => {
  try {
    products.value = await fetchProducts(token.value);
    for (const product of products.value) {
      quantities[product.id] = 1;
    }
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

function handleAddToCart(product) {
  addToCart(product, Number(quantities[product.id]) || 1);
  added[product.id] = true;
}

function openZoom(url) {
  zoomedImage.value = url;
}

function closeZoom() {
  zoomedImage.value = null;
}
</script>

<template>
  <section>
    <h1>Products</h1>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="products.length === 0">No products available yet.</p>
    <ul v-else class="product-list">
      <li v-for="product in products" :key="product.id" class="product">
        <img
          v-if="product.images.length"
          :src="product.images[0]"
          :alt="product.name"
          class="product-thumb"
          @click="openZoom(product.images[0])"
        />
        <div>
          <h2>{{ product.name }}</h2>
          <p class="item-number">{{ product.item_number }}</p>
          <p>{{ product.description }}</p>
          <p class="price">${{ Number(product.company_price).toFixed(2) }}</p>
          <div class="add-to-cart">
            <label>
              Qty
              <input type="number" min="1" class="quantity" v-model.number="quantities[product.id]" />
            </label>
            <button type="button" @click="handleAddToCart(product)">Add to cart</button>
            <span v-if="added[product.id]" class="added-confirmation">Added!</span>
          </div>
        </div>
      </li>
    </ul>
    <div v-if="zoomedImage" class="image-zoom-overlay" @click="closeZoom">
      <img :src="zoomedImage" alt="Zoomed product" />
    </div>
  </section>
</template>
