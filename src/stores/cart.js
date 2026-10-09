import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useCartStore = defineStore('cart', () => {
  const items = ref([]);

  const itemCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  );

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity * Number(item.product.company_price), 0)
  );

  function addItem(product) {
    const existing = items.value.find((i) => i.product.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      items.value.push({ product, quantity: 1 });
    }
  }

  function removeItem(productId) {
    items.value = items.value.filter((i) => i.product.id !== productId);
  }

  function clearCart() {
    items.value = [];
  }

  function restoreItems(savedItems) {
    items.value = savedItems.map(({ product, quantity }) => ({ product, quantity }));
  }

  return { items, itemCount, subtotal, addItem, removeItem, clearCart, restoreItems };
});
