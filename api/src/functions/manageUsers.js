const { app } = require('@azure/functions');
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../lib/db');
const { requireRole } = require('../lib/auth');

// Admin creates a new salesperson or customer account.
app.http('adminCreateUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'manage/users',
  handler: async (request, context) => {
    const auth = requireRole(request, 'admin');
    if (!auth.ok) return { status: auth.status };

    const body = await request.json();
    const { email, password, role, fullName, phone } = body;

    if (!email || !password) {
      return { status: 400, jsonBody: { error: 'email and password are required' } };
    }
    if (role !== 'salesperson' && role !== 'customer') {
      return { status: 400, jsonBody: { error: 'role must be salesperson or customer' } };
    }

    try {
      const pool = await getPool();

      const existing = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .query('SELECT id FROM dbo.users WHERE email = @email');

      if (existing.recordset.length > 0) {
        return { status: 409, jsonBody: { error: 'An account with this email already exists' } };
      }

      const hash = await bcrypt.hash(password, 10);
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .input('hash', sql.NVarChar, hash)
        .input('role', sql.NVarChar, role)
        .input('fullName', sql.NVarChar, fullName || null)
        .input('phone', sql.NVarChar, phone || null)
        .query(`
          INSERT INTO dbo.users (email, password_hash, role, full_name, phone)
          OUTPUT INSERTED.id, INSERTED.email, INSERTED.role
          VALUES (@email, @hash, @role, @fullName, @phone)
        `);

      const user = result.recordset[0];
      return { status: 201, jsonBody: { id: user.id, email: user.email, role: user.role } };
    } catch (err) {
      context.error('adminCreateUser failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
