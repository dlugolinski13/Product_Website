import { describe, it, expect, beforeEach } from 'vitest';
import { requireAuth, routes } from './router.js';
import { token } from './auth.js';

describe('router', () => {
  beforeEach(() => {
    token.value = null;
  });

  it('defines home, login, products and product-detail routes', () => {
    expect(routes.map((r) => r.path)).toEqual(['/', '/login', '/products', '/products/:id']);
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
});
