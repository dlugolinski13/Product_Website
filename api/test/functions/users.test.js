import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import { loadWithMocks } from '../testUtils/mockRequire.js';

const nodeRequire = createRequire(import.meta.url);

const routes = new Map();
const queryMock = vi.fn();
const inputMock = vi.fn().mockReturnThis();
const requestMock = vi.fn(() => ({ input: inputMock, query: queryMock }));
const getPoolMock = vi.fn(async () => ({ request: requestMock }));
const requireRoleMock = vi.fn();

function fakeContext() {
  return { error: vi.fn() };
}

function fakeRequest(body) {
  return { json: async () => body };
}

describe('users', () => {
  let getHandler;
  let updateHandler;

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
      },
      '../../src/functions/users.js'
    );
    getHandler = routes.get('getProfile').handler;
    updateHandler = routes.get('updateProfile').handler;
  });

  beforeEach(() => {
    queryMock.mockReset();
    requestMock.mockClear();
    inputMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: requestMock }));
    requireRoleMock.mockReset();
  });

  describe('getProfile', () => {
    it('returns the auth status when unauthorized', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await getHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(401);
    });

    it('returns 404 when the user no longer exists', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1' } });
      queryMock.mockResolvedValue({ recordset: [] });
      const result = await getHandler(fakeRequest(), fakeContext());
      expect(result.status).toBe(404);
    });

    it('returns the profile', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1' } });
      queryMock.mockResolvedValue({
        recordset: [{ id: 'u1', email: 'a@example.com', full_name: 'Alice', role: 'customer' }],
      });
      const result = await getHandler(fakeRequest(), fakeContext());
      expect(result.jsonBody).toEqual({ id: 'u1', email: 'a@example.com', fullName: 'Alice', role: 'customer' });
    });

    it('returns 500 and logs on failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await getHandler(fakeRequest(), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('returns the auth status when unauthorized', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 403 });
      const result = await updateHandler(fakeRequest({}), fakeContext());
      expect(result.status).toBe(403);
    });

    it('returns 400 when there is nothing to update', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1' } });
      const result = await updateHandler(fakeRequest({}), fakeContext());
      expect(result.status).toBe(400);
    });

    it('updates the full name', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1' } });
      queryMock.mockResolvedValue({});
      const result = await updateHandler(fakeRequest({ fullName: 'Alice B' }), fakeContext());
      expect(result.status).toBe(200);
      expect(inputMock).toHaveBeenCalledWith('fullName', 'NVarChar', 'Alice B');
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('full_name = @fullName'));
    });

    it('hashes and updates the password', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1' } });
      queryMock.mockResolvedValue({});
      const result = await updateHandler(fakeRequest({ password: 'new-password' }), fakeContext());
      expect(result.status).toBe(200);
      const [, , hash] = inputMock.mock.calls.find(([name]) => name === 'passwordHash');
      expect(await bcrypt.compare('new-password', hash)).toBe(true);
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('password_hash = @passwordHash'));
    });

    it('returns 500 and logs on failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'u1' } });
      getPoolMock.mockRejectedValueOnce(new Error('update failed'));
      const context = fakeContext();
      const result = await updateHandler(fakeRequest({ fullName: 'Alice' }), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });
});
