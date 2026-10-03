import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('cart', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty when nothing is stored', async () => {
    const { items } = await import('./cart.js');
    expect(items.value).toEqual([]);
  });

  it('restores stored items on load', async () => {
    localStorage.setItem('cart_items', JSON.stringify([{ productId: 'p1', quantity: 2 }]));
    const { items } = await import('./cart.js');
    expect(items.value).toEqual([{ productId: 'p1', quantity: 2 }]);
  });

  it('addToCart adds a new item and persists it', async () => {
    const { items, addToCart } = await import('./cart.js');
    addToCart({ id: 'p1', item_number: 'W-1', name: 'Widget', company_price: '9.99', images: ['img.png'] }, 2);
    expect(items.value).toEqual([
      { productId: 'p1', itemNumber: 'W-1', name: 'Widget', price: 9.99, image: 'img.png', quantity: 2 },
    ]);
    expect(JSON.parse(localStorage.getItem('cart_items'))).toEqual(items.value);
  });

  it('addToCart increments quantity when the product is already in the cart', async () => {
    const { items, addToCart } = await import('./cart.js');
    const product = { id: 'p1', item_number: 'W-1', name: 'Widget', company_price: 10, images: [] };
    addToCart(product, 1);
    addToCart(product, 3);
    expect(items.value).toHaveLength(1);
    expect(items.value[0].quantity).toBe(4);
    expect(items.value[0].image).toBeNull();
  });

  it('updateQuantity changes the quantity of an existing item', async () => {
    const { items, addToCart, updateQuantity } = await import('./cart.js');
    addToCart({ id: 'p1', item_number: 'W-1', name: 'Widget', company_price: 10, images: [] }, 1);
    updateQuantity('p1', 5);
    expect(items.value[0].quantity).toBe(5);
  });

  it('updateQuantity removes the item when the quantity drops to zero or below', async () => {
    const { items, addToCart, updateQuantity } = await import('./cart.js');
    addToCart({ id: 'p1', item_number: 'W-1', name: 'Widget', company_price: 10, images: [] }, 1);
    updateQuantity('p1', 0);
    expect(items.value).toEqual([]);
  });

  it('updateQuantity does nothing for a product not in the cart', async () => {
    const { items, updateQuantity } = await import('./cart.js');
    updateQuantity('missing', 3);
    expect(items.value).toEqual([]);
  });

  it('removeFromCart removes only the matching item', async () => {
    const { items, addToCart, removeFromCart } = await import('./cart.js');
    addToCart({ id: 'p1', item_number: 'W-1', name: 'A', company_price: 1, images: [] }, 1);
    addToCart({ id: 'p2', item_number: 'W-2', name: 'B', company_price: 2, images: [] }, 1);
    removeFromCart('p1');
    expect(items.value.map((i) => i.productId)).toEqual(['p2']);
  });

  it('clearCart empties the cart and storage', async () => {
    const { items, addToCart, clearCart } = await import('./cart.js');
    addToCart({ id: 'p1', item_number: 'W-1', name: 'A', company_price: 1, images: [] }, 1);
    clearCart();
    expect(items.value).toEqual([]);
    expect(localStorage.getItem('cart_items')).toBe('[]');
  });

  it('itemCount and subtotal reflect all items', async () => {
    const { addToCart, itemCount, subtotal } = await import('./cart.js');
    addToCart({ id: 'p1', item_number: 'W-1', name: 'A', company_price: 10, images: [] }, 2);
    addToCart({ id: 'p2', item_number: 'W-2', name: 'B', company_price: 5, images: [] }, 1);
    expect(itemCount.value).toBe(3);
    expect(subtotal.value).toBe(25);
  });

  it('still works in memory when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { items, addToCart } = await import('./cart.js');
    addToCart({ id: 'p1', item_number: 'W-1', name: 'A', company_price: 1, images: [] }, 1);
    expect(items.value).toHaveLength(1);
  });

  it('starts empty in memory when reading storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { items } = await import('./cart.js');
    expect(items.value).toEqual([]);
  });
});
