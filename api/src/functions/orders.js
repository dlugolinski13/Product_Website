const { app } = require('@azure/functions');
const { sql, getPool } = require('../lib/db');
const { requireRole } = require('../lib/auth');

app.http('listOrders', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'orders',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    const pool = await getPool();
    const dbRequest = pool.request();
    let query = `
      SELECT
        o.id AS order_id, o.customer_id, o.status, o.created_at, o.submitted_at,
        oi.id AS item_id, oi.product_id, oi.quantity, oi.unit_price, oi.notes,
        p.item_number, p.name AS product_name
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
    `;
    if (auth.claims.role !== 'admin') {
      query += ' WHERE o.customer_id = @customerId';
      dbRequest.input('customerId', sql.UniqueIdentifier, auth.claims.sub);
    }
    query += ' ORDER BY o.created_at DESC, oi.id';

    const result = await dbRequest.query(query);

    const ordersById = new Map();
    for (const row of result.recordset) {
      let order = ordersById.get(row.order_id);
      if (!order) {
        order = {
          id: row.order_id,
          customerId: row.customer_id,
          status: row.status,
          createdAt: row.created_at,
          submittedAt: row.submitted_at,
          items: [],
        };
        ordersById.set(row.order_id, order);
      }
      if (row.item_id) {
        order.items.push({
          id: row.item_id,
          productId: row.product_id,
          itemNumber: row.item_number,
          productName: row.product_name,
          quantity: row.quantity,
          unitPrice: row.unit_price,
          notes: row.notes,
        });
      }
    }

    return { jsonBody: Array.from(ordersById.values()) };
  },
});

app.http('createOrder', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'orders',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return { status: 400, jsonBody: { error: 'At least one item is required' } };
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const orderResult = await new sql.Request(transaction)
        .input('customerId', sql.UniqueIdentifier, auth.claims.sub)
        .query(`
          INSERT INTO orders (customer_id, status)
          OUTPUT INSERTED.id, INSERTED.status, INSERTED.created_at
          VALUES (@customerId, 'draft')
        `);
      const order = orderResult.recordset[0];

      for (const item of items) {
        const productResult = await new sql.Request(transaction)
          .input('productId', sql.UniqueIdentifier, item.productId)
          .query('SELECT company_price FROM products WHERE id = @productId AND is_active = 1');

        const product = productResult.recordset[0];
        if (!product) {
          throw new Error(`Product ${item.productId} not found or inactive`);
        }

        await new sql.Request(transaction)
          .input('orderId', sql.UniqueIdentifier, order.id)
          .input('productId', sql.UniqueIdentifier, item.productId)
          .input('quantity', sql.Int, item.quantity)
          .input('unitPrice', sql.Decimal(10, 2), product.company_price)
          .input('notes', sql.NVarChar, item.notes || null)
          .query(`
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, notes)
            VALUES (@orderId, @productId, @quantity, @unitPrice, @notes)
          `);
      }

      await transaction.commit();
      return { status: 201, jsonBody: { id: order.id, status: order.status, createdAt: order.created_at } };
    } catch (err) {
      await transaction.rollback();
      return { status: 400, jsonBody: { error: err.message } };
    }
  },
});
