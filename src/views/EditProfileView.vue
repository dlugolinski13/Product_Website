<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchAccount, updateAccount } from '../api';
import { token, logout } from '../auth';

const router = useRouter();
const loading = ref(true);
const error = ref(null);

const fullName = ref('');
const addressLine1 = ref('');
const addressLine2 = ref('');
const city = ref('');
const state = ref('');
const postalCode = ref('');
const country = ref('');
const saving = ref(false);
const saveError = ref(null);
const saveSuccess = ref(false);

onMounted(async () => {
  try {
    const user = await fetchAccount(token.value);
    fullName.value = user.fullName || '';
    addressLine1.value = user.addressLine1 || '';
    addressLine2.value = user.addressLine2 || '';
    city.value = user.city || '';
    state.value = user.state || '';
    postalCode.value = user.postalCode || '';
    country.value = user.country || '';
  } catch (err) {
    if (err.status === 401) {
      logout();
      router.push({ path: '/login', query: { redirect: '/account/edit' } });
    } else {
      error.value = err.message;
    }
  } finally {
    loading.value = false;
  }
});

async function saveProfile() {
  saveError.value = null;
  saveSuccess.value = false;
  saving.value = true;
  try {
    await updateAccount(token.value, {
      fullName: fullName.value,
      addressLine1: addressLine1.value,
      addressLine2: addressLine2.value,
      city: city.value,
      state: state.value,
      postalCode: postalCode.value,
      country: country.value,
    });
    saveSuccess.value = true;
  } catch (err) {
    saveError.value = err.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section>
    <h1>Edit Profile</h1>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <form v-else @submit.prevent="saveProfile" class="profile-form">
      <label>
        Full name
        <input v-model="fullName" type="text" />
      </label>
      <label>
        Address line 1
        <input v-model="addressLine1" type="text" />
      </label>
      <label>
        Address line 2
        <input v-model="addressLine2" type="text" />
      </label>
      <label>
        City
        <input v-model="city" type="text" />
      </label>
      <label>
        State / Province
        <input v-model="state" type="text" />
      </label>
      <label>
        Postal code
        <input v-model="postalCode" type="text" />
      </label>
      <label>
        Country
        <input v-model="country" type="text" />
      </label>
      <button type="submit" :disabled="saving">Save</button>
      <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
      <p v-if="saveSuccess" class="save-success">Saved.</p>
    </form>
    <RouterLink to="/account">Back to account</RouterLink>
  </section>
</template>
