import { ref, computed } from 'vue';

const TOKEN_KEY = 'auth_token';

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Decodes the JWT payload for display only (which email/role to show, which admin-only
// links to render) — the API re-verifies the signature on every request, per CLAUDE.md.
function decodeToken(value) {
  if (!value) return null;
  try {
    const payload = value.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const token = ref(readStoredToken());
export const user = computed(() => decodeToken(token.value));

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
