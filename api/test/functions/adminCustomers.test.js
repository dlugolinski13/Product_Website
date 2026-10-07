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

describe('adminCustomers', () => {
  let listHandler;
  let assignHandler;

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
      '../../src/functions/adminCustomers.js'
    );
    listHandler = routes.get('adminListCustomers').handler;
    assignHandler = routes.get('adminAssignSalesperson').handler;
  });

  beforeEach(() => {
    queryMock.mockReset();
    requestMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: requestMock }));
    requireRoleMock.mockReset();
  });

  describe('adminListCustomers', () => {
    it('returns 401 when unauthenticated', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await listHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(401);
    });

    it('returns 403 when caller is not an admin', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 403 });
      const result = await listHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(403);
    });

    it('returns customers and salespeople', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock
        .mockResolvedValueOnce({
          recordset: [
            { id: 'c1', email: 'carol@x.com', full_name: 'Carol', salesperson_id: 'sp1' },
            { id: 'c2', email: 'dave@x.com', full_name: 'Dave', salesperson_id: null },
          ],
        })
        .mockResolvedValueOnce({
          recordset: [
            { id: 'sp1', email: 'bob@co.com', full_name: 'Bob' },
          ],
        });

      const result = await listHandler(fakeRequest(), fakeContext());

      expect(result.jsonBody.customers).toHaveLength(2);
      expect(result.jsonBody.customers[0]).toEqual({ id: 'c1', email: 'carol@x.com', fullName: 'Carol', salespersonId: 'sp1' });
      expect(result.jsonBody.customers[1]).toEqual({ id: 'c2', email: 'dave@x.com', fullName: 'Dave', salespersonId: null });
      expect(result.jsonBody.salespeople).toHaveLength(1);
      expect(result.jsonBody.salespeople[0]).toEqual({ id: 'sp1', email: 'bob@co.com', fullName: 'Bob' });
    });

    it('returns empty lists when no customers or salespeople exist', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      const result = await listHandler(fakeRequest(), fakeContext());
      expect(result.jsonBody.customers).toHaveLength(0);
      expect(result.jsonBody.salespeople).toHaveLength(0);
    });

    it('returns 500 and logs on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await listHandler(fakeRequest(), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('adminAssignSalesperson', () => {
    it('returns 401 when unauthenticated', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await assignHandler(fakeRequest({}, { customerId: 'c1' }), fakeContext());
      expect(result.status).toBe(401);
    });

    it('returns 403 when caller is not an admin', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 403 });
      const result = await assignHandler(fakeRequest({}, { customerId: 'c1' }), fakeContext());
      expect(result.status).toBe(403);
    });

    it('returns 404 when customer is not found', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock.mockResolvedValue({ recordset: [] });
      const result = await assignHandler(
        fakeRequest({ salespersonId: 'sp1' }, { customerId: 'missing' }),
        fakeContext()
      );
      expect(result.status).toBe(404);
      expect(result.jsonBody.error).toBe('Customer not found');
    });

    it('returns 404 when salesperson is not found', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [{ id: 'c1' }] })
        .mockResolvedValueOnce({ recordset: [] });
      const result = await assignHandler(
        fakeRequest({ salespersonId: 'missing-sp' }, { customerId: 'c1' }),
        fakeContext()
      );
      expect(result.status).toBe(404);
      expect(result.jsonBody.error).toBe('Salesperson not found');
    });

    it('assigns salesperson and returns 204', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [{ id: 'c1' }] })
        .mockResolvedValueOnce({ recordset: [{ id: 'sp1' }] })
        .mockResolvedValueOnce({});
      const result = await assignHandler(
        fakeRequest({ salespersonId: 'sp1' }, { customerId: 'c1' }),
        fakeContext()
      );
      expect(result.status).toBe(204);
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('UPDATE dbo.users SET salesperson_id'));
    });

    it('clears salesperson assignment when salespersonId is null', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [{ id: 'c1' }] })
        .mockResolvedValueOnce({});
      const result = await assignHandler(
        fakeRequest({ salespersonId: null }, { customerId: 'c1' }),
        fakeContext()
      );
      expect(result.status).toBe(204);
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('UPDATE dbo.users SET salesperson_id'));
    });

    it('returns 500 and logs on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await assignHandler(
        fakeRequest({ salespersonId: 'sp1' }, { customerId: 'c1' }),
        context
      );
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });
});
