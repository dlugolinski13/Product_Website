import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CartView from './CartView.vue';
import { items, addToCart, clearCart } from '../cart';
import { token } from '../auth';
import { createOrder } from '../api';

vi.mock('../api', () => ({ createOrder: vi.fn() }));

describe('CartView', () => {
  beforeEach(() => {
    createOrder.mockReset();
    token.value = 'tok';
    clearCart();
  });

  it('shows an empty state when the cart has no items', () => {
    const wrapper = mount(CartView);
    expect(wrapper.text()).toContain('Your cart is empty.');
  });

  it('lists items with quantity, line price and subtotal', () => {
    addToCart({ id: 'p1', item_number: 'W-1', name: 'Widget', company_price: 10, images: ['https://img/1.png'] }, 2);
    const wrapper = mount(CartView);
    expect(wrapper.text()).toContain('Widget');
    expect(wrapper.text()).toContain('W-1');
    expect(wrapper.find('.cart-thumb').attributes('src')).toBe('https://img/1.png');
    expect(wrapper.text()).toContain('$20.00');
    expect(wrapper.text()).toContain('Subtotal: $20.00');
  });

  it('updates the quantity when the input changes', async () => {
    addToCart({ id: 'p1', item_number: 'W-1', name: 'Widget', company_price: 10, images: [] }, 1);
    const wrapper = mount(CartView);
    await wrapper.find('.quantity').setValue(4);
    expect(items.value[0].quantity).toBe(4);
    expect(wrapper.text()).toContain('Subtotal: $40.00');
  });

  it('removes an item when Remove is clicked', async () => {
    addToCart({ id: 'p1', item_number: 'W-1', name: 'Widget', company_price: 10, images: [] }, 1);
    const wrapper = mount(CartView);
    await wrapper.find('.remove').trigger('click');
    expect(items.value).toEqual([]);
    expect(wrapper.text()).toContain('Your cart is empty.');
  });

  it('submits the order, clears the cart and shows a success message', async () => {
    addToCart({ id: 'p1', item_number: 'W-1', name: 'Widget', company_price: 10, images: [] }, 2);
    createOrder.mockResolvedValue({ id: 'o1' });
    const wrapper = mount(CartView);

    await wrapper.find('.place-order').trigger('click');
    await flushPromises();

    expect(createOrder).toHaveBeenCalledWith('tok', [{ productId: 'p1', quantity: 2 }]);
    expect(items.value).toEqual([]);
    expect(wrapper.text()).toContain('Order submitted!');
  });

  it('shows an error and keeps the cart when submitting fails', async () => {
    addToCart({ id: 'p1', item_number: 'W-1', name: 'Widget', company_price: 10, images: [] }, 1);
    createOrder.mockRejectedValue(new Error('order failed'));
    const wrapper = mount(CartView);

    await wrapper.find('.place-order').trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toBe('order failed');
    expect(items.value).toHaveLength(1);
  });
});
