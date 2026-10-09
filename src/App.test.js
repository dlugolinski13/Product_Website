import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import App from './App.vue';
import { token } from './auth';
import { useCartStore } from './stores/cart';
import { saveCart, discardSavedCart } from './api';

vi.mock('./api', () => ({
  saveCart: vi.fn().mockResolvedValue(undefined),
  discardSavedCart: vi.fn().mockResolvedValue(undefined),
}));

function makeToken(payload) {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64}.signature`;
}

async function mountApp() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/products', component: { template: '<div>products</div>' } },
      { path: '/cart', component: { template: '<div>cart</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/upload-product', component: { template: '<div>upload</div>' } },
      { path: '/account', component: { template: '<div>account</div>' } },
      { path: '/admin', component: { template: '<div>admin</div>' } },
    ],
  });
  router.push('/');
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router, pinia] } });
  return { wrapper, router };
}

describe('App', () => {
  beforeEach(() => {
    token.value = null;
    localStorage.clear();
    saveCart.mockReset();
    discardSavedCart.mockReset();
    saveCart.mockResolvedValue(undefined);
    discardSavedCart.mockResolvedValue(undefined);
  });

  it('shows Home, Products, cart icon and Log in links when logged out', async () => {
    const { wrapper } = await mountApp();
    const links = wrapper.findAll('nav a');
    const texts = links.map((a) => a.text());
    expect(texts).toContain('Home');
    expect(texts).toContain('Products');
    expect(texts).toContain('Log in');
    expect(texts).not.toContain('Order History');
    expect(texts).not.toContain('Account');
    expect(wrapper.find('.cart-link').exists()).toBe(true);
    expect(wrapper.find('nav button').exists()).toBe(false);
  });

  it('shows the Account link, user email and Sign out for a logged-in customer, and no Upload Product link', async () => {
    token.value = makeToken({ sub: 'u1', role: 'customer', email: 'customer@example.com' });
    const { wrapper, router } = await mountApp();

    const texts = wrapper.findAll('nav a').map((a) => a.text());
    expect(texts).toContain('Account');
    expect(texts).not.toContain('Upload Product');
    expect(texts).not.toContain('Order History');
    expect(wrapper.find('.user-email').text()).toBe('customer@example.com');

    await wrapper.find('nav button').trigger('click');
    await flushPromises();
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('also shows an Upload Product link and Admin link for admins', async () => {
    token.value = makeToken({ sub: 'u2', role: 'admin', email: 'admin@example.com' });
    const { wrapper } = await mountApp();
    const texts = wrapper.findAll('nav a').map((a) => a.text());
    expect(texts).toContain('Upload Product');
    expect(texts).toContain('Admin');
  });

  it('shows Admin link for salespeople but not Upload Product', async () => {
    token.value = makeToken({ sub: 'u3', role: 'salesperson', email: 'sp@example.com' });
    const { wrapper } = await mountApp();
    const texts = wrapper.findAll('nav a').map((a) => a.text());
    expect(texts).toContain('Admin');
    expect(texts).not.toContain('Upload Product');
  });

  it('shows no badge when cart is empty', async () => {
    const { wrapper } = await mountApp();
    expect(wrapper.find('.cart-badge').exists()).toBe(false);
  });

  it('shows badge with item count when cart has items', async () => {
    const { wrapper } = await mountApp();
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'Widget', company_price: 10 });
    await nextTick();
    expect(wrapper.find('.cart-badge').text()).toBe('1');
    cart.addItem({ id: '2', name: 'Gadget', company_price: 5 });
    await nextTick();
    expect(wrapper.find('.cart-badge').text()).toBe('2');
  });

  it('shows save-cart modal instead of logging out when cart has items', async () => {
    token.value = makeToken({ sub: 'u1', role: 'customer', email: 'customer@example.com' });
    const { wrapper } = await mountApp();
    const cart = useCartStore();
    cart.addItem({ id: 'p1', name: 'Widget', company_price: 10 });
    await nextTick();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    await wrapper.find('nav button').trigger('click');
    await nextTick();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    expect(wrapper.find('[role="dialog"]').text()).toContain('Save cart for next login?');
    expect(token.value).not.toBeNull();
  });

  it('saves cart items, clears cart and logs out when Save is clicked', async () => {
    token.value = makeToken({ sub: 'u1', role: 'customer', email: 'customer@example.com' });
    const { wrapper, router } = await mountApp();
    const cart = useCartStore();
    cart.addItem({ id: 'p1', name: 'Widget', company_price: 10 });
    await nextTick();

    await wrapper.find('nav button').trigger('click');
    await nextTick();

    const modalButtons = wrapper.find('[role="dialog"]').findAll('button');
    const saveButton = modalButtons.find((b) => b.text() === 'Save');
    await saveButton.trigger('click');
    await flushPromises();

    expect(saveCart).toHaveBeenCalledWith(expect.any(String), [{ productId: 'p1', quantity: 1 }]);
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(cart.itemCount).toBe(0);
  });

  it('discards cart items, clears cart and logs out when Discard is clicked', async () => {
    token.value = makeToken({ sub: 'u1', role: 'customer', email: 'customer@example.com' });
    const { wrapper, router } = await mountApp();
    const cart = useCartStore();
    cart.addItem({ id: 'p1', name: 'Widget', company_price: 10 });
    await nextTick();

    await wrapper.find('nav button').trigger('click');
    await nextTick();

    const modalButtons = wrapper.find('[role="dialog"]').findAll('button');
    const discardButton = modalButtons.find((b) => b.text() === 'Discard');
    await discardButton.trigger('click');
    await flushPromises();

    expect(discardSavedCart).toHaveBeenCalledWith(expect.any(String));
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(cart.itemCount).toBe(0);
  });

  it('logs out without showing modal when cart is empty', async () => {
    token.value = makeToken({ sub: 'u1', role: 'customer', email: 'customer@example.com' });
    const { wrapper, router } = await mountApp();

    await wrapper.find('nav button').trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(saveCart).not.toHaveBeenCalled();
    expect(discardSavedCart).not.toHaveBeenCalled();
  });
});
