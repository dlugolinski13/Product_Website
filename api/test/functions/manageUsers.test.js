import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { loadWithMocks } from '../testUtils/mockRequire.js';

const nodeRequire = createRequire(import.meta.url);

const routes = new Map();
const queryMock = vi.fn();
const requestMock = vi.fn(() => ({ input: vi.fn().mockReturnThis(), query: queryMock }));
const getPoolMock = vi.fn(async () => ({ request: requestMock }));
const requireRoleMock = vi.fn();
const bcryptHashMock = vi.fn();

function fakeContext() {
  return { error: vi.fn() };
}

function fakeRequest(body) {
  return { json: async () => body, params: {} };
}

describe('manageUsers', () => {
  let createHandler;

  beforeAll(() => {
    loadWithMocks(
      nodeRequire,
      {
        '@azure/functions': { app: { http: (name, options) => routes.set(name, options) } },
        '../../src/lib/db': {
          sql: { NVarChar: 'NVarChar', UniqueIdentifier: 'UniqueIdentifier' },
          getPool: (...args) => getPoolMock(...args),
        },
        '../../src/lib/auth': { requireRole: (...args) => requireRoleMock(...args) },
        bcryptjs: { hash: (...args) => bcryptHashMock(...args) },
      },
      '../../src/functions/manageUsers.js'
    );
    createHandler = routes.get('adminCreateUser').handler;
  });

  beforeEach(() => {
    queryMock.mockReset();
    requestMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: requestMock }));
    requireRoleMock.mockReset();
    bcryptHashMock.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    requireRoleMock.mockReturnValue({ ok: false, status: 401 });
    const result = await createHandler(fakeRequest({}), fakeContext());
    expect(result.status).toBe(401);
  });

  it('returns 403 when caller is not an admin', async () => {
    requireRoleMock.mockReturnValue({ ok: false, status: 403 });
    const result = await createHandler(fakeRequest({}), fakeContext());
    expect(result.status).toBe(403);
  });

  it('returns 400 when email is missing', async () => {
    requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
    const result = await createHandler(fakeRequest({ password: 'pass', role: 'salesperson' }), fakeContext());
    expect(result.status).toBe(400);
    expect(result.jsonBody.error).toMatch(/email/);
  });

  it('returns 400 when password is missing', async () => {
    requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
    const result = await createHandler(fakeRequest({ email: 'a@b.com', role: 'salesperson' }), fakeContext());
    expect(result.status).toBe(400);
    expect(result.jsonBody.error).toMatch(/password/);
  });

  it('returns 400 when role is invalid', async () => {
    requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
    const result = await createHandler(
      fakeRequest({ email: 'a@b.com', password: 'pass', role: 'admin' }),
      fakeContext()
    );
    expect(result.status).toBe(400);
    expect(result.jsonBody.error).toMatch(/role/);
  });

  it('returns 409 when email already exists', async () => {
    requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
    queryMock.mockResolvedValueOnce({ recordset: [{ id: 'existing' }] });
    const result = await createHandler(
      fakeRequest({ email: 'exists@b.com', password: 'pass', role: 'salesperson' }),
      fakeContext()
    );
    expect(result.status).toBe(409);
    expect(result.jsonBody.error).toMatch(/already exists/);
  });

  it('creates a salesperson and returns 201', async () => {
    requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
    queryMock
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [{ id: 'new-id', email: 'sp@b.com', role: 'salesperson' }] });
    bcryptHashMock.mockResolvedValue('hashed');

    const result = await createHandler(
      fakeRequest({ email: 'sp@b.com', password: 'pass', role: 'salesperson', fullName: 'Sam' }),
      fakeContext()
    );
    expect(result.status).toBe(201);
    expect(result.jsonBody.email).toBe('sp@b.com');
    expect(result.jsonBody.role).toBe('salesperson');
  });

  it('creates a customer and returns 201', async () => {
    requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
    queryMock
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [{ id: 'cust-id', email: 'c@b.com', role: 'customer' }] });
    bcryptHashMock.mockResolvedValue('hashed');

    const result = await createHandler(
      fakeRequest({ email: 'c@b.com', password: 'pass', role: 'customer', phone: '555-1234' }),
      fakeContext()
    );
    expect(result.status).toBe(201);
    expect(result.jsonBody.role).toBe('customer');
  });

  it('returns 500 and logs on db failure', async () => {
    requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
    getPoolMock.mockRejectedValueOnce(new Error('db down'));
    bcryptHashMock.mockResolvedValue('hashed');
    const context = fakeContext();
    const result = await createHandler(
      fakeRequest({ email: 'x@b.com', password: 'pass', role: 'salesperson' }),
      context
    );
    expect(result.status).toBe(500);
    expect(context.error).toHaveBeenCalled();
  });
});
