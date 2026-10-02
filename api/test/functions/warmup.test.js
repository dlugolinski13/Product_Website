import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { loadWithMocks } from '../testUtils/mockRequire.js';

const nodeRequire = createRequire(import.meta.url);

const routes = new Map();
const queryMock = vi.fn();
const requestMock = vi.fn(() => ({ query: queryMock }));
const getPoolMock = vi.fn(async () => ({ request: requestMock }));

function fakeContext() {
  return { error: vi.fn() };
}

describe('warmup', () => {
  let handler;

  beforeAll(() => {
    loadWithMocks(
      nodeRequire,
      {
        '@azure/functions': { app: { http: (name, options) => routes.set(name, options) } },
        '../../src/lib/db': { getPool: (...args) => getPoolMock(...args) },
      },
      '../../src/functions/warmup.js'
    );
    handler = routes.get('warmup').handler;
  });

  beforeEach(() => {
    queryMock.mockReset();
    requestMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: requestMock }));
  });

  it('pings the database and returns ok', async () => {
    queryMock.mockResolvedValue({ recordset: [{ '': 1 }] });

    const result = await handler({}, fakeContext());

    expect(queryMock).toHaveBeenCalledWith('SELECT 1');
    expect(result).toEqual({ status: 200, jsonBody: { status: 'ok' } });
  });

  it('returns 500 and logs on failure', async () => {
    getPoolMock.mockRejectedValueOnce(new Error('db down'));
    const context = fakeContext();

    const result = await handler({}, context);

    expect(result.status).toBe(500);
    expect(context.error).toHaveBeenCalled();
  });
});
