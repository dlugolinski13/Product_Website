import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import CartView from './CartView.vue';
import { useCartStore } from '../stores/cart';
import { token } from '../auth';
import { createOrder } from '../api';

vi.mock('../api', () => ({ createOrder: vi.fn() }));

function mountView(pinia) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/cart', component: CartView },
      { path: '/orders', component: { template: '<div />' } },
    ],
  });
  router.push('/cart');
  return mount(CartView, { global: { plugins: [router, pinia] } });
}

describe('CartView', () => {
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    createOrder.mockReset();
    token.value = 'tok';
  });

  it('shows empty state when cart is empty', () => {
    const wrapper = mountView(pinia);
    expect(wrapper.text()).toContain('Your cart is empty.');
    expect(wrapper.find('.cart-list').exists()).toBe(false);
  });

  it('lists cart items with name, quantity, and unit price', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'Widget', company_price: 10 });
    cart.addItem({ id: '1', name: 'Widget', company_price: 10 });
    cart.addItem({ id: '2', name: 'Gadget', company_price: '5.5' });
    const wrapper = mountView(pinia);
    const items = wrapper.findAll('.cart-item');
    expect(items).toHaveLength(2);
    expect(items[0].text()).toContain('Widget');
    expect(items[0].text()).toContain('2');
    expect(items[0].text()).toContain('$10.00');
    expect(items[1].text()).toContain('Gadget');
    expect(items[1].text()).toContain('$5.50');
  });

  it('shows the order subtotal', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'Widget', company_price: 10 });
    cart.addItem({ id: '2', name: 'Gadget', company_price: 5 });
    const wrapper = mountView(pinia);
    expect(wrapper.text()).toContain('Subtotal: $15.00');
  });

  it('removes an item when Remove is clicked', async () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'Widget', company_price: 10 });
    cart.addItem({ id: '2', name: 'Gadget', company_price: 5 });
    const wrapper = mountView(pinia);
    await wrapper.findAll('.remove-btn')[0].trigger('click');
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].product.id).toBe('2');
  });

  it('shows empty state after removing the last item', async () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'Widget', company_price: 10 });
    const wrapper = mountView(pinia);
    await wrapper.find('.remove-btn').trigger('click');
    expect(wrapper.text()).toContain('Your cart is empty.');
  });

  it('shows Send Order button when cart has items', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'Widget', company_price: 10 });
    const wrapper = mountView(pinia);
    expect(wrapper.find('.send-order-btn').exists()).toBe(true);
    expect(wrapper.find('.send-order-btn').text()).toBe('Send Order');
  });

  it('does not show Send Order button when cart is empty', () => {
    const wrapper = mountView(pinia);
    expect(wrapper.find('.send-order-btn').exists()).toBe(false);
  });

  it('calls createOrder with mapped items and redirects to /orders on success', async () => {
    createOrder.mockResolvedValue({ id: 'order-1', status: 'submitted' });
    const cart = useCartStore();
    cart.addItem({ id: 'p1', name: 'Widget', company_price: 10 });
    const wrapper = mountView(pinia);
    await wrapper.find('.send-order-btn').trigger('click');
    await flushPromises();
    expect(createOrder).toHaveBeenCalledWith('tok', [{ productId: 'p1', quantity: 1 }]);
    expect(cart.items).toHaveLength(0);
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/orders');
  });

  it('shows a thumbnail when the product has images', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'Widget', company_price: 10, images: ['http://img/1.jpg'] });
    const wrapper = mountView(pinia);
    const img = wrapper.find('.cart-item-thumbnail');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('http://img/1.jpg');
    expect(img.attributes('alt')).toBe('Widget');
  });

  it('does not show a thumbnail when the product has no images', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'Widget', company_price: 10, images: [] });
    const wrapper = mountView(pinia);
    expect(wrapper.find('.cart-item-thumbnail').exists()).toBe(false);
  });

  it('shows an error and keeps cart intact when the order fails', async () => {
    createOrder.mockRejectedValue(new Error('server error'));
    const cart = useCartStore();
    cart.addItem({ id: 'p1', name: 'Widget', company_price: 10 });
    const wrapper = mountView(pinia);
    await wrapper.find('.send-order-btn').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('server error');
    expect(cart.items).toHaveLength(1);
  });
});
