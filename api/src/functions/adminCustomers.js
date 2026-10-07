const { app } = require('@azure/functions');
const { sql, getPool } = require('../lib/db');
const { requireRole } = require('../lib/auth');

// Returns all customers with their current salesperson assignment, and all salespeople.
app.http('adminListCustomers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'manage/customers',
  handler: async (request, context) => {
    const auth = requireRole(request, 'admin');
    if (!auth.ok) return { status: auth.status };

    try {
      const pool = await getPool();

      const customersResult = await pool.request().query(`
        SELECT u.id, u.email, u.full_name, sc.salesperson_id
        FROM users u
        LEFT JOIN salesperson_customers sc ON sc.customer_id = u.id
        WHERE u.role = 'customer'
        ORDER BY u.full_name, u.email
      `);

      const salespeopleResult = await pool.request().query(`
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
            salespersonId: row.salesperson_id || null,
          })),
          salespeople: salespeopleResult.recordset.map(row => ({
            id: row.id,
            email: row.email,
            fullName: row.full_name,
          })),
        },
      };
    } catch (err) {
      context.error('adminListCustomers failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

// Assigns or clears a customer's salesperson (admin only).
app.http('adminAssignSalesperson', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'manage/customers/{customerId}/salesperson',
  handler: async (request, context) => {
    const auth = requireRole(request, 'admin');
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
          return { status: 404, jsonBody: { error: 'Salesperson not found' } };
        }
      }

      await pool
        .request()
        .input('customerId', sql.UniqueIdentifier, customerId)
        .query('DELETE FROM dbo.salesperson_customers WHERE customer_id = @customerId');

      if (salespersonId) {
        await pool
          .request()
          .input('salespersonId', sql.UniqueIdentifier, salespersonId)
          .input('customerId', sql.UniqueIdentifier, customerId)
          .query('INSERT INTO dbo.salesperson_customers (salesperson_id, customer_id) VALUES (@salespersonId, @customerId)');
      }

      await pool
        .request()
        .input('customerId', sql.UniqueIdentifier, customerId)
        .input('salespersonId', sql.UniqueIdentifier, salespersonId)
        .query('UPDATE dbo.users SET salesperson_id = @salespersonId WHERE id = @customerId');

      return { status: 204 };
    } catch (err) {
      context.error('adminAssignSalesperson failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
