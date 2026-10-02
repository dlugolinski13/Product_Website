import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import AccountView from './AccountView.vue';
import { token } from '../auth';
import { fetchAccount, updateAccount, fetchCustomers, assignSalesperson } from '../api';

vi.mock('../api', () => ({
  fetchAccount: vi.fn(),
  updateAccount: vi.fn(),
  fetchCustomers: vi.fn(),
  assignSalesperson: vi.fn(),
}));

const customerUser = {
  id: 'u1', email: 'alice@x.com', fullName: 'Alice', role: 'customer',
  addressLine1: '1 Main St', addressLine2: null, city: 'Denver',
  state: 'CO', postalCode: '80201', country: 'US',
  salesperson: { id: 'sp1', fullName: 'Bob', email: 'bob@co.com' },
};

const salespersonUser = {
  id: 'sp1', email: 'bob@co.com', fullName: 'Bob', role: 'salesperson',
  addressLine1: null, addressLine2: null, city: null,
  state: null, postalCode: null, country: null,
  salesperson: null,
};

async function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/account', component: AccountView },
      { path: '/login', component: { template: '<div />' } },
    ],
  });
  router.push('/account');
  await router.isReady();
  const wrapper = mount(AccountView, { global: { plugins: [router, pinia] } });
  await flushPromises();
  return { wrapper, router };
}

describe('AccountView', () => {
  beforeEach(() => {
    fetchAccount.mockReset();
    updateAccount.mockReset();
    fetchCustomers.mockReset();
    assignSalesperson.mockReset();
    token.value = 'tok';
  });

  it('shows loading before the fetch resolves', () => {
    fetchAccount.mockReturnValue(new Promise(() => {}));
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/account', component: AccountView }],
    });
    const wrapper = mount(AccountView, { global: { plugins: [router, pinia] } });
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
    expect(router.currentRoute.value.query.redirect).toBe('/account');
  });

  describe('profile form', () => {
    it('renders the profile form with pre-filled values', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-email').text()).toBe('alice@x.com');
      expect(wrapper.find('input[type="text"]').element.value).toBe('Alice');
    });

    it('v-model inputs are reactive and submit updated values', async () => {
      fetchAccount.mockResolvedValue({ ...customerUser, fullName: '' });
      updateAccount.mockResolvedValue(undefined);
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
  });

  describe('customer role', () => {
    it('shows assigned salesperson', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-salesperson').exists()).toBe(true);
      expect(wrapper.find('.account-salesperson').text()).toContain('Bob');
    });

    it('shows no-salesperson message when unassigned', async () => {
      fetchAccount.mockResolvedValue({ ...customerUser, salesperson: null });
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-salesperson').text()).toContain('No salesperson assigned.');
    });

    it('does not show customer management section', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-customers').exists()).toBe(false);
    });
  });

  describe('salesperson role', () => {
    beforeEach(() => {
      fetchCustomers.mockResolvedValue({
        customers: [
          { id: 'c1', email: 'carol@x.com', fullName: 'Carol', salesperson: { id: 'sp1', fullName: 'Bob', email: 'bob@co.com' } },
          { id: 'c2', email: 'dave@x.com', fullName: 'Dave', salesperson: null },
        ],
        salespersons: [
          { id: 'sp1', email: 'bob@co.com', fullName: 'Bob' },
        ],
      });
    });

    it('does not show assigned-salesperson section', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-salesperson').exists()).toBe(false);
    });

    it('loads and shows the customer management section', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-customers').exists()).toBe(true);
      const rows = wrapper.findAll('.customer-row');
      expect(rows).toHaveLength(2);
      expect(rows[0].text()).toContain('Carol');
      expect(rows[1].text()).toContain('Dave');
    });

    it('shows salesperson dropdown with correct selected value', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      const { wrapper } = await mountView();
      const selects = wrapper.findAll('.salesperson-select');
      expect(selects[0].element.value).toBe('sp1');
      expect(selects[1].element.value).toBe('');
    });

    it('calls assignSalesperson when dropdown changes and updates local state', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      assignSalesperson.mockResolvedValue(undefined);
      const { wrapper } = await mountView();
      const selects = wrapper.findAll('.salesperson-select');
      await selects[1].setValue('sp1');
      await flushPromises();
      expect(assignSalesperson).toHaveBeenCalledWith('tok', 'c2', 'sp1');
    });

    it('calls assignSalesperson with null when unassigning', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      assignSalesperson.mockResolvedValue(undefined);
      const { wrapper } = await mountView();
      const selects = wrapper.findAll('.salesperson-select');
      await selects[0].setValue('');
      await flushPromises();
      expect(assignSalesperson).toHaveBeenCalledWith('tok', 'c1', null);
    });

    it('shows error when assigning fails', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      assignSalesperson.mockRejectedValue(Object.assign(new Error('assign failed'), { status: 500 }));
      const { wrapper } = await mountView();
      const selects = wrapper.findAll('.salesperson-select');
      await selects[0].setValue('');
      await flushPromises();
      expect(wrapper.find('.account-customers [role="alert"]').text()).toBe('assign failed');
    });

    it('shows error when customer list fails to load', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      fetchCustomers.mockRejectedValue(Object.assign(new Error('list failed'), { status: 500 }));
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-customers [role="alert"]').text()).toBe('list failed');
    });

    it('shows empty state when no customers', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      fetchCustomers.mockResolvedValue({ customers: [], salespersons: [] });
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-customers').text()).toContain('No customers found.');
    });
  });
});
