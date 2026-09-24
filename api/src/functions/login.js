const { app } = require('@azure/functions');
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../lib/db');
const { signToken } = require('../lib/auth');

app.http('login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: async (request, context) => {
    const { email, password } = await request.json();
    if (!email || !password) {
      return { status: 400, jsonBody: { error: 'email and password are required' } };
    }

    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .query('SELECT id, email, password_hash, role FROM users WHERE email = @email');

      const user = result.recordset[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return { status: 401, jsonBody: { error: 'Invalid credentials' } };
      }

      const token = signToken(user);
      return { jsonBody: { token, role: user.role } };
    } catch (err) {
      context.error('login failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
