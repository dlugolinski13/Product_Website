<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { register } from '../api';
import { setToken } from '../auth';

const router = useRouter();
const route = useRoute();
const email = ref(route.query.email || '');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const error = ref('');
const submitting = ref(false);

async function submit() {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }
  error.value = '';
  submitting.value = true;
  try {
    const result = await register(email.value, password.value);
    setToken(result.token);
    router.push('/');
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section>
    <h1>Create Account</h1>
    <form @submit.prevent="submit">
      <label>Email <input v-model="email" type="email" autocomplete="username" required /></label>
      <label>Password
        <span class="password-field">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required />
          <button
            type="button"
            class="toggle-password"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </span>
      </label>
      <label>Confirm password <input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required /></label>
      <button type="submit" :disabled="submitting">Create Account</button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </form>
    <p class="login-link"><RouterLink to="/login">Already have an account? Log in</RouterLink></p>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

form {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 420px;
  gap: 1rem;
}

label {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1.1rem;
  box-sizing: border-box;
}

.password-field {
  display: flex;
  align-items: center;
}

.password-field input {
  flex: 1;
}

button[type="submit"] {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1.1rem;
}

.login-link {
  margin-top: 1rem;
}
</style>
