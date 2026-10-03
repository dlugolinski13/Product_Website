import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UploadProductView from './UploadProductView.vue';
import { token } from '../auth';
import { createProduct, uploadProductImage } from '../api';

vi.mock('../api', () => ({ createProduct: vi.fn(), uploadProductImage: vi.fn() }));

describe('UploadProductView', () => {
  beforeEach(() => {
    createProduct.mockReset();
    uploadProductImage.mockReset();
    token.value = 'tok';
  });

  it('creates a product with the entered fields', async () => {
    createProduct.mockResolvedValue({ id: 'p1' });
    const wrapper = mount(UploadProductView);

    await wrapper.find('input').setValue('ITEM-1');
    const textInputs = wrapper.findAll('input');
    await textInputs[1].setValue('Widget');
    await wrapper.find('input[maxlength="4"]').setValue('WDGT');
    await wrapper.find('input[type="number"]').setValue('1');
    const numberInputs = wrapper.findAll('input[type="number"]');
    await numberInputs[1].setValue('10');
    await numberInputs[2].setValue('20');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createProduct).toHaveBeenCalledWith('tok', {
      itemNumber: 'ITEM-1',
      name: 'Widget',
      description: '',
      shippingMethod: 'drop_ship',
      groupCode: 'WDGT',
      classNumber: 1,
      companyPrice: 10,
      retailPrice: 20,
    });
    expect(uploadProductImage).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Product created.');
  });

  it('uploads the selected image after creating the product', async () => {
    createProduct.mockResolvedValue({ id: 'p1' });
    uploadProductImage.mockResolvedValue({ id: 'img1' });
    const wrapper = mount(UploadProductView);

    const file = { type: 'image/png' };
    const fileInput = wrapper.find('input[type="file"]');
    Object.defineProperty(fileInput.element, 'files', { value: [file] });
    await fileInput.trigger('change');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(uploadProductImage).toHaveBeenCalledWith('tok', 'p1', file);
  });

  it('clears the selected image when the file input is reset', async () => {
    createProduct.mockResolvedValue({ id: 'p1' });
    const wrapper = mount(UploadProductView);

    const fileInput = wrapper.find('input[type="file"]');
    Object.defineProperty(fileInput.element, 'files', { value: [], configurable: true });
    await fileInput.trigger('change');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(uploadProductImage).not.toHaveBeenCalled();
  });

  it('submits a description and a delivered shipping method', async () => {
    createProduct.mockResolvedValue({ id: 'p1' });
    const wrapper = mount(UploadProductView);

    await wrapper.find('textarea').setValue('A great widget');
    await wrapper.find('select').setValue('delivered');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(createProduct).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({ description: 'A great widget', shippingMethod: 'delivered' })
    );
  });

  it('shows an error when creation fails', async () => {
    createProduct.mockRejectedValue(new Error('create failed'));
    const wrapper = mount(UploadProductView);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toBe('create failed');
  });
});
