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

function fakeRequest(body = {}, params = {}) {
  return { json: async () => body, params };
}

describe('notifications', () => {
  let listHandler;
  let createHandler;
  let toggleHandler;

  beforeAll(() => {
    loadWithMocks(
      nodeRequire,
      {
        '@azure/functions': { app: { http: (name, options) => routes.set(name, options) } },
        '../../src/lib/db': {
          sql: { NVarChar: 'NVarChar', UniqueIdentifier: 'UniqueIdentifier', Int: 'Int', Bit: 'Bit' },
          getPool: (...args) => getPoolMock(...args),
        },
        '../../src/lib/auth': { requireRole: (...args) => requireRoleMock(...args) },
      },
      '../../src/functions/notifications.js'
    );
    listHandler = routes.get('listNotifications').handler;
    createHandler = routes.get('createNotification').handler;
    toggleHandler = routes.get('toggleNotification').handler;
  });

  beforeEach(() => {
    queryMock.mockReset();
    requestMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: requestMock }));
    requireRoleMock.mockReset();
  });

  describe('listNotifications', () => {
    it('returns 401 when unauthenticated', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      expect((await listHandler(fakeRequest(), fakeContext())).status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 403 });
      expect((await listHandler(fakeRequest(), fakeContext())).status).toBe(403);
    });

    it('returns notifications list', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock.mockResolvedValueOnce({
        recordset: [
          { id: 1, message: 'Hello', created_at: '2024-01-01', is_active: 1 },
          { id: 2, message: 'World', created_at: '2024-01-02', is_active: 0 },
        ],
      });
      const result = await listHandler(fakeRequest(), fakeContext());
      expect(result.jsonBody.notifications).toHaveLength(2);
      expect(result.jsonBody.notifications[0]).toMatchObject({ id: 1, message: 'Hello', isActive: true });
      expect(result.jsonBody.notifications[1]).toMatchObject({ id: 2, message: 'World', isActive: false });
    });

    it('returns empty list when no notifications', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock.mockResolvedValueOnce({ recordset: [] });
      const result = await listHandler(fakeRequest(), fakeContext());
      expect(result.jsonBody.notifications).toHaveLength(0);
    });

    it('returns 500 on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await listHandler(fakeRequest(), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('createNotification', () => {
    it('returns 401 when unauthenticated', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      expect((await createHandler(fakeRequest({ message: 'hi' }), fakeContext())).status).toBe(401);
    });

    it('returns 400 when message is missing', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      const result = await createHandler(fakeRequest({}), fakeContext());
      expect(result.status).toBe(400);
      expect(result.jsonBody.error).toMatch(/message/);
    });

    it('returns 400 when message is blank', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      const result = await createHandler(fakeRequest({ message: '   ' }), fakeContext());
      expect(result.status).toBe(400);
    });

    it('creates notification and returns 201 with the new record', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock.mockResolvedValueOnce({
        recordset: [{ id: 5, message: 'Test msg', created_at: '2024-01-03', is_active: 1 }],
      });
      const result = await createHandler(fakeRequest({ message: 'Test msg' }), fakeContext());
      expect(result.status).toBe(201);
      expect(result.jsonBody).toMatchObject({ id: 5, message: 'Test msg', isActive: true });
    });

    it('returns 500 on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await createHandler(fakeRequest({ message: 'hi' }), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('toggleNotification', () => {
    it('returns 401 when unauthenticated', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      expect((await toggleHandler(fakeRequest({}, { id: '1' }), fakeContext())).status).toBe(401);
    });

    it('returns 404 when notification not found', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock.mockResolvedValueOnce({ recordset: [] });
      const result = await toggleHandler(fakeRequest({}, { id: '99' }), fakeContext());
      expect(result.status).toBe(404);
      expect(result.jsonBody.error).toBe('Notification not found');
    });

    it('toggles active notification to inactive and returns 204', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [{ id: 1, is_active: 1 }] })
        .mockResolvedValueOnce({});
      const result = await toggleHandler(fakeRequest({}, { id: '1' }), fakeContext());
      expect(result.status).toBe(204);
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('UPDATE dbo.notifications SET is_active'));
    });

    it('toggles inactive notification to active and returns 204', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      queryMock
        .mockResolvedValueOnce({ recordset: [{ id: 2, is_active: 0 }] })
        .mockResolvedValueOnce({});
      const result = await toggleHandler(fakeRequest({}, { id: '2' }), fakeContext());
      expect(result.status).toBe(204);
    });

    it('returns 500 on db failure', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { sub: 'a1', role: 'admin' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();
      const result = await toggleHandler(fakeRequest({}, { id: '1' }), context);
      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });
});
