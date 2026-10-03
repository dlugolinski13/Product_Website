<script setup>
import { ref, onMounted } from 'vue';
import { fetchProfile, updateProfile } from '../api';
import { token } from '../auth';

const fullName = ref('');
const password = ref('');
const loading = ref(true);
const submitting = ref(false);
const error = ref('');
const success = ref(false);

onMounted(async () => {
  try {
    const profile = await fetchProfile(token.value);
    fullName.value = profile.fullName || '';
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});

async function submit() {
  error.value = '';
  success.value = false;
  submitting.value = true;
  try {
    const updates = { fullName: fullName.value };
    if (password.value) updates.password = password.value;
    await updateProfile(token.value, updates);
    password.value = '';
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
    <h1>Edit profile</h1>
    <p v-if="loading">Loading…</p>
    <form v-else @submit.prevent="submit">
      <label>Full name <input v-model="fullName" type="text" /></label>
      <label>
        New password
        <input v-model="password" type="password" autocomplete="new-password" placeholder="Leave blank to keep current password" />
      </label>
      <button type="submit" :disabled="submitting">Save</button>
      <p v-if="success">Profile updated.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </form>
    <RouterLink to="/account">Back to account</RouterLink>
  </section>
</template>
