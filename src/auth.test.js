import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function makeToken(payload) {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64}.signature`;
}

describe('auth', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with no token when nothing is stored', async () => {
    const { token } = await import('./auth.js');
    expect(token.value).toBeNull();
  });

  it('restores a stored token on load', async () => {
    localStorage.setItem('auth_token', 'abc');
    const { token } = await import('./auth.js');
    expect(token.value).toBe('abc');
  });

  it('setToken updates the ref and storage, logout clears both', async () => {
    const { token, setToken, logout } = await import('./auth.js');
    setToken('xyz');
    expect(token.value).toBe('xyz');
    expect(localStorage.getItem('auth_token')).toBe('xyz');
    logout();
    expect(token.value).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('still works in memory when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { token, setToken } = await import('./auth.js');
    expect(token.value).toBeNull();
    setToken('mem');
    expect(token.value).toBe('mem');
  });

  it('user is null when there is no token', async () => {
    const { user } = await import('./auth.js');
    expect(user.value).toBeNull();
  });

  it('user decodes the token payload', async () => {
    const { token, user } = await import('./auth.js');
    token.value = makeToken({ sub: 'u1', role: 'admin', email: 'a@example.com' });
    expect(user.value).toEqual({ sub: 'u1', role: 'admin', email: 'a@example.com' });
  });

  it('user is null for a malformed token', async () => {
    const { token, user } = await import('./auth.js');
    token.value = 'not-a-jwt';
    expect(user.value).toBeNull();
  });
});
