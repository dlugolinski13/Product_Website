import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import LoginView from './LoginView.vue';
import { token } from '../auth';
import { useCartStore } from '../stores/cart';
import { login, fetchSavedCart, discardSavedCart } from '../api';

vi.mock('../api', () => ({
  login: vi.fn(),
  fetchSavedCart: vi.fn(),
  discardSavedCart: vi.fn(),
}));

async function mountAt(path) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', component: LoginView },
      { path: '/create-account', component: { template: '<div />' } },
      { path: '/products', component: { template: '<div />' } },
      { path: '/other', component: { template: '<div />' } },
    ],
  });
  router.push(path);
  await router.isReady();
  const wrapper = mount(LoginView, { global: { plugins: [router, pinia] } });
  return { wrapper, router };
}

async function submit(wrapper) {
  await wrapper.find('input[type="email"]').setValue('a@example.com');
  await wrapper.find('input[type="password"]').setValue('pw');
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

describe('LoginView', () => {
  beforeEach(() => {
    login.mockReset();
    fetchSavedCart.mockReset();
    discardSavedCart.mockReset();
    fetchSavedCart.mockResolvedValue({ items: [] });
    discardSavedCart.mockResolvedValue(undefined);
    token.value = null;
    localStorage.clear();
  });

  it('stores the token and goes to home on success', async () => {
    login.mockResolvedValue({ token: 'tok', role: 'admin' });
    const { wrapper, router } = await mountAt('/login');
    await submit(wrapper);
    expect(login).toHaveBeenCalledWith('a@example.com', 'pw');
    expect(token.value).toBe('tok');
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('honours the redirect query param', async () => {
    login.mockResolvedValue({ token: 'tok' });
    const { wrapper, router } = await mountAt('/login?redirect=/other');
    await submit(wrapper);
    expect(router.currentRoute.value.path).toBe('/other');
  });

  it('shows the error and stays on the page when login fails', async () => {
    login.mockRejectedValue(new Error('Invalid credentials'));
    const { wrapper, router } = await mountAt('/login');
    await submit(wrapper);
    expect(wrapper.find('[role="alert"]').text()).toBe('Invalid credentials');
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('navigates to /create-account with no query when email is empty', async () => {
    const { wrapper, router } = await mountAt('/login');
    await wrapper.find('button.create-account-btn').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/create-account');
    expect(router.currentRoute.value.query.email).toBeUndefined();
  });

  it('navigates to /create-account with email query when email is filled', async () => {
    const { wrapper, router } = await mountAt('/login');
    await wrapper.find('input[type="email"]').setValue('test@example.com');
    await wrapper.find('button.create-account-btn').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/create-account');
    expect(router.currentRoute.value.query.email).toBe('test@example.com');
  });

  it('toggles password visibility when the eye button is clicked', async () => {
    const { wrapper } = await mountAt('/login');
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    await wrapper.find('button[aria-label="Show password"]').trigger('click');
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Hide password"]').exists()).toBe(true);
    await wrapper.find('button[aria-label="Hide password"]').trigger('click');
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Show password"]').exists()).toBe(true);
  });

  it('restores saved cart items on login and deletes them from the server', async () => {
    login.mockResolvedValue({ token: 'tok' });
    const savedProduct = { id: 'p1', name: 'Widget', company_price: 10, item_number: 'W1', retail_price: 15, description: '' };
    fetchSavedCart.mockResolvedValue({ items: [{ product: savedProduct, productId: 'p1', quantity: 2 }] });

    const { wrapper } = await mountAt('/login');
    await submit(wrapper);

    const cart = useCartStore();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].product).toEqual(savedProduct);
    expect(cart.items[0].quantity).toBe(2);
    expect(discardSavedCart).toHaveBeenCalledWith('tok');
  });

  it('does not restore or discard when there are no saved items', async () => {
    login.mockResolvedValue({ token: 'tok' });
    fetchSavedCart.mockResolvedValue({ items: [] });

    const { wrapper } = await mountAt('/login');
    await submit(wrapper);

    const cart = useCartStore();
    expect(cart.items).toHaveLength(0);
    expect(discardSavedCart).not.toHaveBeenCalled();
  });

  it('proceeds to app even when fetchSavedCart fails', async () => {
    login.mockResolvedValue({ token: 'tok' });
    fetchSavedCart.mockRejectedValue(new Error('network error'));

    const { wrapper, router } = await mountAt('/login');
    await submit(wrapper);

    expect(token.value).toBe('tok');
    expect(router.currentRoute.value.path).toBe('/');
  });
});
