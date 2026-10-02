const { app } = require('@azure/functions');
const { getPool } = require('../lib/db');

app.http('warmup', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'warmup',
  handler: async (request, context) => {
    try {
      const pool = await getPool();
      await pool.request().query('SELECT 1');
      return { status: 200, jsonBody: { status: 'ok' } };
    } catch (err) {
      context.error('warmup failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
