const { app } = require('@azure/functions');
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
      const result = await pool
        .request()
        .input('id', sql.UniqueIdentifier, auth.claims.sub)
        .query(`
          SELECT u.id, u.email, u.full_name, u.role,
                 u.address_line1, u.address_line2, u.city, u.state, u.postal_code, u.country,
                 s.id AS sp_id, s.full_name AS sp_full_name, s.email AS sp_email
          FROM users u
          LEFT JOIN users s ON s.id = u.salesperson_id
          WHERE u.id = @id
        `);

      const row = result.recordset[0];
      if (!row) return { status: 404 };

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
          salesperson: row.sp_id
            ? { id: row.sp_id, fullName: row.sp_full_name, email: row.sp_email }
            : null,
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

// Returns all customers with their assigned salesperson, plus all salesperson users
// so the frontend can populate an assignment dropdown.
app.http('listCustomers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'account/customers',
  handler: async (request, context) => {
    const auth = requireRole(request, 'salesperson');
    if (!auth.ok) return { status: auth.status };

    try {
      const pool = await getPool();

      const customersResult = await pool.request().query(`
        SELECT u.id, u.email, u.full_name,
               s.id AS sp_id, s.full_name AS sp_full_name, s.email AS sp_email
        FROM users u
        LEFT JOIN users s ON s.id = u.salesperson_id
        WHERE u.role = 'customer'
        ORDER BY u.full_name, u.email
      `);

      const salespersonsResult = await pool.request().query(`
        SELECT id, email, full_name
        FROM users
        WHERE role = 'salesperson'
        ORDER BY full_name, email
      `);

      return {
        jsonBody: {
          customers: customersResult.recordset.map(row => ({
            id: row.id,
            email: row.email,
            fullName: row.full_name,
            salesperson: row.sp_id
              ? { id: row.sp_id, fullName: row.sp_full_name, email: row.sp_email }
              : null,
          })),
          salespersons: salespersonsResult.recordset.map(row => ({
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

// One-salesperson-per-customer is enforced by the single salesperson_id column: each UPDATE
// simply overwrites any previous assignment.
app.http('assignSalesperson', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'account/customers/{customerId}/salesperson',
  handler: async (request, context) => {
    const auth = requireRole(request, 'salesperson');
    if (!auth.ok) return { status: auth.status };

    const { customerId } = request.params;
    const body = await request.json();
    const salespersonId = body.salespersonId || null;

    try {
      const pool = await getPool();

      const customerResult = await pool
        .request()
        .input('customerId', sql.UniqueIdentifier, customerId)
        .query("SELECT id FROM users WHERE id = @customerId AND role = 'customer'");

      if (!customerResult.recordset[0]) {
        return { status: 404, jsonBody: { error: 'Customer not found' } };
      }

      if (salespersonId) {
        const spResult = await pool
          .request()
          .input('salespersonId', sql.UniqueIdentifier, salespersonId)
          .query("SELECT id FROM users WHERE id = @salespersonId AND role = 'salesperson'");

        if (!spResult.recordset[0]) {
          return { status: 400, jsonBody: { error: 'Salesperson not found' } };
        }
      }

      await pool
        .request()
        .input('customerId', sql.UniqueIdentifier, customerId)
        .input('salespersonId', sql.UniqueIdentifier, salespersonId)
        .query('UPDATE dbo.users SET salesperson_id = @salespersonId WHERE id = @customerId');

      return { status: 204 };
    } catch (err) {
      context.error('assignSalesperson failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
