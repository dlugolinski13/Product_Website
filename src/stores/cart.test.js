import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCartStore } from './cart';

describe('cart store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts empty', () => {
    const cart = useCartStore();
    expect(cart.items).toEqual([]);
    expect(cart.itemCount).toBe(0);
    expect(cart.subtotal).toBe(0);
  });

  it('addItem adds a new product with quantity 1', () => {
    const cart = useCartStore();
    const product = { id: '1', name: 'Widget', company_price: 10 };
    cart.addItem(product);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toEqual({ product, quantity: 1 });
    expect(cart.itemCount).toBe(1);
    expect(cart.subtotal).toBe(10);
  });

  it('addItem increments quantity for an existing product', () => {
    const cart = useCartStore();
    const product = { id: '1', name: 'Widget', company_price: 10 };
    cart.addItem(product);
    cart.addItem(product);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.itemCount).toBe(2);
    expect(cart.subtotal).toBe(20);
  });

  it('addItem adds separate entries for different products', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'A', company_price: 5 });
    cart.addItem({ id: '2', name: 'B', company_price: 15 });
    expect(cart.items).toHaveLength(2);
    expect(cart.itemCount).toBe(2);
    expect(cart.subtotal).toBe(20);
  });

  it('removeItem removes the correct product', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'A', company_price: 5 });
    cart.addItem({ id: '2', name: 'B', company_price: 15 });
    cart.removeItem('1');
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].product.id).toBe('2');
  });

  it('removeItem does nothing when id is not found', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'A', company_price: 5 });
    cart.removeItem('999');
    expect(cart.items).toHaveLength(1);
  });

  it('clearCart empties all items', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'A', company_price: 5 });
    cart.addItem({ id: '2', name: 'B', company_price: 15 });
    cart.clearCart();
    expect(cart.items).toEqual([]);
    expect(cart.itemCount).toBe(0);
    expect(cart.subtotal).toBe(0);
  });

  it('subtotal handles string prices', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'A', company_price: '5.50' });
    cart.addItem({ id: '1', name: 'A', company_price: '5.50' });
    expect(cart.subtotal).toBe(11);
  });

  it('restoreItems replaces cart contents with saved items preserving quantities', () => {
    const cart = useCartStore();
    cart.addItem({ id: 'old', name: 'Old', company_price: 1 });

    const p1 = { id: 'p1', name: 'Widget', company_price: 10 };
    const p2 = { id: 'p2', name: 'Gadget', company_price: 5 };
    cart.restoreItems([
      { product: p1, quantity: 3 },
      { product: p2, quantity: 1 },
    ]);

    expect(cart.items).toHaveLength(2);
    expect(cart.items[0]).toEqual({ product: p1, quantity: 3 });
    expect(cart.items[1]).toEqual({ product: p2, quantity: 1 });
    expect(cart.itemCount).toBe(4);
    expect(cart.subtotal).toBe(35);
  });

  it('restoreItems with empty array clears the cart', () => {
    const cart = useCartStore();
    cart.addItem({ id: '1', name: 'A', company_price: 5 });
    cart.restoreItems([]);
    expect(cart.items).toEqual([]);
  });
});
