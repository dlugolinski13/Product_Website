<script setup>
import { ref } from 'vue';

const name = ref('');
const price = ref('');
const image = ref(null);
const error = ref('');
const submitting = ref(false);

function handleFile(event) {
  image.value = event.target.files[0] || null;
}

async function submit() {
  error.value = '';
  submitting.value = true;
  try {
    // upload API call goes here
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section>
    <h1>Upload Product</h1>
    <form @submit.prevent="submit">
      <label>Name <input v-model="name" type="text" required /></label>
      <label>Price <input v-model="price" type="number" step="0.01" min="0" required /></label>
      <label>Image <input type="file" accept="image/*" @change="handleFile" /></label>
      <button type="submit" :disabled="submitting">Upload</button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </form>
  </section>
</template>
