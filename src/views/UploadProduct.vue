<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createProduct, addProductImage } from '../api';
import { token } from '../auth';

const router = useRouter();

const itemNumber = ref('');
const name = ref('');
const shippingMethod = ref('');
const groupCode = ref('');
const classNumber = ref('');
const companyPrice = ref('');
const retailPrice = ref('');
const upc = ref('');
const description = ref('');
const activationDate = ref('');
const packAmount = ref('');
const packUnit = ref('');
const casesPerPack = ref('');
const caseWeight = ref('');
const caseLength = ref('');
const caseWidth = ref('');
const caseHeight = ref('');
const customerComments = ref('');
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
    const body = {
      itemNumber: itemNumber.value,
      name: name.value,
      shippingMethod: shippingMethod.value,
      groupCode: groupCode.value,
      classNumber: Number(classNumber.value),
      companyPrice: Number(companyPrice.value),
      retailPrice: Number(retailPrice.value),
    };
    if (upc.value) body.upc = upc.value;
    if (description.value) body.description = description.value;
    if (activationDate.value) body.activationDate = activationDate.value;
    if (packAmount.value) body.packAmount = Number(packAmount.value);
    if (packUnit.value) body.packUnit = packUnit.value;
    if (casesPerPack.value) body.casesPerPack = Number(casesPerPack.value);
    if (caseWeight.value) body.caseWeight = Number(caseWeight.value);
    if (caseLength.value) body.caseLength = Number(caseLength.value);
    if (caseWidth.value) body.caseWidth = Number(caseWidth.value);
    if (caseHeight.value) body.caseHeight = Number(caseHeight.value);
    if (customerComments.value) body.customerComments = customerComments.value;

    const { id } = await createProduct(token.value, body);
    if (image.value) {
      await addProductImage(token.value, id, image.value);
    }
    router.push('/products');
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
      <label>Item number <input v-model="itemNumber" type="text" required /></label>
      <label>Name <input v-model="name" type="text" required /></label>
      <label>Shipping method
        <select v-model="shippingMethod" required>
          <option value="">Select…</option>
          <option value="drop_ship">Drop ship</option>
          <option value="delivered">Delivered</option>
        </select>
      </label>
      <label>Group code <input v-model="groupCode" type="text" maxlength="4" required /></label>
      <label>Class number <input v-model="classNumber" type="number" step="1" min="0" required /></label>
      <label>Company price <input v-model="companyPrice" type="number" step="0.01" min="0" required /></label>
      <label>Retail price <input v-model="retailPrice" type="number" step="0.01" min="0" required /></label>
      <label>UPC <input v-model="upc" type="text" maxlength="14" /></label>
      <label>Description <textarea v-model="description"></textarea></label>
      <label>Activation date <input v-model="activationDate" type="date" /></label>
      <label>Pack amount <input v-model="packAmount" type="number" step="1" min="0" /></label>
      <label>Pack unit <input v-model="packUnit" type="text" /></label>
      <label>Cases per pack <input v-model="casesPerPack" type="number" step="1" min="0" /></label>
      <label>Case weight (lbs) <input v-model="caseWeight" type="number" step="0.01" min="0" /></label>
      <label>Case length (in) <input v-model="caseLength" type="number" step="0.01" min="0" /></label>
      <label>Case width (in) <input v-model="caseWidth" type="number" step="0.01" min="0" /></label>
      <label>Case height (in) <input v-model="caseHeight" type="number" step="0.01" min="0" /></label>
      <label>Customer comments <textarea v-model="customerComments"></textarea></label>
      <label>Image <input type="file" accept="image/*" @change="handleFile" /></label>
      <button type="submit" class="cta" :disabled="submitting">Upload</button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </form>
  </section>
</template>
