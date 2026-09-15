import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const connectMock = vi.fn();
vi.mock('mssql', () => ({
  default: { connect: (...args) => connectMock(...args) },
  connect: (...args) => connectMock(...args),
}));

describe('db', () => {
  const originalConnectionString = process.env.SQL_CONNECTION_STRING;

  beforeEach(() => {
    vi.resetModules();
    connectMock.mockReset();
  });

  afterEach(() => {
    process.env.SQL_CONNECTION_STRING = originalConnectionString;
  });

  it('throws when SQL_CONNECTION_STRING is not set', async () => {
    delete process.env.SQL_CONNECTION_STRING;
    const { getPool } = await import('./db.js');
    expect(() => getPool()).toThrow('SQL_CONNECTION_STRING is not set');
  });

  it('connects using the configured connection string', async () => {
    process.env.SQL_CONNECTION_STRING = 'Server=tcp:test;Database=test;';
    const fakePool = { request: vi.fn() };
    connectMock.mockResolvedValue(fakePool);

    const { getPool } = await import('./db.js');
    const pool = await getPool();

    expect(connectMock).toHaveBeenCalledWith('Server=tcp:test;Database=test;');
    expect(pool).toBe(fakePool);
  });

  it('reuses the same pool promise across calls', async () => {
    process.env.SQL_CONNECTION_STRING = 'Server=tcp:test;Database=test;';
    connectMock.mockResolvedValue({ request: vi.fn() });

    const { getPool } = await import('./db.js');
    await getPool();
    await getPool();

    expect(connectMock).toHaveBeenCalledTimes(1);
  });
});
