const { app } = require('@azure/functions');
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../lib/db');
const { requireRole } = require('../lib/auth');

app.http('getProfile', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/me',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input('id', sql.UniqueIdentifier, auth.claims.sub)
        .query('SELECT id, email, full_name, role FROM users WHERE id = @id');

      const user = result.recordset[0];
      if (!user) return { status: 404 };

      return { jsonBody: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } };
    } catch (err) {
      context.error('getProfile failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

app.http('updateProfile', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'users/me',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    const body = await request.json();
    if (body.fullName === undefined && body.password === undefined) {
      return { status: 400, jsonBody: { error: 'Nothing to update' } };
    }

    try {
      const pool = await getPool();
      const dbRequest = pool.request().input('id', sql.UniqueIdentifier, auth.claims.sub);
      const setClauses = [];

      if (body.fullName !== undefined) {
        dbRequest.input('fullName', sql.NVarChar, body.fullName);
        setClauses.push('full_name = @fullName');
      }
      if (body.password !== undefined) {
        const passwordHash = await bcrypt.hash(body.password, 10);
        dbRequest.input('passwordHash', sql.NVarChar, passwordHash);
        setClauses.push('password_hash = @passwordHash');
      }

      await dbRequest.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = @id`);

      return { status: 200, jsonBody: { updated: true } };
    } catch (err) {
      context.error('updateProfile failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
