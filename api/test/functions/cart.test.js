import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { loadWithMocks } from '../testUtils/mockRequire.js';

const nodeRequire = createRequire(import.meta.url);

const routes = new Map();
const queryMock = vi.fn();
const requestMock = vi.fn(() => ({ input: vi.fn().mockReturnThis(), query: queryMock }));
const getPoolMock = vi.fn(async () => ({ request: requestMock }));
const requireRoleMock = vi.fn();

function fakeContext() {
  return { error: vi.fn() };
}

function fakeRequest(body) {
  return { json: async () => body };
}

describe('cart', () => {
  let getHandler;
  let saveHandler;
  let discardHandler;

  beforeAll(() => {
    loadWithMocks(
      nodeRequire,
      {
        '@azure/functions': { app: { http: (name, options) => routes.set(name, options) } },
        '../../src/lib/db': {
          sql: {
            UniqueIdentifier: 'UniqueIdentifier',
            Int: 'Int',
          },
          getPool: (...args) => getPoolMock(...args),
        },
        '../../src/lib/auth': { requireRole: (...args) => requireRoleMock(...args) },
      },
      '../../src/functions/cart.js'
    );
    getHandler = routes.get('getSavedCart').handler;
    saveHandler = routes.get('saveCart').handler;
    discardHandler = routes.get('discardSavedCart').handler;
  });

  beforeEach(() => {
    queryMock.mockReset();
    requestMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: requestMock }));
    requireRoleMock.mockReset();
  });

  describe('getSavedCart', () => {
    it('returns 401 when not authenticated', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await getHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(401);
    });

    it('returns saved cart items with product details', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'user-1' } });
      queryMock.mockResolvedValue({
        recordset: [
          {
            product_id: 'p1',
            quantity: 3,
            item_number: 'ITEM-1',
            name: 'Widget',
            company_price: 9.99,
            retail_price: 14.99,
            description: 'A widget',
          },
        ],
      });

      const result = await getHandler(fakeRequest(), fakeContext());

      expect(result.jsonBody.items).toHaveLength(1);
      expect(result.jsonBody.items[0]).toEqual({
        productId: 'p1',
        quantity: 3,
        product: {
          id: 'p1',
          item_number: 'ITEM-1',
          name: 'Widget',
          company_price: 9.99,
          retail_price: 14.99,
          description: 'A widget',
        },
      });
    });

    it('returns an empty items array when no saved cart exists', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'user-1' } });
      queryMock.mockResolvedValue({ recordset: [] });

      const result = await getHandler(fakeRequest(), fakeContext());

      expect(result.jsonBody.items).toEqual([]);
    });

    it('returns 500 and logs on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'user-1' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();

      const result = await getHandler(fakeRequest(), context);

      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('saveCart', () => {
    it('returns 401 when not authenticated', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await saveHandler(fakeRequest({ items: [] }), fakeContext());
      expect(result.status).toBe(401);
    });

    it('deletes existing items then inserts new ones and returns 204', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'user-1' } });
      queryMock.mockResolvedValue({});

      const result = await saveHandler(
        fakeRequest({ items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }] }),
        fakeContext()
      );

      expect(result.status).toBe(204);
      // DELETE + 2 INSERTs = 3 query calls
      expect(queryMock).toHaveBeenCalledTimes(3);
      expect(queryMock.mock.calls[0][0]).toContain('DELETE FROM saved_cart_items');
      expect(queryMock.mock.calls[1][0]).toContain('INSERT INTO saved_cart_items');
      expect(queryMock.mock.calls[2][0]).toContain('INSERT INTO saved_cart_items');
    });

    it('only deletes (no inserts) when items array is empty', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'user-1' } });
      queryMock.mockResolvedValue({});

      const result = await saveHandler(fakeRequest({ items: [] }), fakeContext());

      expect(result.status).toBe(204);
      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock.mock.calls[0][0]).toContain('DELETE FROM saved_cart_items');
    });

    it('treats missing items field as empty array', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'user-1' } });
      queryMock.mockResolvedValue({});

      const result = await saveHandler(fakeRequest({}), fakeContext());

      expect(result.status).toBe(204);
      expect(queryMock).toHaveBeenCalledTimes(1);
    });

    it('returns 500 and logs on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'user-1' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();

      const result = await saveHandler(fakeRequest({ items: [] }), context);

      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('discardSavedCart', () => {
    it('returns 401 when not authenticated', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await discardHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(401);
    });

    it('deletes saved cart items and returns 204', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'user-1' } });
      queryMock.mockResolvedValue({});

      const result = await discardHandler(fakeRequest(), fakeContext());

      expect(result.status).toBe(204);
      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock.mock.calls[0][0]).toContain('DELETE FROM saved_cart_items');
    });

    it('returns 500 and logs on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'user-1' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();

      const result = await discardHandler(fakeRequest(), context);

      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });
});
