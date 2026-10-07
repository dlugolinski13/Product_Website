import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import EditProfileView from './EditProfileView.vue';
import { token } from '../auth';
import { fetchAccount, updateAccount, changePassword } from '../api';

vi.mock('../api', () => ({ fetchAccount: vi.fn(), updateAccount: vi.fn(), changePassword: vi.fn() }));

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
    changePassword.mockReset();
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

  describe('Change Password', () => {
    it('renders the change password form', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.password-form').exists()).toBe(true);
      expect(wrapper.text()).toContain('Change Password');
    });

    it('calls changePassword with correct args on submit', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      changePassword.mockResolvedValue(undefined);
      const { wrapper } = await mountView();
      const form = wrapper.find('.password-form');
      const inputs = form.findAll('input[type="password"]');
      await inputs[0].setValue('oldpass1');
      await inputs[1].setValue('newpass123');
      await inputs[2].setValue('newpass123');
      await form.trigger('submit');
      await flushPromises();
      expect(changePassword).toHaveBeenCalledWith('tok', 'oldpass1', 'newpass123');
    });

    it('shows success message after password change', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      changePassword.mockResolvedValue(undefined);
      const { wrapper } = await mountView();
      const form = wrapper.find('.password-form');
      const inputs = form.findAll('input[type="password"]');
      await inputs[0].setValue('oldpass1');
      await inputs[1].setValue('newpass123');
      await inputs[2].setValue('newpass123');
      await form.trigger('submit');
      await flushPromises();
      expect(wrapper.find('.password-success').exists()).toBe(true);
    });

    it('shows error when new passwords do not match', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      const { wrapper } = await mountView();
      const form = wrapper.find('.password-form');
      const inputs = form.findAll('input[type="password"]');
      await inputs[0].setValue('oldpass1');
      await inputs[1].setValue('newpass123');
      await inputs[2].setValue('different');
      await form.trigger('submit');
      await flushPromises();
      expect(changePassword).not.toHaveBeenCalled();
      const alert = form.find('[role="alert"]');
      expect(alert.text()).toContain('do not match');
    });

    it('shows error when changePassword API fails', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      changePassword.mockRejectedValue(Object.assign(new Error('Current password is incorrect'), { status: 401 }));
      const { wrapper } = await mountView();
      const form = wrapper.find('.password-form');
      const inputs = form.findAll('input[type="password"]');
      await inputs[0].setValue('wrongpass');
      await inputs[1].setValue('newpass123');
      await inputs[2].setValue('newpass123');
      await form.trigger('submit');
      await flushPromises();
      expect(form.find('[role="alert"]').text()).toBe('Current password is incorrect');
    });

    it('clears password fields after successful change', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      changePassword.mockResolvedValue(undefined);
      const { wrapper } = await mountView();
      const form = wrapper.find('.password-form');
      const inputs = form.findAll('input[type="password"]');
      await inputs[0].setValue('oldpass1');
      await inputs[1].setValue('newpass123');
      await inputs[2].setValue('newpass123');
      await form.trigger('submit');
      await flushPromises();
      for (const input of form.findAll('input[type="password"]')) {
        expect(input.element.value).toBe('');
      }
    });
  });
});
