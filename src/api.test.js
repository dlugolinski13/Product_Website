import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, fetchProducts } from './api.js';

function mockFetch(status, body) {
  globalThis.fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    },
  }));
}

describe('api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('login posts credentials as JSON and returns the body', async () => {
    mockFetch(200, { token: 't', role: 'admin' });
    const result = await login('a@example.com', 'pw');
    expect(result).toEqual({ token: 't', role: 'admin' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/auth/login');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ email: 'a@example.com', password: 'pw' });
  });

  it('fetchProducts sends the token in X-Authorization', async () => {
    mockFetch(200, []);
    await fetchProducts('tok');
    expect(fetch.mock.calls[0][1].headers['X-Authorization']).toBe('Bearer tok');
  });

  it('throws the server error message with the status', async () => {
    mockFetch(401, { error: 'Invalid credentials' });
    await expect(login('a', 'b')).rejects.toMatchObject({ message: 'Invalid credentials', status: 401 });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    mockFetch(500, undefined);
    await expect(fetchProducts('tok')).rejects.toMatchObject({ message: 'Request failed (500)', status: 500 });
  });
});
