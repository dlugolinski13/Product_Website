import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import UploadProductView from './UploadProduct.vue';
import { token } from '../auth';
import { createProduct, addProductImage } from '../api';

vi.mock('../api', () => ({ createProduct: vi.fn(), addProductImage: vi.fn() }));

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/upload-product', component: UploadProductView },
      { path: '/products', component: { template: '<div />' } },
    ],
  });
  router.push('/upload-product');
  await router.isReady();
  return { wrapper: mount(UploadProductView, { global: { plugins: [router] } }), router };
}

function labelInput(wrapper, labelText) {
  const label = wrapper.findAll('label').find((l) => l.text().startsWith(labelText));
  return label ? label.find('input,select,textarea') : null;
}

describe('UploadProductView', () => {
  beforeEach(() => {
    createProduct.mockReset();
    addProductImage.mockReset();
    token.value = 'test-token';
  });

  it('renders all required and optional form inputs with a submit button', async () => {
    const { wrapper } = await mountView();
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.find('select').exists()).toBe(true);
    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('renders all fields from the product detail page', async () => {
    const { wrapper } = await mountView();
    const labels = wrapper.findAll('label').map((l) => l.text());
    const hasLabel = (text) => labels.some((l) => l.startsWith(text));
    expect(hasLabel('Item number')).toBe(true);
    expect(hasLabel('Name')).toBe(true);
    expect(hasLabel('Shipping method')).toBe(true);
    expect(hasLabel('Group code')).toBe(true);
    expect(hasLabel('Class number')).toBe(true);
    expect(hasLabel('Company price')).toBe(true);
    expect(hasLabel('Retail price')).toBe(true);
    expect(hasLabel('UPC')).toBe(true);
    expect(hasLabel('Description')).toBe(true);
    expect(hasLabel('Activation date')).toBe(true);
    expect(hasLabel('Pack amount')).toBe(true);
    expect(hasLabel('Pack unit')).toBe(true);
    expect(hasLabel('Cases per pack')).toBe(true);
    expect(hasLabel('Case weight')).toBe(true);
    expect(hasLabel('Case length')).toBe(true);
    expect(hasLabel('Case width')).toBe(true);
    expect(hasLabel('Case height')).toBe(true);
    expect(hasLabel('Customer comments')).toBe(true);
    expect(hasLabel('Image')).toBe(true);
  });

  it('binds form fields via v-model', async () => {
    const { wrapper } = await mountView();
    await labelInput(wrapper, 'Item number').setValue('ITEM-1');
    await labelInput(wrapper, 'Name').setValue('Widget');
    await labelInput(wrapper, 'Company price').setValue('5');
    await labelInput(wrapper, 'Retail price').setValue('10');
    expect(labelInput(wrapper, 'Item number').element.value).toBe('ITEM-1');
    expect(labelInput(wrapper, 'Name').element.value).toBe('Widget');
    expect(labelInput(wrapper, 'Company price').element.value).toBe('5');
    expect(labelInput(wrapper, 'Retail price').element.value).toBe('10');
  });

  it('does not show an error alert initially', async () => {
    const { wrapper } = await mountView();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('submit button is enabled initially', async () => {
    const { wrapper } = await mountView();
    expect(wrapper.find('button[type="submit"]').element.disabled).toBe(false);
  });

  it('calls createProduct with required and provided optional fields on submit', async () => {
    createProduct.mockResolvedValue({ id: 'new-id' });
    const { wrapper } = await mountView();
    await labelInput(wrapper, 'Item number').setValue('ITEM-1');
    await labelInput(wrapper, 'Name').setValue('Widget');
    await labelInput(wrapper, 'Shipping method').setValue('drop_ship');
    await labelInput(wrapper, 'Group code').setValue('WDGT');
    await labelInput(wrapper, 'Class number').setValue('1');
    await labelInput(wrapper, 'Company price').setValue('5.00');
    await labelInput(wrapper, 'Retail price').setValue('10.00');
    await labelInput(wrapper, 'UPC').setValue('012345678901');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(createProduct).toHaveBeenCalledWith('test-token', expect.objectContaining({
      itemNumber: 'ITEM-1',
      name: 'Widget',
      shippingMethod: 'drop_ship',
      groupCode: 'WDGT',
      classNumber: 1,
      companyPrice: 5,
      retailPrice: 10,
      upc: '012345678901',
    }));
  });

  it('omits optional fields that are left blank', async () => {
    createProduct.mockResolvedValue({ id: 'new-id' });
    const { wrapper } = await mountView();
    await labelInput(wrapper, 'Item number').setValue('ITEM-1');
    await labelInput(wrapper, 'Name').setValue('Widget');
    await labelInput(wrapper, 'Shipping method').setValue('drop_ship');
    await labelInput(wrapper, 'Group code').setValue('WDGT');
    await labelInput(wrapper, 'Class number').setValue('1');
    await labelInput(wrapper, 'Company price').setValue('5.00');
    await labelInput(wrapper, 'Retail price').setValue('10.00');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const body = createProduct.mock.calls[0][1];
    expect(body.upc).toBeUndefined();
    expect(body.description).toBeUndefined();
    expect(body.customerComments).toBeUndefined();
  });

  it('navigates to /products after a successful upload without image', async () => {
    createProduct.mockResolvedValue({ id: 'new-id' });
    const { wrapper, router } = await mountView();
    await labelInput(wrapper, 'Item number').setValue('ITEM-1');
    await labelInput(wrapper, 'Name').setValue('Widget');
    await labelInput(wrapper, 'Shipping method').setValue('drop_ship');
    await labelInput(wrapper, 'Group code').setValue('WDGT');
    await labelInput(wrapper, 'Class number').setValue('1');
    await labelInput(wrapper, 'Company price').setValue('5.00');
    await labelInput(wrapper, 'Retail price').setValue('10.00');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(addProductImage).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe('/products');
  });

  it('calls addProductImage with the selected file after creating the product', async () => {
    createProduct.mockResolvedValue({ id: 'new-id' });
    addProductImage.mockResolvedValue({ id: 'img-id' });
    const { wrapper, router } = await mountView();
    await labelInput(wrapper, 'Item number').setValue('ITEM-1');
    await labelInput(wrapper, 'Name').setValue('Widget');
    await labelInput(wrapper, 'Shipping method').setValue('drop_ship');
    await labelInput(wrapper, 'Group code').setValue('WDGT');
    await labelInput(wrapper, 'Class number').setValue('1');
    await labelInput(wrapper, 'Company price').setValue('5');
    await labelInput(wrapper, 'Retail price').setValue('10');

    const file = new File(['data'], 'test.png', { type: 'image/png' });
    const fileInput = wrapper.find('input[type="file"]');
    Object.defineProperty(fileInput.element, 'files', { value: [file], configurable: true });
    await fileInput.trigger('change');

    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(addProductImage).toHaveBeenCalledWith('test-token', 'new-id', file);
    expect(router.currentRoute.value.path).toBe('/products');
  });

  it('shows an error alert when createProduct rejects', async () => {
    createProduct.mockRejectedValue(new Error('Server error'));
    const { wrapper } = await mountView();
    await labelInput(wrapper, 'Item number').setValue('ITEM-1');
    await labelInput(wrapper, 'Name').setValue('Widget');
    await labelInput(wrapper, 'Shipping method').setValue('drop_ship');
    await labelInput(wrapper, 'Group code').setValue('WDGT');
    await labelInput(wrapper, 'Class number').setValue('1');
    await labelInput(wrapper, 'Company price').setValue('5.00');
    await labelInput(wrapper, 'Retail price').setValue('10.00');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('Server error');
  });
});
