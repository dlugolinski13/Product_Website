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

function fakeRequest(body, params = {}) {
  return { json: async () => body, params };
}

describe('account', () => {
  let getHandler;
  let updateHandler;
  let listCustomersHandler;
  let assignHandler;
  let removeHandler;

  beforeAll(() => {
    loadWithMocks(
      nodeRequire,
      {
        '@azure/functions': { app: { http: (name, options) => routes.set(name, options) } },
        '../../src/lib/db': {
          sql: { UniqueIdentifier: 'UniqueIdentifier', NVarChar: 'NVarChar' },
          getPool: (...args) => getPoolMock(...args),
        },
        '../../src/lib/auth': { requireRole: (...args) => requireRoleMock(...args) },
      },
      '../../src/functions/account.js'
    );
    getHandler = routes.get('getAccount').handler;
    updateHandler = routes.get('updateAccount').handler;
    listCustomersHandler = routes.get('listCustomers').handler;
    assignHandler = routes.get('assignSalesperson').handler;
    removeHandler = routes.get('removeCustomer').handler;
  });

  beforeEach(() => {
    queryMock.mockReset();
    requestMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: requestMock }));
    requireRoleMock.mockReset();
  });

  describe('getAccount', () => {
    it('returns 401 when unauthorized', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await getHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1', role: 'customer' } });
      queryMock.mockResolvedValue({ recordset: [] });
      const result = await getHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(404);
    });

    it('returns user profile with empty salespersons when none assigned', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1', role: 'customer' } });
      queryMock
        .mockResolvedValueOnce({
          recordset: [{
            id: 'u1', email: 'a@b.com', full_name: 'Alice', role: 'customer',
            address_line1: '1 Main St', address_line2: null, city: 'Springfield',
            state: 'IL', postal_code: '62701', country: 'US',
          }],
        })
        .mockResolvedValueOnce({ recordset: [] });
      const result = await getHandler(fakeRequest(), fakeContext());
      expect(result.jsonBody).toEqual({
        id: 'u1', email: 'a@b.com', fullName: 'Alice', role: 'customer',
        addressLine1: '1 Main St', addressLine2: null, city: 'Springfield',
        state: 'IL', postalCode: '62701', country: 'US',
        salespersons: [],
      });
    });

    it('returns user profile with assigned salespersons', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1', role: 'customer' } });
      queryMock
        .mockResolvedValueOnce({
          recordset: [{
            id: 'u1', email: 'a@b.com', full_name: 'Alice', role: 'customer',
            address_line1: null, address_line2: null, city: null,
            state: null, postal_code: null, country: null,
          }],
        })
        .mockResolvedValueOnce({
          recordset: [
            { id: 'sp1', full_name: 'Bob', email: 'bob@co.com' },
            { id: 'sp2', full_name: 'Carol', email: 'carol@co.com' },
          ],
        });
      const result = await getHandler(fakeRequest(), fakeContext());
      expect(result.jsonBody.salespersons).toEqual([
        { id: 'sp1', fullName: 'Bob', email: 'bob@co.com' },
        { id: 'sp2', fullName: 'Carol', email: 'carol@co.com' },
      ]);
    });

    it('returns 500 and logs on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1', role: 'customer' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await getHandler(fakeRequest(), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('updateAccount', () => {
    it('returns 401 when unauthorized', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await updateHandler(fakeRequest({}), fakeContext());
      expect(result.status).toBe(401);
    });

    it('updates profile and returns 204', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1', role: 'customer' } });
      queryMock.mockResolvedValue({});
      const result = await updateHandler(
        fakeRequest({ fullName: 'Alice', city: 'Denver', postalCode: '80201' }),
        fakeContext()
      );
      expect(result.status).toBe(204);
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('UPDATE dbo.users'));
    });

    it('returns 500 and logs on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1', role: 'customer' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await updateHandler(fakeRequest({}), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('listCustomers', () => {
    it('returns 401 when unauthorized', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await listCustomersHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(401);
    });

    it('returns 403 when caller is not a salesperson', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 403 });
      const result = await listCustomersHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(403);
    });

    it('returns assigned customers and available customers', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'sp1', role: 'salesperson' } });
      queryMock
        .mockResolvedValueOnce({
          recordset: [
            { id: 'c1', email: 'c@x.com', full_name: 'Carol' },
          ],
        })
        .mockResolvedValueOnce({
          recordset: [
            { id: 'c2', email: 'd@x.com', full_name: 'Dave' },
          ],
        });

      const result = await listCustomersHandler(fakeRequest(), fakeContext());

      expect(result.jsonBody.customers).toHaveLength(1);
      expect(result.jsonBody.customers[0]).toEqual({ id: 'c1', email: 'c@x.com', fullName: 'Carol' });
      expect(result.jsonBody.availableCustomers).toHaveLength(1);
      expect(result.jsonBody.availableCustomers[0]).toEqual({ id: 'c2', email: 'd@x.com', fullName: 'Dave' });
    });

    it('returns empty lists when no customers', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'sp1', role: 'salesperson' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      const result = await listCustomersHandler(fakeRequest(), fakeContext());
      expect(result.jsonBody.customers).toHaveLength(0);
      expect(result.jsonBody.availableCustomers).toHaveLength(0);
    });

    it('returns 500 and logs on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'sp1', role: 'salesperson' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await listCustomersHandler(fakeRequest(), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('assignSalesperson', () => {
    it('returns 401 when unauthorized', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await assignHandler(fakeRequest({}, { customerId: 'c1' }), fakeContext());
      expect(result.status).toBe(401);
    });

    it('returns 403 when caller is not a salesperson', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 403 });
      const result = await assignHandler(fakeRequest({}, { customerId: 'c1' }), fakeContext());
      expect(result.status).toBe(403);
    });

    it('returns 404 when customer is not found', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'sp1', role: 'salesperson' } });
      queryMock.mockResolvedValue({ recordset: [] });
      const result = await assignHandler(
        fakeRequest({}, { customerId: 'missing' }),
        fakeContext()
      );
      expect(result.status).toBe(404);
    });

    it('adds customer to salesperson list and returns 204', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'sp1', role: 'salesperson' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [{ id: 'c1' }] })
        .mockResolvedValueOnce({});
      const result = await assignHandler(
        fakeRequest({}, { customerId: 'c1' }),
        fakeContext()
      );
      expect(result.status).toBe(204);
      expect(queryMock).toHaveBeenCalledTimes(2);
      expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO salesperson_customers'));
    });

    it('returns 500 and logs on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'sp1', role: 'salesperson' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await assignHandler(fakeRequest({}, { customerId: 'c1' }), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('removeCustomer', () => {
    it('returns 401 when unauthorized', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await removeHandler(fakeRequest({}, { customerId: 'c1' }), fakeContext());
      expect(result.status).toBe(401);
    });

    it('returns 403 when caller is not a salesperson', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 403 });
      const result = await removeHandler(fakeRequest({}, { customerId: 'c1' }), fakeContext());
      expect(result.status).toBe(403);
    });

    it('returns 404 when customer is not found', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'sp1', role: 'salesperson' } });
      queryMock.mockResolvedValue({ recordset: [] });
      const result = await removeHandler(
        fakeRequest({}, { customerId: 'missing' }),
        fakeContext()
      );
      expect(result.status).toBe(404);
    });

    it('removes customer from salesperson list and returns 204', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'sp1', role: 'salesperson' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [{ id: 'c1' }] })
        .mockResolvedValueOnce({});
      const result = await removeHandler(
        fakeRequest({}, { customerId: 'c1' }),
        fakeContext()
      );
      expect(result.status).toBe(204);
      expect(queryMock).toHaveBeenCalledTimes(2);
      expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('DELETE FROM dbo.salesperson_customers'));
    });

    it('returns 500 and logs on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'sp1', role: 'salesperson' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await removeHandler(fakeRequest({}, { customerId: 'c1' }), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });
});
