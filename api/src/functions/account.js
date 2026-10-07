const { app } = require('@azure/functions');
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../lib/db');
const { requireRole } = require('../lib/auth');

app.http('getAccount', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'account',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    try {
      const pool = await getPool();

      const userResult = await pool
        .request()
        .input('id', sql.UniqueIdentifier, auth.claims.sub)
        .query(`
          SELECT id, email, full_name, role,
                 address_line1, address_line2, city, state, postal_code, country
          FROM users
          WHERE id = @id
        `);

      const row = userResult.recordset[0];
      if (!row) return { status: 404 };

      const salespersonsResult = await pool
        .request()
        .input('id', sql.UniqueIdentifier, auth.claims.sub)
        .query(`
          SELECT s.id, s.full_name, s.email
          FROM salesperson_customers sc
          JOIN users s ON s.id = sc.salesperson_id
          WHERE sc.customer_id = @id
          ORDER BY s.full_name, s.email
        `);

      return {
        jsonBody: {
          id: row.id,
          email: row.email,
          fullName: row.full_name,
          role: row.role,
          addressLine1: row.address_line1,
          addressLine2: row.address_line2,
          city: row.city,
          state: row.state,
          postalCode: row.postal_code,
          country: row.country,
          salespersons: salespersonsResult.recordset.map(r => ({
            id: r.id,
            fullName: r.full_name,
            email: r.email,
          })),
        },
      };
    } catch (err) {
      context.error('getAccount failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

app.http('updateAccount', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'account',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    const body = await request.json();

    try {
      const pool = await getPool();
      await pool
        .request()
        .input('id', sql.UniqueIdentifier, auth.claims.sub)
        .input('fullName', sql.NVarChar, body.fullName || null)
        .input('addressLine1', sql.NVarChar, body.addressLine1 || null)
        .input('addressLine2', sql.NVarChar, body.addressLine2 || null)
        .input('city', sql.NVarChar, body.city || null)
        .input('state', sql.NVarChar, body.state || null)
        .input('postalCode', sql.NVarChar, body.postalCode || null)
        .input('country', sql.NVarChar, body.country || null)
        .query(`
          UPDATE dbo.users SET
            full_name     = @fullName,
            address_line1 = @addressLine1,
            address_line2 = @addressLine2,
            city          = @city,
            state         = @state,
            postal_code   = @postalCode,
            country       = @country
          WHERE id = @id
        `);

      return { status: 204 };
    } catch (err) {
      context.error('updateAccount failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

app.http('changePassword', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'account/password',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return { status: 400, jsonBody: { error: 'currentPassword and newPassword are required' } };
    }
    if (newPassword.length < 8) {
      return { status: 400, jsonBody: { error: 'New password must be at least 8 characters' } };
    }

    try {
      const pool = await getPool();

      const result = await pool
        .request()
        .input('id', sql.UniqueIdentifier, auth.claims.sub)
        .query('SELECT password_hash FROM dbo.users WHERE id = @id');

      const row = result.recordset[0];
      if (!row) return { status: 404 };

      const matches = await bcrypt.compare(currentPassword, row.password_hash);
      if (!matches) {
        return { status: 401, jsonBody: { error: 'Current password is incorrect' } };
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await pool
        .request()
        .input('id', sql.UniqueIdentifier, auth.claims.sub)
        .input('hash', sql.NVarChar, newHash)
        .query('UPDATE dbo.users SET password_hash = @hash WHERE id = @id');

      return { status: 204 };
    } catch (err) {
      context.error('changePassword failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

// Returns the calling salesperson's assigned customers (from the junction table)
// and all customers not yet in their list (for the add-customer dropdown).
app.http('listCustomers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'account/customers',
  handler: async (request, context) => {
    const auth = requireRole(request, 'salesperson');
    if (!auth.ok) return { status: auth.status };

    try {
      const pool = await getPool();

      const assignedResult = await pool
        .request()
        .input('salespersonId', sql.UniqueIdentifier, auth.claims.sub)
        .query(`
          SELECT u.id, u.email, u.full_name
          FROM salesperson_customers sc
          JOIN users u ON u.id = sc.customer_id
          WHERE sc.salesperson_id = @salespersonId
          ORDER BY u.full_name, u.email
        `);

      const availableResult = await pool
        .request()
        .input('salespersonId', sql.UniqueIdentifier, auth.claims.sub)
        .query(`
          SELECT u.id, u.email, u.full_name
          FROM users u
          WHERE u.role = 'customer'
            AND u.id NOT IN (
              SELECT customer_id FROM salesperson_customers WHERE salesperson_id = @salespersonId
            )
          ORDER BY u.full_name, u.email
        `);

      return {
        jsonBody: {
          customers: assignedResult.recordset.map(row => ({
            id: row.id,
            email: row.email,
            fullName: row.full_name,
          })),
          availableCustomers: availableResult.recordset.map(row => ({
            id: row.id,
            email: row.email,
            fullName: row.full_name,
          })),
        },
      };
    } catch (err) {
      context.error('listCustomers failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

// Adds a customer to the calling salesperson's list (idempotent).
app.http('assignSalesperson', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'account/customers/{customerId}/salesperson',
  handler: async (request, context) => {
    const auth = requireRole(request, 'salesperson');
    if (!auth.ok) return { status: auth.status };

    const { customerId } = request.params;

    try {
      const pool = await getPool();

      const customerResult = await pool
        .request()
        .input('customerId', sql.UniqueIdentifier, customerId)
        .query("SELECT id FROM users WHERE id = @customerId AND role = 'customer'");

      if (!customerResult.recordset[0]) {
        return { status: 404, jsonBody: { error: 'Customer not found' } };
      }

      await pool
        .request()
        .input('salespersonId', sql.UniqueIdentifier, auth.claims.sub)
        .input('customerId', sql.UniqueIdentifier, customerId)
        .query(`
          IF NOT EXISTS (
            SELECT 1 FROM salesperson_customers
            WHERE salesperson_id = @salespersonId AND customer_id = @customerId
          )
            INSERT INTO salesperson_customers (salesperson_id, customer_id)
            VALUES (@salespersonId, @customerId)
        `);

      return { status: 204 };
    } catch (err) {
      context.error('assignSalesperson failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

// Removes a customer from the calling salesperson's list.
app.http('removeCustomer', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'account/customers/{customerId}',
  handler: async (request, context) => {
    const auth = requireRole(request, 'salesperson');
    if (!auth.ok) return { status: auth.status };

    const { customerId } = request.params;

    try {
      const pool = await getPool();

      const customerResult = await pool
        .request()
        .input('customerId', sql.UniqueIdentifier, customerId)
        .query("SELECT id FROM users WHERE id = @customerId AND role = 'customer'");

      if (!customerResult.recordset[0]) {
        return { status: 404, jsonBody: { error: 'Customer not found' } };
      }

      await pool
        .request()
        .input('salespersonId', sql.UniqueIdentifier, auth.claims.sub)
        .input('customerId', sql.UniqueIdentifier, customerId)
        .query(`
          DELETE FROM dbo.salesperson_customers
          WHERE salesperson_id = @salespersonId AND customer_id = @customerId
        `);

      return { status: 204 };
    } catch (err) {
      context.error('removeCustomer failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
