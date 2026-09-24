import { ref } from 'vue';

const TOKEN_KEY = 'auth_token';

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const token = ref(readStoredToken());

export function setToken(value) {
  token.value = value;
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode etc.) — token still lives in memory for this session
  }
}

export function logout() {
  setToken(null);
}
