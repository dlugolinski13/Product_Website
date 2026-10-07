const { app } = require('@azure/functions');
const { sql, getPool } = require('../lib/db');
const { requireRole } = require('../lib/auth');

app.http('listNotifications', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'manage/notifications',
  handler: async (request, context) => {
    const auth = requireRole(request, 'admin');
    if (!auth.ok) return { status: auth.status };

    try {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT id, message, created_at, is_active
        FROM dbo.notifications
        ORDER BY created_at DESC
      `);
      return {
        jsonBody: {
          notifications: result.recordset.map(row => ({
            id: row.id,
            message: row.message,
            createdAt: row.created_at,
            isActive: row.is_active === true || row.is_active === 1,
          })),
        },
      };
    } catch (err) {
      context.error('listNotifications failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

app.http('createNotification', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'manage/notifications',
  handler: async (request, context) => {
    const auth = requireRole(request, 'admin');
    if (!auth.ok) return { status: auth.status };

    const body = await request.json();
    const { message } = body;
    if (!message || !message.trim()) {
      return { status: 400, jsonBody: { error: 'message is required' } };
    }

    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input('message', sql.NVarChar, message.trim())
        .input('createdBy', sql.UniqueIdentifier, auth.claims.sub)
        .query(`
          INSERT INTO dbo.notifications (message, created_by)
          OUTPUT INSERTED.id, INSERTED.message, INSERTED.created_at, INSERTED.is_active
          VALUES (@message, @createdBy)
        `);
      const row = result.recordset[0];
      return {
        status: 201,
        jsonBody: {
          id: row.id,
          message: row.message,
          createdAt: row.created_at,
          isActive: row.is_active === true || row.is_active === 1,
        },
      };
    } catch (err) {
      context.error('createNotification failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

app.http('toggleNotification', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'manage/notifications/{id}',
  handler: async (request, context) => {
    const auth = requireRole(request, 'admin');
    if (!auth.ok) return { status: auth.status };

    const { id } = request.params;

    try {
      const pool = await getPool();
      const existing = await pool
        .request()
        .input('id', sql.Int, parseInt(id, 10))
        .query('SELECT id, is_active FROM dbo.notifications WHERE id = @id');

      if (!existing.recordset[0]) {
        return { status: 404, jsonBody: { error: 'Notification not found' } };
      }

      const current = existing.recordset[0].is_active;
      await pool
        .request()
        .input('id', sql.Int, parseInt(id, 10))
        .input('isActive', sql.Bit, current ? 0 : 1)
        .query('UPDATE dbo.notifications SET is_active = @isActive WHERE id = @id');

      return { status: 204 };
    } catch (err) {
      context.error('toggleNotification failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
