import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { loadWithMocks } from '../testUtils/mockRequire.js';

const nodeRequire = createRequire(import.meta.url);

const connectMock = vi.fn();

function loadDb() {
  return loadWithMocks(nodeRequire, { mssql: { connect: (...args) => connectMock(...args) } }, './db.js');
}

describe('db', () => {
  const originalConnectionString = process.env.SQL_CONNECTION_STRING;

  beforeEach(() => {
    connectMock.mockReset();
  });

  afterEach(() => {
    process.env.SQL_CONNECTION_STRING = originalConnectionString;
  });

  it('throws when SQL_CONNECTION_STRING is not set', () => {
    delete process.env.SQL_CONNECTION_STRING;
    const { getPool } = loadDb();
    expect(() => getPool()).toThrow('SQL_CONNECTION_STRING is not set');
  });

  it('connects using the configured connection string', async () => {
    process.env.SQL_CONNECTION_STRING = 'Server=tcp:test;Database=test;';
    const fakePool = { request: vi.fn() };
    connectMock.mockResolvedValue(fakePool);

    const { getPool } = loadDb();
    const pool = await getPool();

    expect(connectMock).toHaveBeenCalledWith('Server=tcp:test;Database=test;');
    expect(pool).toBe(fakePool);
  });

  it('reuses the same pool promise across calls', async () => {
    process.env.SQL_CONNECTION_STRING = 'Server=tcp:test;Database=test;';
    connectMock.mockResolvedValue({ request: vi.fn() });

    const { getPool } = loadDb();
    await getPool();
    await getPool();

    expect(connectMock).toHaveBeenCalledTimes(1);
  });
});
