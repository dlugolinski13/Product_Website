import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import AdminPage from './AdminPage.vue';
import { token } from '../auth';
import {
  fetchCustomers,
  removeCustomer,
  adminCreateUser,
  fetchNotifications,
  createNotification,
  toggleNotification,
} from '../api';

vi.mock('../api', () => ({
  fetchCustomers: vi.fn(),
  removeCustomer: vi.fn(),
  adminCreateUser: vi.fn(),
  fetchNotifications: vi.fn(),
  createNotification: vi.fn(),
  toggleNotification: vi.fn(),
}));

function makeToken(payload) {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64}.signature`;
}

async function mountView(role = 'admin') {
  token.value = makeToken({ sub: 'u1', role, email: `${role}@x.com` });
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin', component: AdminPage },
      { path: '/admin/customers', component: { template: '<div />' } },
      { path: '/login', component: { template: '<div />' } },
    ],
  });
  router.push('/admin');
  await router.isReady();
  const wrapper = mount(AdminPage, { global: { plugins: [router, pinia] } });
  await flushPromises();
  return { wrapper, router };
}

const notifData = {
  notifications: [
    { id: 1, message: 'Hello users', createdAt: '2024-01-01', isActive: true },
    { id: 2, message: 'System down', createdAt: '2024-01-02', isActive: false },
  ],
};

const customerData = {
  customers: [
    { id: 'c1', email: 'carol@x.com', fullName: 'Carol' },
    { id: 'c2', email: 'dave@x.com', fullName: 'Dave' },
  ],
  availableCustomers: [],
};

describe('AdminPage', () => {
  beforeEach(() => {
    fetchCustomers.mockReset();
    removeCustomer.mockReset();
    adminCreateUser.mockReset();
    fetchNotifications.mockReset();
    createNotification.mockReset();
    toggleNotification.mockReset();
    token.value = null;
  });

  describe('admin role', () => {
    it('shows all admin sections and not the salesperson section', async () => {
      fetchNotifications.mockResolvedValue(notifData);
      const { wrapper } = await mountView('admin');
      expect(wrapper.text()).toContain('Assign Customers to Salespeople');
      expect(wrapper.text()).toContain('Create Salesperson');
      expect(wrapper.text()).toContain('Create Customer');
      expect(wrapper.text()).toContain('Notifications');
      expect(wrapper.text()).not.toContain('Request Separation from Customer');
    });

    it('renders a link to /admin/customers', async () => {
      fetchNotifications.mockResolvedValue(notifData);
      const { wrapper } = await mountView('admin');
      expect(wrapper.find('.assign-link').attributes('href')).toContain('/admin/customers');
    });

    it('calls fetchNotifications on mount', async () => {
      fetchNotifications.mockResolvedValue(notifData);
      await mountView('admin');
      expect(fetchNotifications).toHaveBeenCalledWith(expect.any(String));
    });

    it('shows notification rows', async () => {
      fetchNotifications.mockResolvedValue(notifData);
      const { wrapper } = await mountView('admin');
      expect(wrapper.findAll('.notif-row')).toHaveLength(2);
      expect(wrapper.text()).toContain('Hello users');
      expect(wrapper.text()).toContain('System down');
    });

    it('shows active/inactive status correctly', async () => {
      fetchNotifications.mockResolvedValue(notifData);
      const { wrapper } = await mountView('admin');
      const rows = wrapper.findAll('.notif-row');
      expect(rows[0].find('.notif-active').exists()).toBe(true);
      expect(rows[1].find('.notif-inactive').exists()).toBe(true);
    });

    it('shows empty state when no notifications', async () => {
      fetchNotifications.mockResolvedValue({ notifications: [] });
      const { wrapper } = await mountView('admin');
      expect(wrapper.text()).toContain('No notifications yet.');
      expect(wrapper.find('.notif-table').exists()).toBe(false);
    });

    it('shows error when fetchNotifications fails', async () => {
      fetchNotifications.mockRejectedValue(Object.assign(new Error('fetch failed'), { status: 500 }));
      const { wrapper } = await mountView('admin');
      expect(wrapper.find('[role="alert"]').text()).toBe('fetch failed');
    });

    it('logs out and redirects on 401 from fetchNotifications', async () => {
      fetchNotifications.mockRejectedValue(Object.assign(new Error('unauth'), { status: 401 }));
      const { router } = await mountView('admin');
      expect(token.value).toBeNull();
      expect(router.currentRoute.value.path).toBe('/login');
    });

    it('creates a salesperson on form submit', async () => {
      fetchNotifications.mockResolvedValue({ notifications: [] });
      adminCreateUser.mockResolvedValue({ id: 'new', email: 'sp@x.com', role: 'salesperson' });
      const { wrapper } = await mountView('admin');

      await wrapper.find('#sp-email').setValue('sp@x.com');
      await wrapper.find('#sp-password').setValue('secret');
      await wrapper.findAll('.user-form')[0].trigger('submit');
      await flushPromises();

      expect(adminCreateUser).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ email: 'sp@x.com', role: 'salesperson' })
      );
      expect(wrapper.text()).toContain('Salesperson created.');
    });

    it('shows error when create salesperson fails', async () => {
      fetchNotifications.mockResolvedValue({ notifications: [] });
      adminCreateUser.mockRejectedValue(Object.assign(new Error('already exists'), { status: 409 }));
      const { wrapper } = await mountView('admin');

      await wrapper.find('#sp-email').setValue('dup@x.com');
      await wrapper.find('#sp-password').setValue('pass');
      await wrapper.findAll('.user-form')[0].trigger('submit');
      await flushPromises();

      expect(wrapper.findAll('[role="alert"]')[0].text()).toBe('already exists');
    });

    it('creates a customer on form submit', async () => {
      fetchNotifications.mockResolvedValue({ notifications: [] });
      adminCreateUser.mockResolvedValue({ id: 'c-new', email: 'cust@x.com', role: 'customer' });
      const { wrapper } = await mountView('admin');

      await wrapper.find('#cust-email').setValue('cust@x.com');
      await wrapper.find('#cust-password').setValue('secret');
      await wrapper.findAll('.user-form')[1].trigger('submit');
      await flushPromises();

      expect(adminCreateUser).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ email: 'cust@x.com', role: 'customer' })
      );
      expect(wrapper.text()).toContain('Customer created.');
    });

    it('adds a notification and prepends to the list', async () => {
      fetchNotifications.mockResolvedValue({ notifications: [] });
      createNotification.mockResolvedValue({ id: 10, message: 'New alert', createdAt: '2024-02-01', isActive: true });
      const { wrapper } = await mountView('admin');

      await wrapper.find('.notif-input').setValue('New alert');
      await wrapper.find('.notif-form').trigger('submit');
      await flushPromises();

      expect(createNotification).toHaveBeenCalledWith(expect.any(String), { message: 'New alert' });
      expect(wrapper.find('.notif-table').exists()).toBe(true);
      expect(wrapper.text()).toContain('New alert');
    });

    it('toggles a notification and flips isActive in the list', async () => {
      fetchNotifications.mockResolvedValue(notifData);
      toggleNotification.mockResolvedValue(undefined);
      const { wrapper } = await mountView('admin');

      const firstRow = wrapper.findAll('.notif-row')[0];
      expect(firstRow.find('.notif-active').exists()).toBe(true);
      await firstRow.find('.toggle-btn').trigger('click');
      await flushPromises();

      expect(toggleNotification).toHaveBeenCalledWith(expect.any(String), 1);
      expect(wrapper.findAll('.notif-row')[0].find('.notif-inactive').exists()).toBe(true);
    });
  });

  describe('salesperson role', () => {
    it('shows only the separation section', async () => {
      fetchCustomers.mockResolvedValue(customerData);
      const { wrapper } = await mountView('salesperson');
      expect(wrapper.text()).toContain('Request Separation from Customer');
      expect(wrapper.text()).not.toContain('Create Salesperson');
      expect(wrapper.text()).not.toContain('Create Customer');
      expect(wrapper.text()).not.toContain('Notifications');
    });

    it('calls fetchCustomers on mount', async () => {
      fetchCustomers.mockResolvedValue(customerData);
      await mountView('salesperson');
      expect(fetchCustomers).toHaveBeenCalledWith(expect.any(String));
    });

    it('renders a row per assigned customer', async () => {
      fetchCustomers.mockResolvedValue(customerData);
      const { wrapper } = await mountView('salesperson');
      expect(wrapper.findAll('.sep-row')).toHaveLength(2);
      expect(wrapper.text()).toContain('Carol');
      expect(wrapper.text()).toContain('Dave');
    });

    it('shows empty state when no customers assigned', async () => {
      fetchCustomers.mockResolvedValue({ customers: [], availableCustomers: [] });
      const { wrapper } = await mountView('salesperson');
      expect(wrapper.text()).toContain('No assigned customers.');
      expect(wrapper.find('.sep-table').exists()).toBe(false);
    });

    it('shows error on non-401 fetchCustomers failure', async () => {
      fetchCustomers.mockRejectedValue(Object.assign(new Error('server error'), { status: 500 }));
      const { wrapper } = await mountView('salesperson');
      expect(wrapper.find('[role="alert"]').text()).toBe('server error');
    });

    it('logs out and redirects on 401 from fetchCustomers', async () => {
      fetchCustomers.mockRejectedValue(Object.assign(new Error('unauth'), { status: 401 }));
      const { router } = await mountView('salesperson');
      expect(token.value).toBeNull();
      expect(router.currentRoute.value.path).toBe('/login');
    });

    it('calls removeCustomer and removes the row when Request Separation is clicked', async () => {
      fetchCustomers.mockResolvedValue(customerData);
      removeCustomer.mockResolvedValue(undefined);
      const { wrapper } = await mountView('salesperson');

      const rows = wrapper.findAll('.sep-row');
      await rows[0].find('.sep-btn').trigger('click');
      await flushPromises();

      expect(removeCustomer).toHaveBeenCalledWith(expect.any(String), 'c1');
      expect(wrapper.findAll('.sep-row')).toHaveLength(1);
      expect(wrapper.text()).not.toContain('Carol');
    });

    it('shows error when removeCustomer fails', async () => {
      fetchCustomers.mockResolvedValue(customerData);
      removeCustomer.mockRejectedValue(Object.assign(new Error('remove failed'), { status: 500 }));
      const { wrapper } = await mountView('salesperson');

      await wrapper.findAll('.sep-row')[0].find('.sep-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('[role="alert"]').text()).toBe('remove failed');
    });

    it('disables the button while separation is in progress', async () => {
      fetchCustomers.mockResolvedValue(customerData);
      let resolve;
      removeCustomer.mockReturnValue(new Promise(r => { resolve = r; }));
      const { wrapper } = await mountView('salesperson');

      const row = wrapper.findAll('.sep-row')[0];
      await row.find('.sep-btn').trigger('click');
      expect(row.find('.sep-btn').element.disabled).toBe(true);
      resolve();
      await flushPromises();
      // After success the row is removed from the list (customer was separated).
      expect(wrapper.findAll('.sep-row')).toHaveLength(1);
    });
  });
});
