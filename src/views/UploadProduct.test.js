import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import UploadProductView from './UploadProduct.vue';

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/upload-product', component: UploadProductView }],
  });
  router.push('/upload-product');
  await router.isReady();
  return mount(UploadProductView, { global: { plugins: [router] } });
}

describe('UploadProductView', () => {
  it('renders name, price, and file inputs with a submit button', async () => {
    const wrapper = await mountView();
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('binds name and price via v-model', async () => {
    const wrapper = await mountView();
    await wrapper.find('input[type="text"]').setValue('Widget');
    await wrapper.find('input[type="number"]').setValue('12.99');
    expect(wrapper.find('input[type="text"]').element.value).toBe('Widget');
    expect(wrapper.find('input[type="number"]').element.value).toBe('12.99');
  });

  it('does not show an error alert initially', async () => {
    const wrapper = await mountView();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('submit button is enabled initially', async () => {
    const wrapper = await mountView();
    expect(wrapper.find('button[type="submit"]').element.disabled).toBe(false);
  });
});
