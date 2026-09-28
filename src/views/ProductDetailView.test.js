import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import ProductDetailView from './ProductDetailView.vue';
import { token } from '../auth';
import { fetchProducts } from '../api';

vi.mock('../api', () => ({ fetchProducts: vi.fn() }));

async function mountView(id = 'p1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/products/:id', component: ProductDetailView },
      { path: '/products', component: { template: '<div />' } },
      { path: '/login', component: { template: '<div />' } },
    ],
  });
  router.push(`/products/${id}`);
  await router.isReady();
  const wrapper = mount(ProductDetailView, { global: { plugins: [router] } });
  return { wrapper, router };
}

const sampleProduct = {
  id: 'p1',
  name: 'Test Bag',
  item_number: 'TB-1',
  upc: '012345678901',
  description: 'A test bag',
  company_price: 99,
  retail_price: '129.99',
  group_code: 'LUGG',
  class_number: 12,
  shipping_method: 'drop_ship',
  pack_amount: 1,
  pack_unit: 'ea',
  cases_per_pack: 2,
  case_weight: 5.5,
  case_length: 20,
  case_width: 14,
  case_height: 10,
  activation_date: '2024-01-01',
  customer_comments: 'Great bag',
  images: ['https://img/bag.png'],
};

describe('ProductDetailView', () => {
  beforeEach(() => {
    fetchProducts.mockReset();
    token.value = 'tok';
  });

  it('renders a back link immediately', async () => {
    fetchProducts.mockResolvedValue([sampleProduct]);
    const { wrapper } = await mountView();
    expect(wrapper.find('a').text()).toContain('Back to products');
  });

  it('renders full product details after loading', async () => {
    fetchProducts.mockResolvedValue([sampleProduct]);
    const { wrapper } = await mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('Test Bag');
    expect(wrapper.text()).toContain('TB-1');
    expect(wrapper.text()).toContain('012345678901');
    expect(wrapper.text()).toContain('$99.00');
    expect(wrapper.text()).toContain('$129.99');
    expect(wrapper.text()).toContain('LUGG');
    expect(wrapper.text()).toContain('drop_ship');
    expect(wrapper.text()).toContain('5.5 lbs');
    expect(wrapper.text()).toContain('2024-01-01');
    expect(wrapper.text()).toContain('Great bag');
    expect(wrapper.find('img').attributes('src')).toBe('https://img/bag.png');
  });

  it('shows "Product not found" when id does not match any product', async () => {
    fetchProducts.mockResolvedValue([{ ...sampleProduct, id: 'other-id' }]);
    const { wrapper } = await mountView('p1');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('Product not found.');
  });

  it('shows error message on non-401 fetch failure', async () => {
    fetchProducts.mockRejectedValue(Object.assign(new Error('db error'), { status: 500 }));
    const { wrapper } = await mountView();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('db error');
  });

  it('logs out and redirects to login on 401', async () => {
    fetchProducts.mockRejectedValue(Object.assign(new Error('unauthorized'), { status: 401 }));
    const { wrapper, router } = await mountView();
    await flushPromises();
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBe('/products/p1');
  });
});
