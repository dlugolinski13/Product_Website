import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import LoginView from './views/LoginView.vue';
import CreateAccountView from './views/CreateAccountView.vue';
import ProductsView from './views/ProductsView.vue';
import ProductDetailView from './views/ProductDetailView.vue';
import CartView from './views/CartView.vue';
import UploadProductView from './views/UploadProduct.vue';
import OrderHistoryView from './views/OrderHistoryView.vue';
import AccountView from './views/AccountView.vue';
import EditProfileView from './views/EditProfileView.vue';
import { token, user } from './auth';

// Hash history so deep links work on Static Web Apps without extra fallback routing config.
export const routes = [
  { path: '/', component: HomeView },
  { path: '/login', component: LoginView },
  { path: '/create-account', component: CreateAccountView },
  { path: '/products', component: ProductsView, meta: { requiresAuth: true } },
  { path: '/products/:id', component: ProductDetailView, meta: { requiresAuth: true } },
  { path: '/cart', component: CartView, meta: { requiresAuth: true } },
  { path: '/upload-product', component: UploadProductView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/orders', component: OrderHistoryView, meta: { requiresAuth: true } },
  { path: '/account', component: AccountView, meta: { requiresAuth: true } },
  { path: '/account/edit', component: EditProfileView, meta: { requiresAuth: true } },
];

export function requireAuth(to) {
  if (to.meta.requiresAuth && !token.value) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (to.meta.requiresAdmin && user.value?.role !== 'admin') {
    return { path: '/products' };
  }
}

const router = createRouter({ history: createWebHashHistory(), routes });
router.beforeEach(requireAuth);

export default router;
