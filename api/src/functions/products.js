import { app } from '@azure/functions';
import { sql, getPool } from '../lib/db.js';
import { requireRole } from '../lib/auth.js';
import { getImageUrl } from '../lib/blobStorage.js';

app.http('listProducts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'products',
  handler: async (request, context) => {
    const auth = requireRole(request);
    if (!auth.ok) return { status: auth.status };

    try {
      const pool = await getPool();
      const productsResult = await pool.request().query('SELECT * FROM products WHERE is_active = 1');
      const imagesResult = await pool
        .request()
        .query('SELECT product_id, blob_name FROM product_images ORDER BY product_id, display_order');

      const imagesByProduct = new Map();
      for (const row of imagesResult.recordset) {
        const urls = imagesByProduct.get(row.product_id) || [];
        urls.push(getImageUrl(row.blob_name));
        imagesByProduct.set(row.product_id, urls);
      }

      const products = productsResult.recordset.map((product) => ({
        ...product,
        images: imagesByProduct.get(product.id) || [],
      }));

      return { jsonBody: products };
    } catch (err) {
      context.error('listProducts failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

app.http('createProduct', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'products',
  handler: async (request, context) => {
    const auth = requireRole(request, 'admin');
    if (!auth.ok) return { status: auth.status };

    const body = await request.json();
    const required = ['itemNumber', 'name', 'shippingMethod', 'groupCode', 'classNumber', 'companyPrice', 'retailPrice'];
    const missing = required.filter((field) => body[field] === undefined || body[field] === null);
    if (missing.length > 0) {
      return { status: 400, jsonBody: { error: `Missing required fields: ${missing.join(', ')}` } };
    }

    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input('itemNumber', sql.NVarChar, body.itemNumber)
        .input('upc', sql.NVarChar, body.upc || null)
        .input('name', sql.NVarChar, body.name)
        .input('description', sql.NVarChar, body.description || null)
        .input('shippingMethod', sql.NVarChar, body.shippingMethod)
        .input('groupCode', sql.Char(4), body.groupCode)
        .input('classNumber', sql.Int, body.classNumber)
        .input('termsId', sql.Int, body.termsId || null)
        .input('activationDate', sql.Date, body.activationDate || null)
        .input('packAmount', sql.Int, body.packAmount || null)
        .input('packUnit', sql.NVarChar, body.packUnit || null)
        .input('casesPerPack', sql.Int, body.casesPerPack || null)
        .input('caseWeight', sql.Decimal(10, 2), body.caseWeight || null)
        .input('caseLength', sql.Decimal(10, 2), body.caseLength || null)
        .input('caseWidth', sql.Decimal(10, 2), body.caseWidth || null)
        .input('caseHeight', sql.Decimal(10, 2), body.caseHeight || null)
        .input('companyPrice', sql.Decimal(10, 2), body.companyPrice)
        .input('retailPrice', sql.Decimal(10, 2), body.retailPrice)
        .input('comments', sql.NVarChar, body.comments || null)
        .input('customerComments', sql.NVarChar, body.customerComments || null)
        .query(`
          INSERT INTO products (
            item_number, upc, name, description, shipping_method, group_code, class_number,
            terms_id, activation_date, pack_amount, pack_unit, cases_per_pack,
            case_weight, case_length, case_width, case_height,
            company_price, retail_price, comments, customer_comments
          )
          OUTPUT INSERTED.id
          VALUES (
            @itemNumber, @upc, @name, @description, @shippingMethod, @groupCode, @classNumber,
            @termsId, @activationDate, @packAmount, @packUnit, @casesPerPack,
            @caseWeight, @caseLength, @caseWidth, @caseHeight,
            @companyPrice, @retailPrice, @comments, @customerComments
          )
        `);

      return { status: 201, jsonBody: { id: result.recordset[0].id } };
    } catch (err) {
      context.error('createProduct failed', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
