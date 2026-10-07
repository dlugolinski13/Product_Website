import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import AdminCustomersView from './AdminCustomersView.vue';
import { token } from '../auth';
import { fetchAdminCustomers, adminAssignSalesperson } from '../api';

vi.mock('../api', () => ({
  fetchAdminCustomers: vi.fn(),
  adminAssignSalesperson: vi.fn(),
}));

const adminData = {
  customers: [
    { id: 'c1', email: 'carol@x.com', fullName: 'Carol', salespersonId: 'sp1' },
    { id: 'c2', email: 'dave@x.com', fullName: 'Dave', salespersonId: null },
  ],
  salespeople: [
    { id: 'sp1', email: 'bob@co.com', fullName: 'Bob' },
    { id: 'sp2', email: 'alice@co.com', fullName: 'Alice' },
  ],
};

async function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/customers', component: AdminCustomersView },
      { path: '/login', component: { template: '<div />' } },
    ],
  });
  router.push('/admin/customers');
  await router.isReady();
  const wrapper = mount(AdminCustomersView, { global: { plugins: [router, pinia] } });
  await flushPromises();
  return { wrapper, router };
}

describe('AdminCustomersView', () => {
  beforeEach(() => {
    fetchAdminCustomers.mockReset();
    adminAssignSalesperson.mockReset();
    token.value = 'tok';
  });

  it('shows loading before fetch resolves', () => {
    fetchAdminCustomers.mockReturnValue(new Promise(() => {}));
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/admin/customers', component: AdminCustomersView }],
    });
    const wrapper = mount(AdminCustomersView, { global: { plugins: [router, pinia] } });
    expect(wrapper.text()).toContain('Loading');
  });

  it('calls fetchAdminCustomers with the current token', async () => {
    fetchAdminCustomers.mockResolvedValue(adminData);
    await mountView();
    expect(fetchAdminCustomers).toHaveBeenCalledWith('tok');
  });

  it('shows error on non-auth failure', async () => {
    fetchAdminCustomers.mockRejectedValue(Object.assign(new Error('server error'), { status: 500 }));
    const { wrapper } = await mountView();
    expect(wrapper.find('[role="alert"]').text()).toBe('server error');
  });

  it('logs out and redirects to login on 401', async () => {
    fetchAdminCustomers.mockRejectedValue(Object.assign(new Error('nope'), { status: 401 }));
    const { router } = await mountView();
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBe('/admin/customers');
  });

  it('renders a row for each customer', async () => {
    fetchAdminCustomers.mockResolvedValue(adminData);
    const { wrapper } = await mountView();
    expect(wrapper.findAll('.admin-customer-row')).toHaveLength(2);
  });

  it('shows customer names and emails', async () => {
    fetchAdminCustomers.mockResolvedValue(adminData);
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain('Carol');
    expect(wrapper.text()).toContain('carol@x.com');
    expect(wrapper.text()).toContain('Dave');
  });

  it('pre-selects the current salesperson in each dropdown', async () => {
    fetchAdminCustomers.mockResolvedValue(adminData);
    const { wrapper } = await mountView();
    const selects = wrapper.findAll('.salesperson-select');
    expect(selects[0].element.value).toBe('sp1');
    expect(selects[1].element.value).toBe('');
  });

  it('populates the salesperson dropdown options', async () => {
    fetchAdminCustomers.mockResolvedValue(adminData);
    const { wrapper } = await mountView();
    const select = wrapper.findAll('.salesperson-select')[0];
    expect(select.text()).toContain('Bob');
    expect(select.text()).toContain('Alice');
  });

  it('shows empty state when no customers exist', async () => {
    fetchAdminCustomers.mockResolvedValue({ customers: [], salespeople: [] });
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain('No customers found.');
    expect(wrapper.find('.admin-customers-table').exists()).toBe(false);
  });

  it('calls adminAssignSalesperson with correct args when save is clicked', async () => {
    fetchAdminCustomers.mockResolvedValue(adminData);
    adminAssignSalesperson.mockResolvedValue(undefined);
    const { wrapper } = await mountView();
    const rows = wrapper.findAll('.admin-customer-row');
    await rows[1].find('.salesperson-select').setValue('sp2');
    await rows[1].find('.save-btn').trigger('click');
    await flushPromises();
    expect(adminAssignSalesperson).toHaveBeenCalledWith('tok', 'c2', 'sp2');
  });

  it('clears the assignment when None is selected and saved', async () => {
    fetchAdminCustomers.mockResolvedValue(adminData);
    adminAssignSalesperson.mockResolvedValue(undefined);
    const { wrapper } = await mountView();
    const rows = wrapper.findAll('.admin-customer-row');
    await rows[0].find('.salesperson-select').setValue('');
    await rows[0].find('.save-btn').trigger('click');
    await flushPromises();
    expect(adminAssignSalesperson).toHaveBeenCalledWith('tok', 'c1', null);
  });

  it('re-fetches the customer list after a successful save', async () => {
    fetchAdminCustomers.mockResolvedValue(adminData);
    adminAssignSalesperson.mockResolvedValue(undefined);
    const { wrapper } = await mountView();
    await wrapper.findAll('.admin-customer-row')[0].find('.save-btn').trigger('click');
    await flushPromises();
    expect(fetchAdminCustomers).toHaveBeenCalledTimes(2);
  });

  it('shows save error inline on failure', async () => {
    fetchAdminCustomers.mockResolvedValue(adminData);
    adminAssignSalesperson.mockRejectedValue(Object.assign(new Error('save failed'), { status: 500 }));
    const { wrapper } = await mountView();
    await wrapper.findAll('.admin-customer-row')[0].find('.save-btn').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.admin-customer-row')[0].find('.save-error').text()).toBe('save failed');
  });

  it('disables the save button while saving', async () => {
    fetchAdminCustomers.mockResolvedValue(adminData);
    let resolve;
    adminAssignSalesperson.mockReturnValue(new Promise(r => { resolve = r; }));
    const { wrapper } = await mountView();
    const row = wrapper.findAll('.admin-customer-row')[0];
    await row.find('.save-btn').trigger('click');
    expect(row.find('.save-btn').element.disabled).toBe(true);
    resolve();
    await flushPromises();
    expect(row.find('.save-btn').element.disabled).toBe(false);
  });
});
