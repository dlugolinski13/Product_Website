import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import CartView from './CartView.vue';
import { useCartStore } from '../stores/cart';

function mountView(pinia) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/cart', component: CartView }],
  });
  router.push('/cart');
  return mount(CartView, { global: { plugins: [router, pinia] } });
}

describe('CartView', () => {
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
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
});
