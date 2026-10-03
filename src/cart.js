import { ref, computed } from 'vue';

const CART_KEY = 'cart_items';

function readStoredItems() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const items = ref(readStoredItems());

function persist() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items.value));
  } catch {
    // storage unavailable (private mode etc.) — cart still lives in memory for this session
  }
}

export function addToCart(product, quantity = 1) {
  const existing = items.value.find((item) => item.productId === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.value.push({
      productId: product.id,
      itemNumber: product.item_number,
      name: product.name,
      price: Number(product.company_price),
      image: (product.images && product.images[0]) || null,
      quantity,
    });
  }
  persist();
}

export function updateQuantity(productId, quantity) {
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  const item = items.value.find((item) => item.productId === productId);
  if (!item) return;
  item.quantity = quantity;
  persist();
}

export function removeFromCart(productId) {
  items.value = items.value.filter((item) => item.productId !== productId);
  persist();
}

export function clearCart() {
  items.value = [];
  persist();
}

export const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));
export const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.quantity * item.price, 0));
