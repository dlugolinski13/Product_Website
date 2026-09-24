import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import App from './App.vue';
import { token } from './auth';

async function mountApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/products', component: { template: '<div>products</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
    ],
  });
  router.push('/');
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router] } });
  return { wrapper, router };
}

describe('App', () => {
  beforeEach(() => {
    token.value = null;
    localStorage.clear();
  });

  it('shows Home, Products and Log in links when logged out', async () => {
    const { wrapper } = await mountApp();
    const links = wrapper.findAll('nav a').map((a) => a.text());
    expect(links).toEqual(['Home', 'Products', 'Log in']);
    expect(wrapper.find('nav button').exists()).toBe(false);
  });

  it('shows Log out when logged in and returns to login after clicking it', async () => {
    token.value = 'tok';
    const { wrapper, router } = await mountApp();
    await wrapper.find('nav button').trigger('click');
    await flushPromises();
    expect(token.value).toBeNull();
    expect(router.currentRoute.value.path).toBe('/login');
  });
});
