import { describe, it, expect, beforeEach } from 'vitest';
import { requireAuth, routes } from './router.js';
import { token } from './auth.js';

function makeToken(payload) {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64}.signature`;
}

describe('router', () => {
  beforeEach(() => {
    token.value = null;
  });

  it('defines home, login, create-account, products, product-detail, cart, upload-product, orders, account and edit-profile routes', () => {
    expect(routes.map((r) => r.path)).toEqual([
      '/',
      '/login',
      '/create-account',
      '/products',
      '/products/:id',
      '/cart',
      '/upload-product',
      '/orders',
      '/account',
      '/account/edit',
    ]);
  });

  it('redirects to login with a redirect target when unauthenticated', () => {
    const result = requireAuth({ meta: { requiresAuth: true }, fullPath: '/products' });
    expect(result).toEqual({ path: '/login', query: { redirect: '/products' } });
  });

  it('allows protected routes when a token exists', () => {
    token.value = 'tok';
    expect(requireAuth({ meta: { requiresAuth: true }, fullPath: '/products' })).toBeUndefined();
  });

  it('allows public routes without a token', () => {
    expect(requireAuth({ meta: {}, fullPath: '/' })).toBeUndefined();
  });

  it('redirects non-admins away from admin-only routes', () => {
    token.value = makeToken({ sub: 'u1', role: 'customer' });
    const result = requireAuth({ meta: { requiresAuth: true, requiresAdmin: true }, fullPath: '/upload-product' });
    expect(result).toEqual({ path: '/products' });
  });

  it('allows admins onto admin-only routes', () => {
    token.value = makeToken({ sub: 'u1', role: 'admin' });
    const result = requireAuth({ meta: { requiresAuth: true, requiresAdmin: true }, fullPath: '/upload-product' });
    expect(result).toBeUndefined();
  });
});
