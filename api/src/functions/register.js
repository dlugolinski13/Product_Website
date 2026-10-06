const { app } = require('@azure/functions');
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../lib/db');
const { signToken } = require('../lib/auth');

app.http('register', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/register',
  handler: async (request, context) => {
    const { email, password } = await request.json();
    if (!email || !password) {
      return { status: 400, jsonBody: { error: 'email and password are required' } };
    }

    try {
      const pool = await getPool();

      const existing = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .query('SELECT id FROM users WHERE email = @email');

      if (existing.recordset.length > 0) {
        return { status: 409, jsonBody: { error: 'An account with this email already exists' } };
      }

      const hash = await bcrypt.hash(password, 10);
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .input('hash', sql.NVarChar, hash)
        .query(
          "INSERT INTO users (email, password_hash, role) OUTPUT INSERTED.id, INSERTED.email, INSERTED.role VALUES (@email, @hash, 'customer')"
        );

      const user = result.recordset[0];
      const token = signToken(user);

      return { status: 201, jsonBody: { token, role: user.role } };
    } catch (err) {
      context.error('register failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
