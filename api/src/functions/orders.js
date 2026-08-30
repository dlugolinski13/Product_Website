const { app } = require('@azure/functions');
const { requireRole } = require('../lib/auth');

app.http('listOrders', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'orders',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    // TODO: scope to auth.claims.sub (customer) unless admin, once SQL is wired up.
    return { jsonBody: [] };
  },
});

app.http('createOrder', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'orders',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    await request.json();
    // TODO: insert into orders/order_items once SQL is wired up.
    return { status: 501, jsonBody: { error: 'Not implemented yet' } };
  },
});
