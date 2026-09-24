import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import { loadWithMocks } from '../testUtils/mockRequire.js';

const nodeRequire = createRequire(import.meta.url);

const routes = new Map();
const queryMock = vi.fn();
const requestMock = vi.fn(() => ({ input: vi.fn().mockReturnThis(), query: queryMock }));
const getPoolMock = vi.fn(async () => ({ request: requestMock }));
const signTokenMock = vi.fn(() => 'signed-jwt');

function fakeContext() {
  return { error: vi.fn() };
}

function fakeRequest(body) {
  return { json: async () => body };
}

describe('login', () => {
  let handler;

  beforeAll(() => {
    loadWithMocks(
      nodeRequire,
      {
        '@azure/functions': { app: { http: (name, options) => routes.set(name, options) } },
        '../lib/db': { sql: { NVarChar: 'NVarChar' }, getPool: (...args) => getPoolMock(...args) },
        '../lib/auth': { signToken: (...args) => signTokenMock(...args) },
      },
      './login.js'
    );
    handler = routes.get('login').handler;
  });

  beforeEach(() => {
    queryMock.mockReset();
    requestMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: requestMock }));
    signTokenMock.mockClear();
  });

  it('returns 400 when email or password is missing', async () => {
    const result = await handler(fakeRequest({ email: 'a@example.com' }), fakeContext());
    expect(result.status).toBe(400);
  });

  it('returns 401 for an unknown email', async () => {
    queryMock.mockResolvedValue({ recordset: [] });
    const result = await handler(fakeRequest({ email: 'nobody@example.com', password: 'pw' }), fakeContext());
    expect(result.status).toBe(401);
  });

  it('returns 401 for a wrong password', async () => {
    const hash = await bcrypt.hash('correct-password', 4);
    queryMock.mockResolvedValue({ recordset: [{ id: '1', email: 'a@example.com', password_hash: hash, role: 'customer' }] });
    const result = await handler(fakeRequest({ email: 'a@example.com', password: 'wrong' }), fakeContext());
    expect(result.status).toBe(401);
  });

  it('returns a token and role for valid credentials', async () => {
    const hash = await bcrypt.hash('correct-password', 4);
    queryMock.mockResolvedValue({ recordset: [{ id: '1', email: 'a@example.com', password_hash: hash, role: 'admin' }] });
    const result = await handler(fakeRequest({ email: 'a@example.com', password: 'correct-password' }), fakeContext());
    expect(result.jsonBody).toEqual({ token: 'signed-jwt', role: 'admin' });
  });

  it('returns 500 and logs when the database call fails', async () => {
    getPoolMock.mockRejectedValueOnce(new Error('db down'));
    const context = fakeContext();
    const result = await handler(fakeRequest({ email: 'a@example.com', password: 'pw' }), context);
    expect(result.status).toBe(500);
    expect(result.jsonBody.error).toBe('db down');
    expect(context.error).toHaveBeenCalled();
  });
});
