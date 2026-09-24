import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HomeView from './HomeView.vue';

describe('HomeView', () => {
  it('links to the products page', () => {
    const RouterLink = { props: ['to'], template: '<a :href="to"><slot /></a>' };
    const wrapper = mount(HomeView, { global: { stubs: { RouterLink } } });
    expect(wrapper.find('a').attributes('href')).toBe('/products');
  });
});
