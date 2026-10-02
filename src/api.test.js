import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, fetchProducts, createProduct, addProductImage, createOrder, fetchOrders, fetchAccount, updateAccount, fetchCustomers, assignSalesperson } from './api.js';

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

  it('createProduct posts JSON with X-Authorization and returns the body', async () => {
    mockFetch(201, { id: 'new-id' });
    const product = { itemNumber: 'A1', name: 'Widget', shippingMethod: 'drop_ship', groupCode: 'WDGT', classNumber: 1, companyPrice: 5, retailPrice: 10 };
    const result = await createProduct('tok', product);
    expect(result).toEqual({ id: 'new-id' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/products');
    expect(options.method).toBe('POST');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
    expect(JSON.parse(options.body)).toEqual(product);
  });

  it('addProductImage posts the file with X-Authorization and returns the body', async () => {
    mockFetch(201, { id: 'img-id', url: 'https://blob.example.com/p1/img.png' });
    const file = new File(['data'], 'img.png', { type: 'image/png' });
    const result = await addProductImage('tok', 'p1', file);
    expect(result).toEqual({ id: 'img-id', url: 'https://blob.example.com/p1/img.png' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/products/p1/images');
    expect(options.method).toBe('POST');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
    expect(options.headers['Content-Type']).toBe('image/png');
    expect(options.body).toBe(file);
  });

  it('createOrder posts items with submit flag and X-Authorization', async () => {
    mockFetch(201, { id: 'order-1', status: 'submitted', createdAt: 't1', submittedAt: 't2' });
    const items = [{ productId: 'p1', quantity: 2 }];
    const result = await createOrder('tok', items);
    expect(result).toEqual({ id: 'order-1', status: 'submitted', createdAt: 't1', submittedAt: 't2' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(options.method).toBe('POST');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
    expect(JSON.parse(options.body)).toEqual({ items, submit: true });
  });

  it('fetchOrders sends the token in X-Authorization and returns the body', async () => {
    mockFetch(200, [{ id: 'o1', status: 'submitted', items: [] }]);
    const result = await fetchOrders('tok');
    expect(result).toHaveLength(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
  });

  it('fetchAccount sends the token in X-Authorization and returns the body', async () => {
    mockFetch(200, { id: 'u1', email: 'a@b.com', role: 'customer' });
    const result = await fetchAccount('tok');
    expect(result).toEqual({ id: 'u1', email: 'a@b.com', role: 'customer' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/account');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
  });

  it('updateAccount PUTs profile JSON with X-Authorization and returns the body', async () => {
    mockFetch(204, {});
    const profile = { fullName: 'Alice', city: 'Denver' };
    await updateAccount('tok', profile);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/account');
    expect(options.method).toBe('PUT');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
    expect(JSON.parse(options.body)).toEqual(profile);
  });

  it('fetchCustomers sends the token in X-Authorization and returns the body', async () => {
    mockFetch(200, { customers: [], salespersons: [] });
    const result = await fetchCustomers('tok');
    expect(result).toEqual({ customers: [], salespersons: [] });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/account/customers');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
  });

  it('assignSalesperson PUTs salespersonId with X-Authorization', async () => {
    mockFetch(204, {});
    await assignSalesperson('tok', 'cust-1', 'sp-1');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/account/customers/cust-1/salesperson');
    expect(options.method).toBe('PUT');
    expect(options.headers['X-Authorization']).toBe('Bearer tok');
    expect(JSON.parse(options.body)).toEqual({ salespersonId: 'sp-1' });
  });
});
