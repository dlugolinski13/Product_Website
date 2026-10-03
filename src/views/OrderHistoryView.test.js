import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import OrderHistoryView from './OrderHistoryView.vue';
import { token } from '../auth';
import { fetchOrders } from '../api';

vi.mock('../api', () => ({ fetchOrders: vi.fn() }));

describe('OrderHistoryView', () => {
  beforeEach(() => {
    fetchOrders.mockReset();
    token.value = 'tok';
  });

  it('shows an empty state when there are no orders', async () => {
    fetchOrders.mockResolvedValue([]);
    const wrapper = mount(OrderHistoryView);
    await flushPromises();
    expect(wrapper.text()).toContain("You haven't placed any orders yet.");
  });

  it('lists orders with their items', async () => {
    fetchOrders.mockResolvedValue([
      {
        id: 'o1',
        status: 'submitted',
        createdAt: '2026-01-01T00:00:00Z',
        items: [{ id: 'i1', productName: 'Widget', itemNumber: 'W-1', quantity: 2, unitPrice: 9.5 }],
      },
    ]);
    const wrapper = mount(OrderHistoryView);
    await flushPromises();

    expect(fetchOrders).toHaveBeenCalledWith('tok');
    expect(wrapper.text()).toContain('submitted');
    expect(wrapper.text()).toContain('Widget');
    expect(wrapper.text()).toContain('W-1');
    expect(wrapper.text()).toContain('$9.50');
  });

  it('shows an error when loading fails', async () => {
    fetchOrders.mockRejectedValue(new Error('orders down'));
    const wrapper = mount(OrderHistoryView);
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('orders down');
  });
});
