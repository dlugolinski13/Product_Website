import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import CreateAccountView from './CreateAccountView.vue';
import { token } from '../auth';
import { register } from '../api';

vi.mock('../api', () => ({ register: vi.fn() }));

async function mountAt(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', component: { template: '<div />' } },
      { path: '/create-account', component: CreateAccountView },
    ],
  });
  router.push(path);
  await router.isReady();
  const wrapper = mount(CreateAccountView, { global: { plugins: [router] } });
  return { wrapper, router };
}

async function fillAndSubmit(wrapper, { email = 'new@example.com', password = 'secret', confirm = 'secret' } = {}) {
  await wrapper.find('input[type="email"]').setValue(email);
  const passwordInputs = wrapper.findAll('input[type="password"]');
  await passwordInputs[0].setValue(password);
  await passwordInputs[1].setValue(confirm);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

describe('CreateAccountView', () => {
  beforeEach(() => {
    register.mockReset();
    token.value = null;
    localStorage.clear();
  });

  it('pre-fills the email field from the query param', async () => {
    const { wrapper } = await mountAt('/create-account?email=prefilled@example.com');
    expect(wrapper.find('input[type="email"]').element.value).toBe('prefilled@example.com');
  });

  it('leaves email empty when no query param', async () => {
    const { wrapper } = await mountAt('/create-account');
    expect(wrapper.find('input[type="email"]').element.value).toBe('');
  });

  it('stores the token and goes home on successful registration', async () => {
    register.mockResolvedValue({ token: 'new-tok', role: 'customer' });
    const { wrapper, router } = await mountAt('/create-account');
    await fillAndSubmit(wrapper);
    expect(register).toHaveBeenCalledWith('new@example.com', 'secret');
    expect(token.value).toBe('new-tok');
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('shows an error when passwords do not match', async () => {
    const { wrapper } = await mountAt('/create-account');
    await fillAndSubmit(wrapper, { password: 'abc', confirm: 'xyz' });
    expect(wrapper.find('[role="alert"]').text()).toBe('Passwords do not match');
    expect(register).not.toHaveBeenCalled();
  });

  it('shows error and stays on page when register fails', async () => {
    register.mockRejectedValue(new Error('An account with this email already exists'));
    const { wrapper, router } = await mountAt('/create-account');
    await fillAndSubmit(wrapper);
    expect(wrapper.find('[role="alert"]').text()).toBe('An account with this email already exists');
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/create-account');
  });

  it('has a link back to the login page', async () => {
    const { wrapper } = await mountAt('/create-account');
    const link = wrapper.find('a[href*="login"]');
    expect(link.exists()).toBe(true);
  });

  it('toggles password visibility when the eye button is clicked', async () => {
    const { wrapper } = await mountAt('/create-account');
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    await wrapper.find('button[aria-label="Show password"]').trigger('click');
    const textInputs = wrapper.findAll('input[type="text"]');
    expect(textInputs.length).toBe(2);
    expect(wrapper.find('button[aria-label="Hide password"]').exists()).toBe(true);
  });
});
