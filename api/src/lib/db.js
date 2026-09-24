import sql from 'mssql';

let poolPromise;

function getPool() {
  if (!poolPromise) {
    const connectionString = process.env.SQL_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('SQL_CONNECTION_STRING is not set');
    }
    poolPromise = sql.connect(connectionString);
  }
  return poolPromise;
}

export { sql, getPool };
