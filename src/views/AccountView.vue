<script setup>
import { ref, onMounted } from 'vue';
import { fetchProfile } from '../api';
import { token } from '../auth';

const profile = ref(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    profile.value = await fetchProfile(token.value);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <h1>Account</h1>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <template v-else>
      <p><strong>Email:</strong> {{ profile.email }}</p>
      <p><strong>Name:</strong> {{ profile.fullName || '—' }}</p>
      <p><strong>Role:</strong> {{ profile.role }}</p>
    </template>
    <ul class="account-links">
      <li><RouterLink to="/account/edit">Edit profile</RouterLink></li>
      <li><RouterLink to="/orders">Order history</RouterLink></li>
    </ul>
  </section>
</template>
