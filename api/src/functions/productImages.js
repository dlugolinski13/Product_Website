import { app } from '@azure/functions';
import crypto from 'crypto';
import { sql, getPool } from '../lib/db.js';
import { requireRole } from '../lib/auth.js';
import { uploadImage, deleteImage, getImageUrl } from '../lib/blobStorage.js';

app.http('addProductImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'products/{productId}/images',
  handler: async (request, context) => {
    const auth = requireRole(request, 'admin');
    if (!auth.ok) return { status: auth.status };

    const { productId } = request.params;
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const extension = contentType.split('/')[1] || 'bin';
    const blobName = `${productId}/${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await request.arrayBuffer());

    try {
      await uploadImage(blobName, buffer, contentType);

      const pool = await getPool();
      const result = await pool
        .request()
        .input('productId', sql.UniqueIdentifier, productId)
        .input('blobName', sql.NVarChar, blobName)
        .query(`
          INSERT INTO product_images (product_id, blob_name, display_order)
          OUTPUT INSERTED.id
          VALUES (@productId, @blobName, 0)
        `);

      return { status: 201, jsonBody: { id: result.recordset[0].id, url: getImageUrl(blobName) } };
    } catch (err) {
      context.error('addProductImage failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

app.http('deleteProductImage', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'products/{productId}/images/{imageId}',
  handler: async (request, context) => {
    const auth = requireRole(request, 'admin');
    if (!auth.ok) return { status: auth.status };

    const { imageId } = request.params;

    try {
      const pool = await getPool();
      const existing = await pool
        .request()
        .input('imageId', sql.UniqueIdentifier, imageId)
        .query('SELECT blob_name FROM product_images WHERE id = @imageId');

      const row = existing.recordset[0];
      if (!row) return { status: 404 };

      await deleteImage(row.blob_name);
      await pool.request().input('imageId', sql.UniqueIdentifier, imageId).query('DELETE FROM product_images WHERE id = @imageId');

      return { status: 204 };
    } catch (err) {
      context.error('deleteProductImage failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
