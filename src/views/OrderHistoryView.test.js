import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import OrderHistoryView from './OrderHistoryView.vue';
import { token } from '../auth';
import { fetchOrders } from '../api';

vi.mock('../api', () => ({ fetchOrders: vi.fn() }));

async function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/orders', component: OrderHistoryView },
      { path: '/login', component: { template: '<div />' } },
    ],
  });
  router.push('/orders');
  await router.isReady();
  const wrapper = mount(OrderHistoryView, { global: { plugins: [router, pinia] } });
  await flushPromises();
  return { wrapper, router };
}

describe('OrderHistoryView', () => {
  beforeEach(() => {
    fetchOrders.mockReset();
    token.value = 'tok';
  });

  it('shows loading before the fetch resolves', () => {
    fetchOrders.mockReturnValue(new Promise(() => {}));
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/orders', component: OrderHistoryView }],
    });
    const wrapper = mount(OrderHistoryView, { global: { plugins: [router, pinia] } });
    expect(wrapper.text()).toContain('Loading');
  });

  it('shows empty state when there are no orders', async () => {
    fetchOrders.mockResolvedValue([]);
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain('No orders yet.');
  });

  it('renders orders with status and items', async () => {
    fetchOrders.mockResolvedValue([
      {
        id: 'o1',
        status: 'submitted',
        createdAt: '2024-01-15T00:00:00Z',
        submittedAt: '2024-01-15T01:00:00Z',
        items: [
          { id: 'i1', productName: 'Widget', quantity: 2, unitPrice: 9.99 },
          { id: 'i2', productName: 'Gadget', quantity: 1, unitPrice: 14.5 },
        ],
      },
    ]);
    const { wrapper } = await mountView();
    expect(wrapper.find('.order-card').exists()).toBe(true);
    expect(wrapper.find('.order-status').text()).toBe('submitted');
    const items = wrapper.findAll('.order-item');
    expect(items).toHaveLength(2);
    expect(items[0].text()).toContain('Widget');
    expect(items[0].text()).toContain('2');
    expect(items[0].text()).toContain('$9.99');
    expect(items[1].text()).toContain('Gadget');
    expect(items[1].text()).toContain('$14.50');
  });

  it('renders multiple orders', async () => {
    fetchOrders.mockResolvedValue([
      { id: 'o1', status: 'submitted', createdAt: '2024-01-10T00:00:00Z', items: [] },
      { id: 'o2', status: 'draft', createdAt: '2024-01-05T00:00:00Z', items: [] },
    ]);
    const { wrapper } = await mountView();
    expect(wrapper.findAll('.order-card')).toHaveLength(2);
  });

  it('shows an error on non-auth failure', async () => {
    fetchOrders.mockRejectedValue(Object.assign(new Error('server down'), { status: 500 }));
    const { wrapper } = await mountView();
    expect(wrapper.find('[role="alert"]').text()).toBe('server down');
  });

  it('logs out and redirects to login on 401', async () => {
    fetchOrders.mockRejectedValue(Object.assign(new Error('nope'), { status: 401 }));
    const { router } = await mountView();
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBe('/orders');
  });

  it('calls fetchOrders with the current token', async () => {
    fetchOrders.mockResolvedValue([]);
    await mountView();
    expect(fetchOrders).toHaveBeenCalledWith('tok');
  });
});
