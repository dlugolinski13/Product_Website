import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const routes = new Map();
vi.mock('@azure/functions', () => ({
  app: { http: (name, options) => routes.set(name, options) },
}));

const queryMock = vi.fn();
const inputMock = vi.fn().mockReturnThis();
const requestMock = vi.fn(() => ({ input: inputMock, query: queryMock }));
const getPoolMock = vi.fn(async () => ({ request: requestMock }));
vi.mock('../lib/db.js', () => ({
  sql: {
    NVarChar: 'NVarChar',
    Char: () => 'Char',
    Int: 'Int',
    Date: 'Date',
    Decimal: () => 'Decimal',
  },
  getPool: (...args) => getPoolMock(...args),
}));

const requireRoleMock = vi.fn();
vi.mock('../lib/auth.js', () => ({
  requireRole: (...args) => requireRoleMock(...args),
}));

const getImageUrlMock = vi.fn((blobName) => `https://blob.example.com/${blobName}`);
vi.mock('../lib/blobStorage.js', () => ({
  getImageUrl: (...args) => getImageUrlMock(...args),
}));

function fakeContext() {
  return { error: vi.fn() };
}

function fakeRequest(body) {
  return { json: async () => body };
}

describe('products', () => {
  let listHandler;
  let createHandler;

  beforeAll(async () => {
    await import('./products.js');
    listHandler = routes.get('listProducts').handler;
    createHandler = routes.get('createProduct').handler;
  });

  beforeEach(() => {
    queryMock.mockReset();
    requestMock.mockClear();
    inputMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: requestMock }));
    requireRoleMock.mockReset();
    getImageUrlMock.mockClear();
  });

  describe('listProducts', () => {
    it('returns the auth status when unauthorized', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await listHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(401);
    });

    it('joins products with their images', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'customer' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [{ id: 'p1', name: 'Widget' }] })
        .mockResolvedValueOnce({ recordset: [{ product_id: 'p1', blob_name: 'p1/a.png' }] });

      const result = await listHandler(fakeRequest(), fakeContext());

      expect(result.jsonBody).toEqual([
        { id: 'p1', name: 'Widget', images: ['https://blob.example.com/p1/a.png'] },
      ]);
    });

    it('returns products with an empty images array when none exist', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'customer' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [{ id: 'p1', name: 'Widget' }] })
        .mockResolvedValueOnce({ recordset: [] });

      const result = await listHandler(fakeRequest(), fakeContext());

      expect(result.jsonBody).toEqual([{ id: 'p1', name: 'Widget', images: [] }]);
    });

    it('returns 500 and logs on failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'customer' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();

      const result = await listHandler(fakeRequest(), context);

      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('createProduct', () => {
    const validBody = {
      itemNumber: 'ABC123',
      name: 'Widget',
      shippingMethod: 'drop_ship',
      groupCode: 'WDGT',
      classNumber: 1,
      companyPrice: 5,
      retailPrice: 10,
    };

    it('returns the auth status when not admin', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 403 });
      const result = await createHandler(fakeRequest(validBody), fakeContext());
      expect(result.status).toBe(403);
    });

    it('returns 400 when required fields are missing', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin' } });
      const { name, ...withoutName } = validBody;
      const result = await createHandler(fakeRequest(withoutName), fakeContext());
      expect(result.status).toBe(400);
      expect(result.jsonBody.error).toContain('name');
    });

    it('inserts the product and returns its id', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin' } });
      queryMock.mockResolvedValue({ recordset: [{ id: 'new-id' }] });

      const result = await createHandler(fakeRequest(validBody), fakeContext());

      expect(result.status).toBe(201);
      expect(result.jsonBody).toEqual({ id: 'new-id' });
    });

    it('returns 500 and logs when the insert fails', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin' } });
      getPoolMock.mockRejectedValueOnce(new Error('insert failed'));
      const context = fakeContext();

      const result = await createHandler(fakeRequest(validBody), context);

      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });
});
