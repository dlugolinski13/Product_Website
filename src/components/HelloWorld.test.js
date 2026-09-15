import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HelloWorld from './HelloWorld.vue';

describe('HelloWorld', () => {
  it('starts the counter at 0', () => {
    const wrapper = mount(HelloWorld);
    expect(wrapper.find('.counter').text()).toContain('Count is 0');
  });

  it('increments the counter on click', async () => {
    const wrapper = mount(HelloWorld);
    await wrapper.find('.counter').trigger('click');
    await wrapper.find('.counter').trigger('click');
    expect(wrapper.find('.counter').text()).toContain('Count is 2');
  });
});
