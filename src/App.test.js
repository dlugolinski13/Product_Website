import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import App from './App.vue';
import { token } from './auth';
import { clearCart, addToCart } from './cart';

function makeToken(payload) {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64}.signature`;
}

async function mountApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/products', component: { template: '<div>products</div>' } },
      { path: '/products/upload', component: { template: '<div>upload</div>' } },
      { path: '/cart', component: { template: '<div>cart</div>' } },
      { path: '/account', component: { template: '<div>account</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
    ],
  });
  router.push('/');
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router] } });
  return { wrapper, router };
}

describe('App', () => {
  beforeEach(() => {
    token.value = null;
    localStorage.clear();
    clearCart();
  });

  it('shows Home, Products and Log in links when logged out', async () => {
    const { wrapper } = await mountApp();
    const links = wrapper.findAll('nav a').map((a) => a.text());
    expect(links).toEqual(['Home', 'Products', 'Log in']);
    expect(wrapper.find('nav button').exists()).toBe(false);
  });

  it('shows the cart count, account link, user email and sign out for a logged-in customer', async () => {
    token.value = makeToken({ sub: 'u1', role: 'customer', email: 'customer@example.com' });
    addToCart({ id: 'p1', item_number: 'W-1', name: 'Widget', company_price: 10, images: [] }, 2);
    const { wrapper, router } = await mountApp();

    const links = wrapper.findAll('nav a').map((a) => a.text());
    expect(links).toEqual(['Home', 'Products', 'Cart (2)', 'Account']);
    expect(wrapper.find('.user-email').text()).toBe('customer@example.com');

    await wrapper.find('nav button').trigger('click');
    await flushPromises();
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('also shows an Upload Product link for admins', async () => {
    token.value = makeToken({ sub: 'u2', role: 'admin', email: 'admin@example.com' });
    const { wrapper } = await mountApp();
    const links = wrapper.findAll('nav a').map((a) => a.text());
    expect(links).toEqual(['Home', 'Products', 'Upload Product', 'Cart (0)', 'Account']);
  });
});
