<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { login } from '../api';
import { setToken } from '../auth';

const router = useRouter();
const route = useRoute();
const email = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);

async function submit() {
  error.value = '';
  submitting.value = true;
  try {
    const result = await login(email.value, password.value);
    setToken(result.token);
    router.push(route.query.redirect || '/products');
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section>
    <h1>Log in</h1>
    <form @submit.prevent="submit">
      <label>Email <input v-model="email" type="email" autocomplete="username" required /></label>
      <label>Password <input v-model="password" type="password" autocomplete="current-password" required /></label>
      <button type="submit" :disabled="submitting">Log in</button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </form>
  </section>
</template>
