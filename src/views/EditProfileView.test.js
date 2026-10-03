import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import EditProfileView from './EditProfileView.vue';
import { token } from '../auth';
import { fetchAccount, updateAccount } from '../api';

vi.mock('../api', () => ({ fetchAccount: vi.fn(), updateAccount: vi.fn() }));

const customerUser = {
  id: 'u1', email: 'alice@x.com', fullName: 'Alice', role: 'customer',
  addressLine1: '1 Main St', addressLine2: null, city: 'Denver',
  state: 'CO', postalCode: '80201', country: 'US',
};

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/account/edit', component: EditProfileView },
      { path: '/account', component: { template: '<div />' } },
      { path: '/login', component: { template: '<div />' } },
    ],
  });
  router.push('/account/edit');
  await router.isReady();
  const wrapper = mount(EditProfileView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe('EditProfileView', () => {
  beforeEach(() => {
    fetchAccount.mockReset();
    updateAccount.mockReset();
    token.value = 'tok';
  });

  it('shows loading before the fetch resolves', () => {
    fetchAccount.mockReturnValue(new Promise(() => {}));
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/account/edit', component: EditProfileView }],
    });
    const wrapper = mount(EditProfileView, { global: { plugins: [router] } });
    expect(wrapper.text()).toContain('Loading');
  });

  it('calls fetchAccount with the current token', async () => {
    fetchAccount.mockResolvedValue(customerUser);
    await mountView();
    expect(fetchAccount).toHaveBeenCalledWith('tok');
  });

  it('shows error on non-auth failure', async () => {
    fetchAccount.mockRejectedValue(Object.assign(new Error('server error'), { status: 500 }));
    const { wrapper } = await mountView();
    expect(wrapper.find('[role="alert"]').text()).toBe('server error');
  });

  it('logs out and redirects to login on 401', async () => {
    fetchAccount.mockRejectedValue(Object.assign(new Error('nope'), { status: 401 }));
    const { router } = await mountView();
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBe('/account/edit');
  });

  it('renders the profile form with pre-filled values', async () => {
    fetchAccount.mockResolvedValue(customerUser);
    const { wrapper } = await mountView();
    expect(wrapper.find('input[type="text"]').element.value).toBe('Alice');
  });

  it('falls back to empty fields when the account has none on file', async () => {
    fetchAccount.mockResolvedValue({ id: 'u1', email: 'a@x.com', fullName: null, role: 'customer' });
    const { wrapper } = await mountView();
    const inputs = wrapper.findAll('.profile-form input[type="text"]');
    for (const input of inputs) {
      expect(input.element.value).toBe('');
    }
  });

  it('v-model inputs are reactive and submit updated values', async () => {
    updateAccount.mockResolvedValue(undefined);
    fetchAccount.mockResolvedValue({ ...customerUser, fullName: '' });
    const { wrapper } = await mountView();
    const inputs = wrapper.findAll('.profile-form input[type="text"]');
    for (const input of inputs) {
      await input.setValue('updated');
    }
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(updateAccount).toHaveBeenCalledWith('tok', expect.objectContaining({ fullName: 'updated', city: 'updated' }));
  });

  it('saves profile and shows success message', async () => {
    fetchAccount.mockResolvedValue(customerUser);
    updateAccount.mockResolvedValue(undefined);
    const { wrapper } = await mountView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(updateAccount).toHaveBeenCalledWith('tok', expect.objectContaining({ fullName: 'Alice', city: 'Denver' }));
    expect(wrapper.find('.save-success').exists()).toBe(true);
  });

  it('shows save error when update fails', async () => {
    fetchAccount.mockResolvedValue(customerUser);
    updateAccount.mockRejectedValue(Object.assign(new Error('save failed'), { status: 500 }));
    const { wrapper } = await mountView();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('save failed');
  });

  it('links back to the account page', async () => {
    fetchAccount.mockResolvedValue(customerUser);
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain('Back to account');
  });
});
