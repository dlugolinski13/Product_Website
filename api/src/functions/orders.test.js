import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const routes = new Map();
vi.mock('@azure/functions', () => ({
  app: { http: (name, options) => routes.set(name, options) },
}));

const listQueryMock = vi.fn();
const listRequestMock = vi.fn(() => ({ input: vi.fn().mockReturnThis(), query: listQueryMock }));
const getPoolMock = vi.fn(async () => ({ request: listRequestMock }));

const beginMock = vi.fn(async () => {});
const commitMock = vi.fn(async () => {});
const rollbackMock = vi.fn(async () => {});
const requestQueryMock = vi.fn();

class TransactionMock {
  constructor(pool) {
    this.pool = pool;
    this.begin = beginMock;
    this.commit = commitMock;
    this.rollback = rollbackMock;
  }
}

class RequestMock {
  constructor(transaction) {
    this.transaction = transaction;
  }
  input() {
    return this;
  }
  query(...args) {
    return requestQueryMock(...args);
  }
}

vi.mock('../lib/db.js', () => ({
  sql: {
    UniqueIdentifier: 'UniqueIdentifier',
    Int: 'Int',
    NVarChar: 'NVarChar',
    Decimal: () => 'Decimal',
    Transaction: TransactionMock,
    Request: RequestMock,
  },
  getPool: (...args) => getPoolMock(...args),
}));

const requireRoleMock = vi.fn();
vi.mock('../lib/auth.js', () => ({
  requireRole: (...args) => requireRoleMock(...args),
}));

function fakeContext() {
  return { error: vi.fn() };
}

function fakeRequest(body) {
  return { json: async () => body };
}

describe('orders', () => {
  let listHandler;
  let createHandler;

  beforeAll(async () => {
    await import('./orders.js');
    listHandler = routes.get('listOrders').handler;
    createHandler = routes.get('createOrder').handler;
  });

  beforeEach(() => {
    listQueryMock.mockReset();
    listRequestMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: listRequestMock }));
    beginMock.mockClear();
    commitMock.mockClear();
    rollbackMock.mockClear();
    requestQueryMock.mockReset();
    requireRoleMock.mockReset();
  });

  describe('listOrders', () => {
    it('returns the auth status when unauthorized', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await listHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(401);
    });

    it('groups order_items under their parent order', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin', sub: 'admin-1' } });
      listQueryMock.mockResolvedValue({
        recordset: [
          {
            order_id: 'o1', customer_id: 'c1', status: 'draft', created_at: 't1', submitted_at: null,
            item_id: 'i1', product_id: 'p1', quantity: 2, unit_price: 5, notes: null,
            item_number: 'ABC', product_name: 'Widget',
          },
          {
            order_id: 'o1', customer_id: 'c1', status: 'draft', created_at: 't1', submitted_at: null,
            item_id: 'i2', product_id: 'p2', quantity: 1, unit_price: 3, notes: 'rush',
            item_number: 'DEF', product_name: 'Gadget',
          },
        ],
      });

      const result = await listHandler(fakeRequest(), fakeContext());

      expect(result.jsonBody).toHaveLength(1);
      expect(result.jsonBody[0].items).toHaveLength(2);
      expect(result.jsonBody[0].id).toBe('o1');
    });

    it('scopes the query to the customer when the caller is not an admin', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'customer', sub: 'cust-1' } });
      listQueryMock.mockResolvedValue({ recordset: [] });

      await listHandler(fakeRequest(), fakeContext());

      expect(listQueryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE o.customer_id = @customerId'));
    });

    it('returns an order with no items as an empty items array', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin', sub: 'admin-1' } });
      listQueryMock.mockResolvedValue({
        recordset: [
          { order_id: 'o1', customer_id: 'c1', status: 'draft', created_at: 't1', submitted_at: null, item_id: null },
        ],
      });

      const result = await listHandler(fakeRequest(), fakeContext());

      expect(result.jsonBody[0].items).toEqual([]);
    });

    it('returns 500 and logs on failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin', sub: 'admin-1' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();

      const result = await listHandler(fakeRequest(), context);

      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('createOrder', () => {
    it('returns the auth status when unauthorized', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await createHandler(fakeRequest({ items: [] }), fakeContext());
      expect(result.status).toBe(401);
    });

    it('returns 400 when there are no items', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'cust-1', role: 'customer' } });
      const result = await createHandler(fakeRequest({ items: [] }), fakeContext());
      expect(result.status).toBe(400);
    });

    it('creates the order and its items inside a transaction', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'cust-1', role: 'customer' } });
      requestQueryMock
        .mockResolvedValueOnce({ recordset: [{ id: 'order-1', status: 'draft', created_at: 't1' }] })
        .mockResolvedValueOnce({ recordset: [{ company_price: 5 }] })
        .mockResolvedValueOnce({});

      const result = await createHandler(
        fakeRequest({ items: [{ productId: 'p1', quantity: 2 }] }),
        fakeContext()
      );

      expect(result.status).toBe(201);
      expect(result.jsonBody).toEqual({ id: 'order-1', status: 'draft', createdAt: 't1' });
      expect(commitMock).toHaveBeenCalled();
      expect(rollbackMock).not.toHaveBeenCalled();
    });

    it('rolls back and returns 500 when a product is missing or inactive', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'cust-1', role: 'customer' } });
      requestQueryMock
        .mockResolvedValueOnce({ recordset: [{ id: 'order-1', status: 'draft', created_at: 't1' }] })
        .mockResolvedValueOnce({ recordset: [] });
      const context = fakeContext();

      const result = await createHandler(
        fakeRequest({ items: [{ productId: 'missing-product', quantity: 1 }] }),
        context
      );

      expect(result.status).toBe(500);
      expect(rollbackMock).toHaveBeenCalled();
      expect(context.error).toHaveBeenCalled();
    });

    it('never begins a transaction when the pool connection itself fails', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'cust-1', role: 'customer' } });
      getPoolMock.mockRejectedValueOnce(new Error('connection failed'));
      const context = fakeContext();

      const result = await createHandler(
        fakeRequest({ items: [{ productId: 'p1', quantity: 1 }] }),
        context
      );

      expect(result.status).toBe(500);
      expect(result.jsonBody.error).toBe('connection failed');
      expect(rollbackMock).not.toHaveBeenCalled();
    });

    it('swallows a rollback failure and still returns the original error', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'cust-1', role: 'customer' } });
      requestQueryMock.mockRejectedValueOnce(new Error('insert failed'));
      rollbackMock.mockRejectedValueOnce(new Error('nothing to roll back'));
      const context = fakeContext();

      const result = await createHandler(
        fakeRequest({ items: [{ productId: 'p1', quantity: 1 }] }),
        context
      );

      expect(result.status).toBe(500);
      expect(result.jsonBody.error).toBe('insert failed');
      expect(rollbackMock).toHaveBeenCalled();
    });
  });
});
