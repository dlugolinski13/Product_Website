import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import AccountView from './AccountView.vue';
import { token } from '../auth';
import { fetchAccount, fetchCustomers, assignSalesperson, removeCustomer } from '../api';

vi.mock('../api', () => ({
  fetchAccount: vi.fn(),
  fetchCustomers: vi.fn(),
  assignSalesperson: vi.fn(),
  removeCustomer: vi.fn(),
}));

const customerUser = {
  id: 'u1', email: 'alice@x.com', fullName: 'Alice', role: 'customer',
  addressLine1: '1 Main St', addressLine2: null, city: 'Denver',
  state: 'CO', postalCode: '80201', country: 'US',
  salespersons: [{ id: 'sp1', fullName: 'Bob', email: 'bob@co.com' }],
};

const salespersonUser = {
  id: 'sp1', email: 'bob@co.com', fullName: 'Bob', role: 'salesperson',
  addressLine1: null, addressLine2: null, city: null,
  state: null, postalCode: null, country: null,
  salespersons: [],
};

async function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/account', component: AccountView },
      { path: '/account/edit', component: { template: '<div />' } },
      { path: '/orders', component: { template: '<div />' } },
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
    fetchCustomers.mockReset();
    assignSalesperson.mockReset();
    removeCustomer.mockReset();
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

  describe('profile summary', () => {
    it('shows the email, name and address, and links to edit profile and order history', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-email').text()).toBe('alice@x.com (customer)');
      expect(wrapper.find('.account-role').text()).toBe('(customer)');
      expect(wrapper.find('.account-name').text()).toBe('Alice');
      expect(wrapper.find('.account-address').text()).toContain('1 Main St');
      expect(wrapper.find('.account-address').text()).toContain('Denver, CO, 80201');
      expect(wrapper.text()).toContain('Edit profile');
      expect(wrapper.text()).toContain('Order history');
    });

    it('shows a placeholder when there is no name on file', async () => {
      fetchAccount.mockResolvedValue({ ...customerUser, fullName: null });
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-name').text()).toBe('No name on file');
    });

    it('does not render an address block when there is no address on file', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-address').exists()).toBe(false);
    });

    it('shows the salesperson role in parentheses next to the email', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-email').text()).toBe('bob@co.com (salesperson)');
    });

    it('includes address line 2 and omits the country when there is none', async () => {
      fetchAccount.mockResolvedValue({ ...customerUser, addressLine2: 'Suite 2', country: null });
      const { wrapper } = await mountView();
      const text = wrapper.find('.account-address').text();
      expect(text).toContain('Suite 2');
      expect(text).not.toContain('US');
    });

    it('does not render an editable form directly on the account page', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('form').exists()).toBe(false);
    });
  });

  describe('customer role', () => {
    it('shows assigned salespersons', async () => {
      fetchAccount.mockResolvedValue(customerUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-salesperson').exists()).toBe(true);
      expect(wrapper.find('.account-salesperson').text()).toContain('Bob');
    });

    it('shows no-salesperson message when unassigned', async () => {
      fetchAccount.mockResolvedValue({ ...customerUser, salespersons: [] });
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
          { id: 'c1', email: 'carol@x.com', fullName: 'Carol' },
          { id: 'c2', email: 'dave@x.com', fullName: 'Dave' },
        ],
        availableCustomers: [
          { id: 'c3', email: 'eve@x.com', fullName: 'Eve' },
        ],
      });
    });

    it('does not show assigned-salesperson section', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-salesperson').exists()).toBe(false);
    });

    it('loads and shows the customer management section with assigned customers', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-customers').exists()).toBe(true);
      const rows = wrapper.findAll('.customer-row');
      expect(rows).toHaveLength(2);
      expect(rows[0].text()).toContain('Carol');
      expect(rows[1].text()).toContain('Dave');
    });

    it('shows a remove button for each assigned customer', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      const { wrapper } = await mountView();
      const removeBtns = wrapper.findAll('.remove-btn');
      expect(removeBtns).toHaveLength(2);
    });

    it('shows available customers in the add-customer dropdown', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      const { wrapper } = await mountView();
      const select = wrapper.find('.customer-add-select');
      expect(select.exists()).toBe(true);
      expect(select.text()).toContain('Eve');
    });

    it('calls assignSalesperson and updates local state when add is clicked', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      assignSalesperson.mockResolvedValue(undefined);
      const { wrapper } = await mountView();
      const select = wrapper.find('.customer-add-select');
      await select.setValue('c3');
      await wrapper.find('.add-btn').trigger('click');
      await flushPromises();
      expect(assignSalesperson).toHaveBeenCalledWith('tok', 'c3');
      expect(wrapper.findAll('.customer-row')).toHaveLength(3);
      const options = wrapper.find('.customer-add-select').findAll('option');
      const values = options.map(o => o.element.value);
      expect(values).not.toContain('c3');
    });

    it('calls removeCustomer and updates local state when remove is clicked', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      removeCustomer.mockResolvedValue(undefined);
      const { wrapper } = await mountView();
      const firstRemoveBtn = wrapper.findAll('.remove-btn')[0];
      await firstRemoveBtn.trigger('click');
      await flushPromises();
      expect(removeCustomer).toHaveBeenCalledWith('tok', 'c1');
      expect(wrapper.findAll('.customer-row')).toHaveLength(1);
    });

    it('shows error when adding fails', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      assignSalesperson.mockRejectedValue(Object.assign(new Error('add failed'), { status: 500 }));
      const { wrapper } = await mountView();
      await wrapper.find('.customer-add-select').setValue('c3');
      await wrapper.find('.add-btn').trigger('click');
      await flushPromises();
      expect(wrapper.find('.account-customers [role="alert"]').text()).toBe('add failed');
    });

    it('shows error when removing fails', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      removeCustomer.mockRejectedValue(Object.assign(new Error('remove failed'), { status: 500 }));
      const { wrapper } = await mountView();
      await wrapper.findAll('.remove-btn')[0].trigger('click');
      await flushPromises();
      expect(wrapper.find('.account-customers [role="alert"]').text()).toBe('remove failed');
    });

    it('shows error when customer list fails to load', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      fetchCustomers.mockRejectedValue(Object.assign(new Error('list failed'), { status: 500 }));
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-customers [role="alert"]').text()).toBe('list failed');
    });

    it('shows empty state when no customers are assigned', async () => {
      fetchAccount.mockResolvedValue(salespersonUser);
      fetchCustomers.mockResolvedValue({ customers: [], availableCustomers: [] });
      const { wrapper } = await mountView();
      expect(wrapper.find('.account-customers').text()).toContain('No customers assigned yet.');
    });
  });
});
