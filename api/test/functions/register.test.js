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

describe('register', () => {
  let handler;

  beforeAll(() => {
    loadWithMocks(
      nodeRequire,
      {
        '@azure/functions': { app: { http: (name, options) => routes.set(name, options) } },
        '../../src/lib/db': { sql: { NVarChar: 'NVarChar' }, getPool: (...args) => getPoolMock(...args) },
        '../../src/lib/auth': { signToken: (...args) => signTokenMock(...args) },
      },
      '../../src/functions/register.js'
    );
    handler = routes.get('register').handler;
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

  it('returns 409 when email is already taken', async () => {
    queryMock.mockResolvedValueOnce({ recordset: [{ id: 'existing-id' }] });
    const result = await handler(fakeRequest({ email: 'taken@example.com', password: 'pw' }), fakeContext());
    expect(result.status).toBe(409);
    expect(result.jsonBody.error).toMatch(/already exists/i);
  });

  it('creates the user and returns a token on success', async () => {
    queryMock
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [{ id: 'new-id', email: 'new@example.com', role: 'customer' }] });
    const result = await handler(fakeRequest({ email: 'new@example.com', password: 'pw' }), fakeContext());
    expect(result.status).toBe(201);
    expect(result.jsonBody).toEqual({ token: 'signed-jwt', role: 'customer' });
    expect(signTokenMock).toHaveBeenCalledWith({ id: 'new-id', email: 'new@example.com', role: 'customer' });
  });

  it('hashes the password before storing', async () => {
    queryMock
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [{ id: 'new-id', email: 'new@example.com', role: 'customer' }] });
    await handler(fakeRequest({ email: 'new@example.com', password: 'plaintext' }), fakeContext());
    const insertCall = queryMock.mock.calls[1][0];
    expect(insertCall).toContain('INSERT INTO users');
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
