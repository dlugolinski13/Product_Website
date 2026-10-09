const { app } = require('@azure/functions');
const { sql, getPool } = require('../lib/db');
const { requireRole } = require('../lib/auth');

app.http('getSavedCart', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'cart/saved',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('userId', sql.UniqueIdentifier, auth.claims.sub)
        .query(`
          SELECT sci.product_id, sci.quantity,
            p.item_number, p.name, p.company_price, p.retail_price, p.description
          FROM saved_cart_items sci
          JOIN products p ON p.id = sci.product_id
          WHERE sci.user_id = @userId AND p.is_active = 1
        `);

      const items = result.recordset.map((row) => ({
        productId: row.product_id,
        quantity: row.quantity,
        product: {
          id: row.product_id,
          item_number: row.item_number,
          name: row.name,
          company_price: row.company_price,
          retail_price: row.retail_price,
          description: row.description,
        },
      }));

      return { jsonBody: { items } };
    } catch (err) {
      context.error('getSavedCart failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

app.http('saveCart', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'cart/saved',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];

    try {
      const pool = await getPool();
      await pool.request()
        .input('userId', sql.UniqueIdentifier, auth.claims.sub)
        .query('DELETE FROM saved_cart_items WHERE user_id = @userId');

      for (const item of items) {
        await pool.request()
          .input('userId', sql.UniqueIdentifier, auth.claims.sub)
          .input('productId', sql.UniqueIdentifier, item.productId)
          .input('quantity', sql.Int, item.quantity)
          .query('INSERT INTO saved_cart_items (user_id, product_id, quantity) VALUES (@userId, @productId, @quantity)');
      }

      return { status: 204 };
    } catch (err) {
      context.error('saveCart failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

app.http('discardSavedCart', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'cart/saved',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    try {
      const pool = await getPool();
      await pool.request()
        .input('userId', sql.UniqueIdentifier, auth.claims.sub)
        .query('DELETE FROM saved_cart_items WHERE user_id = @userId');

      return { status: 204 };
    } catch (err) {
      context.error('discardSavedCart failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
