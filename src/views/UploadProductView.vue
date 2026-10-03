<script setup>
import { reactive, ref } from 'vue';
import { createProduct, uploadProductImage } from '../api';
import { token } from '../auth';

const form = reactive({
  itemNumber: '',
  name: '',
  description: '',
  shippingMethod: 'drop_ship',
  groupCode: '',
  classNumber: '',
  companyPrice: '',
  retailPrice: '',
});
const imageFile = ref(null);
const submitting = ref(false);
const error = ref('');
const success = ref(false);

function handleFileChange(event) {
  imageFile.value = event.target.files[0] || null;
}

async function submit() {
  error.value = '';
  submitting.value = true;
  try {
    const product = await createProduct(token.value, {
      ...form,
      classNumber: Number(form.classNumber),
      companyPrice: Number(form.companyPrice),
      retailPrice: Number(form.retailPrice),
    });
    if (imageFile.value) {
      await uploadProductImage(token.value, product.id, imageFile.value);
    }
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
    <h1>Upload product</h1>
    <p v-if="success">Product created.</p>
    <form v-else @submit.prevent="submit">
      <label>Item number <input v-model="form.itemNumber" required /></label>
      <label>Name <input v-model="form.name" required /></label>
      <label>Description <textarea v-model="form.description"></textarea></label>
      <label>
        Shipping method
        <select v-model="form.shippingMethod">
          <option value="drop_ship">Drop ship</option>
          <option value="delivered">Delivered</option>
        </select>
      </label>
      <label>Group code <input v-model="form.groupCode" maxlength="4" required /></label>
      <label>Class number <input v-model="form.classNumber" type="number" required /></label>
      <label>Company price <input v-model="form.companyPrice" type="number" step="0.01" required /></label>
      <label>Retail price <input v-model="form.retailPrice" type="number" step="0.01" required /></label>
      <label>Image <input type="file" accept="image/*" @change="handleFileChange" /></label>
      <button type="submit" :disabled="submitting">Create product</button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </form>
  </section>
</template>
