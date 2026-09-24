import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import LoginView from './views/LoginView.vue';
import ProductsView from './views/ProductsView.vue';
import { token } from './auth';

// Hash history so deep links work on Static Web Apps without extra fallback routing config.
export const routes = [
  { path: '/', component: HomeView },
  { path: '/login', component: LoginView },
  { path: '/products', component: ProductsView, meta: { requiresAuth: true } },
];

export function requireAuth(to) {
  if (to.meta.requiresAuth && !token.value) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
}

const router = createRouter({ history: createWebHashHistory(), routes });
router.beforeEach(requireAuth);

export default router;
