import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import LoginView from './LoginView.vue';
import { token } from '../auth';
import { login } from '../api';

vi.mock('../api', () => ({ login: vi.fn() }));

async function mountAt(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/products', component: { template: '<div />' } },
      { path: '/other', component: { template: '<div />' } },
    ],
  });
  router.push(path);
  await router.isReady();
  const wrapper = mount(LoginView, { global: { plugins: [router] } });
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
    token.value = null;
    localStorage.clear();
  });

  it('stores the token and goes to products on success', async () => {
    login.mockResolvedValue({ token: 'tok', role: 'admin' });
    const { wrapper, router } = await mountAt('/login');
    await submit(wrapper);
    expect(login).toHaveBeenCalledWith('a@example.com', 'pw');
    expect(token.value).toBe('tok');
    expect(router.currentRoute.value.path).toBe('/products');
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
});
