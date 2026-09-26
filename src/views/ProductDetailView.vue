<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { fetchProducts } from '../api';
import { token, logout } from '../auth';

const router = useRouter();
const route = useRoute();
const product = ref(null);
const error = ref('');

onMounted(async () => {
  try {
    const products = await fetchProducts(token.value);
    product.value = products.find(p => p.id === route.params.id) || null;
    if (!product.value) error.value = 'Product not found.';
  } catch (err) {
    if (err.status === 401) {
      logout();
      router.push({ path: '/login', query: { redirect: route.fullPath } });
      return;
    }
    error.value = err.message;
  }
});
</script>

<template>
  <section>
    <RouterLink to="/products">&larr; Back to products</RouterLink>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <template v-else-if="product">
      <h1>{{ product.name }}</h1>
      <div class="product-images">
        <img
          v-for="(src, i) in product.images"
          :key="i"
          :src="src"
          :alt="product.name"
        />
      </div>
      <dl class="product-detail">
        <dt>Item number</dt><dd>{{ product.item_number }}</dd>
        <template v-if="product.upc">
          <dt>UPC</dt><dd>{{ product.upc }}</dd>
        </template>
        <dt>Description</dt><dd>{{ product.description }}</dd>
        <dt>Price</dt><dd>${{ Number(product.company_price).toFixed(2) }}</dd>
        <dt>Retail price</dt><dd>${{ Number(product.retail_price).toFixed(2) }}</dd>
        <dt>Group</dt><dd>{{ product.group_code }}</dd>
        <dt>Class</dt><dd>{{ product.class_number }}</dd>
        <dt>Shipping method</dt><dd>{{ product.shipping_method }}</dd>
        <template v-if="product.pack_amount">
          <dt>Pack</dt><dd>{{ product.pack_amount }} {{ product.pack_unit }}</dd>
        </template>
        <template v-if="product.cases_per_pack">
          <dt>Cases per pack</dt><dd>{{ product.cases_per_pack }}</dd>
        </template>
        <template v-if="product.case_weight">
          <dt>Case weight</dt><dd>{{ product.case_weight }} lbs</dd>
        </template>
        <template v-if="product.case_length || product.case_width || product.case_height">
          <dt>Case dimensions</dt>
          <dd>{{ product.case_length }} × {{ product.case_width }} × {{ product.case_height }} in</dd>
        </template>
        <template v-if="product.activation_date">
          <dt>Activation date</dt><dd>{{ product.activation_date }}</dd>
        </template>
        <template v-if="product.customer_comments">
          <dt>Notes</dt><dd>{{ product.customer_comments }}</dd>
        </template>
      </dl>
    </template>
    <p v-else>Loading…</p>
  </section>
</template>
