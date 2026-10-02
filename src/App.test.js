import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import App from './App.vue';
import { token } from './auth';
import { useCartStore } from './stores/cart';

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
      { path: '/orders', component: { template: '<div>orders</div>' } },
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
  });

  it('shows Home, Products, cart icon and Log in links when logged out', async () => {
    const { wrapper } = await mountApp();
    const links = wrapper.findAll('nav a');
    const texts = links.map((a) => a.text());
    expect(texts).toContain('Home');
    expect(texts).toContain('Products');
    expect(texts).toContain('Log in');
    expect(wrapper.find('.cart-link').exists()).toBe(true);
    expect(wrapper.find('nav button').exists()).toBe(false);
  });

  it('shows Log out when logged in and returns to login after clicking it', async () => {
    token.value = 'tok';
    const { wrapper, router } = await mountApp();
    await wrapper.find('nav button').trigger('click');
    await flushPromises();
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
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
});
