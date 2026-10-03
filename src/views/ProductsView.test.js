import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import ProductsView from './ProductsView.vue';
import { token } from '../auth';
import { fetchProducts } from '../api';
import { addToCart } from '../cart';

vi.mock('../api', () => ({ fetchProducts: vi.fn() }));
vi.mock('../cart', () => ({ addToCart: vi.fn() }));

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/products', component: ProductsView },
      { path: '/login', component: { template: '<div />' } },
    ],
  });
  router.push('/products');
  await router.isReady();
  const wrapper = mount(ProductsView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe('ProductsView', () => {
  beforeEach(() => {
    fetchProducts.mockReset();
    addToCart.mockReset();
    token.value = 'tok';
  });

  it('renders each product with name, item number, price and first image', async () => {
    fetchProducts.mockResolvedValue([
      { id: '1', name: 'Widget', item_number: 'W-1', description: 'A widget', company_price: 95, images: ['https://img/1.png'] },
      { id: '2', name: 'Gadget', item_number: 'G-1', description: 'A gadget', company_price: '5.5', images: [] },
    ]);
    const { wrapper } = await mountView();
    expect(fetchProducts).toHaveBeenCalledWith('tok');
    const items = wrapper.findAll('.product');
    expect(items).toHaveLength(2);
    expect(items[0].text()).toContain('Widget');
    expect(items[0].text()).toContain('W-1');
    expect(items[0].text()).toContain('$95.00');
    expect(items[0].find('img').attributes('src')).toBe('https://img/1.png');
    expect(items[1].find('img').exists()).toBe(false);
    expect(items[1].text()).toContain('$5.50');
  });

  it('shows an empty state when there are no products', async () => {
    fetchProducts.mockResolvedValue([]);
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain('No products available yet.');
  });

  it('shows the error message on a non-auth failure', async () => {
    fetchProducts.mockRejectedValue(Object.assign(new Error('db down'), { status: 500 }));
    const { wrapper } = await mountView();
    expect(wrapper.find('[role="alert"]').text()).toBe('db down');
  });

  it('logs out and redirects to login on 401', async () => {
    fetchProducts.mockRejectedValue(Object.assign(new Error('nope'), { status: 401 }));
    const { router } = await mountView();
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBe('/products');
  });

  it('adds a product to the cart with the chosen quantity', async () => {
    const product = { id: '1', name: 'Widget', item_number: 'W-1', description: 'A widget', company_price: 95, images: [] };
    fetchProducts.mockResolvedValue([product]);
    const { wrapper } = await mountView();

    await wrapper.find('.quantity').setValue(3);
    await wrapper.find('.add-to-cart button').trigger('click');

    expect(addToCart).toHaveBeenCalledWith(product, 3);
    expect(wrapper.find('.added-confirmation').text()).toBe('Added!');
  });

  it('falls back to a quantity of 1 when the quantity field is cleared', async () => {
    const product = { id: '1', name: 'Widget', item_number: 'W-1', description: 'A widget', company_price: 95, images: [] };
    fetchProducts.mockResolvedValue([product]);
    const { wrapper } = await mountView();

    await wrapper.find('.quantity').setValue('');
    await wrapper.find('.add-to-cart button').trigger('click');

    expect(addToCart).toHaveBeenCalledWith(product, 1);
  });

  it('opens and closes the image zoom overlay', async () => {
    fetchProducts.mockResolvedValue([
      { id: '1', name: 'Widget', item_number: 'W-1', description: 'A widget', company_price: 95, images: ['https://img/1.png'] },
    ]);
    const { wrapper } = await mountView();

    expect(wrapper.find('.image-zoom-overlay').exists()).toBe(false);
    await wrapper.find('.product-thumb').trigger('click');
    expect(wrapper.find('.image-zoom-overlay img').attributes('src')).toBe('https://img/1.png');

    await wrapper.find('.image-zoom-overlay').trigger('click');
    expect(wrapper.find('.image-zoom-overlay').exists()).toBe(false);
  });
});
