import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import App from './App.vue';

describe('App', () => {
  it('renders the HelloWorld component', () => {
    const wrapper = mount(App);
    expect(wrapper.find('.counter').exists()).toBe(true);
  });
});
