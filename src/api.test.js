import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  login,
  fetchProducts,
  createOrder,
  fetchOrders,
  fetchProfile,
  updateProfile,
  createProduct,
  uploadProductImage,
} from './api.js';

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

  it('createOrder posts the items with the token in X-Authorization', async () => {
    mockFetch(201, { id: 'o1' });
    const result = await createOrder('tok', [{ productId: 'p1', quantity: 2 }]);
    expect(result).toEqual({ id: 'o1' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(options.method).toBe('POST');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
    expect(JSON.parse(options.body)).toEqual({ items: [{ productId: 'p1', quantity: 2 }] });
  });

  it('fetchOrders sends the token in X-Authorization', async () => {
    mockFetch(200, []);
    await fetchOrders('tok');
    expect(fetch.mock.calls[0][0]).toBe('/api/orders');
    expect(fetch.mock.calls[0][1].headers['X-Authorization']).toBe('Bearer tok');
  });

  it('fetchProfile sends the token in X-Authorization', async () => {
    mockFetch(200, { email: 'a@example.com' });
    const result = await fetchProfile('tok');
    expect(result).toEqual({ email: 'a@example.com' });
    expect(fetch.mock.calls[0][0]).toBe('/api/users/me');
    expect(fetch.mock.calls[0][1].headers['X-Authorization']).toBe('Bearer tok');
  });

  it('updateProfile PATCHes the updates with the token in X-Authorization', async () => {
    mockFetch(200, { updated: true });
    const result = await updateProfile('tok', { fullName: 'Alice' });
    expect(result).toEqual({ updated: true });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/users/me');
    expect(options.method).toBe('PATCH');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
    expect(JSON.parse(options.body)).toEqual({ fullName: 'Alice' });
  });

  it('createProduct posts the product with the token in X-Authorization', async () => {
    mockFetch(201, { id: 'p1' });
    const result = await createProduct('tok', { name: 'Widget' });
    expect(result).toEqual({ id: 'p1' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/products');
    expect(options.method).toBe('POST');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
    expect(JSON.parse(options.body)).toEqual({ name: 'Widget' });
  });

  it('uploadProductImage posts the raw file with its content type', async () => {
    mockFetch(201, { id: 'img1', url: 'https://blob/img1.png' });
    const file = { type: 'image/png' };
    const result = await uploadProductImage('tok', 'p1', file);
    expect(result).toEqual({ id: 'img1', url: 'https://blob/img1.png' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/products/p1/images');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('image/png');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
    expect(options.body).toBe(file);
  });

  it('uploadProductImage falls back to a generic content type when the file has none', async () => {
    mockFetch(201, { id: 'img1' });
    await uploadProductImage('tok', 'p1', {});
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/octet-stream');
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
