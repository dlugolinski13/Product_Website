const { app } = require('@azure/functions');
const { getPool } = require('../lib/db');
const { requireRole } = require('../lib/auth');

app.http('listProducts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'products',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    // TODO: needs SQL_CONNECTION_STRING configured to run.
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM products WHERE is_active = 1');

    return { jsonBody: result.recordset };
  },
});

app.http('createProduct', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'products',
  handler: async (request, context) => {
    const auth = requireRole(request, 'admin');
    if (!auth.ok) return { status: auth.status };

    // TODO: insert into products table once SQL_CONNECTION_STRING is configured.
    return { status: 501, jsonBody: { error: 'Not implemented yet' } };
  },
});
