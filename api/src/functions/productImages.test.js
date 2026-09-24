import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { loadWithMocks } from '../testUtils/mockRequire.js';

const nodeRequire = createRequire(import.meta.url);

const routes = new Map();
const queryMock = vi.fn();
const inputMock = vi.fn().mockReturnThis();
const requestMock = vi.fn(() => ({ input: inputMock, query: queryMock }));
const getPoolMock = vi.fn(async () => ({ request: requestMock }));
const requireRoleMock = vi.fn();
const uploadImageMock = vi.fn();
const deleteImageMock = vi.fn();
const getImageUrlMock = vi.fn((blobName) => `https://blob.example.com/${blobName}`);

function fakeContext() {
  return { error: vi.fn() };
}

function fakeUploadRequest({ productId, contentType = 'image/png', bytes = 'fake-bytes' }) {
  return {
    params: { productId },
    headers: { get: (name) => (name === 'content-type' ? contentType : undefined) },
    arrayBuffer: async () => Buffer.from(bytes),
  };
}

function fakeDeleteRequest({ imageId }) {
  return { params: { imageId } };
}

describe('productImages', () => {
  let addHandler;
  let deleteHandler;

  beforeAll(() => {
    loadWithMocks(
      nodeRequire,
      {
        '@azure/functions': { app: { http: (name, options) => routes.set(name, options) } },
        '../lib/db': { sql: { UniqueIdentifier: 'UniqueIdentifier', NVarChar: 'NVarChar' }, getPool: (...args) => getPoolMock(...args) },
        '../lib/auth': { requireRole: (...args) => requireRoleMock(...args) },
        '../lib/blobStorage': {
          uploadImage: (...args) => uploadImageMock(...args),
          deleteImage: (...args) => deleteImageMock(...args),
          getImageUrl: (...args) => getImageUrlMock(...args),
        },
      },
      './productImages.js'
    );
    addHandler = routes.get('addProductImage').handler;
    deleteHandler = routes.get('deleteProductImage').handler;
  });

  beforeEach(() => {
    queryMock.mockReset();
    requestMock.mockClear();
    inputMock.mockClear();
    getPoolMock.mockReset();
    getPoolMock.mockImplementation(async () => ({ request: requestMock }));
    requireRoleMock.mockReset();
    uploadImageMock.mockReset();
    deleteImageMock.mockReset();
    getImageUrlMock.mockClear();
  });

  describe('addProductImage', () => {
    it('returns the auth status when not admin', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 403 });
      const result = await addHandler(fakeUploadRequest({ productId: 'p1' }), fakeContext());
      expect(result.status).toBe(403);
    });

    it('uploads the blob and inserts a product_images row', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin' } });
      uploadImageMock.mockResolvedValue('https://blob.example.com/uploaded');
      queryMock.mockResolvedValue({ recordset: [{ id: 'image-1' }] });

      const result = await addHandler(fakeUploadRequest({ productId: 'p1', contentType: 'image/png' }), fakeContext());

      expect(uploadImageMock).toHaveBeenCalled();
      const [blobName, , contentType] = uploadImageMock.mock.calls[0];
      expect(blobName).toMatch(/^p1\/.+\.png$/);
      expect(contentType).toBe('image/png');
      expect(result.status).toBe(201);
      expect(result.jsonBody.id).toBe('image-1');
    });

    it('falls back to a generic content type and extension when none is sent', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin' } });
      uploadImageMock.mockResolvedValue('https://blob.example.com/uploaded');
      queryMock.mockResolvedValue({ recordset: [{ id: 'image-1' }] });

      await addHandler(fakeUploadRequest({ productId: 'p1', contentType: null }), fakeContext());

      const [blobName, , contentType] = uploadImageMock.mock.calls[0];
      expect(blobName).toMatch(/^p1\/.+\.octet-stream$/);
      expect(contentType).toBe('application/octet-stream');
    });

    it('returns 500 and logs when the upload fails', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin' } });
      uploadImageMock.mockRejectedValue(new Error('upload failed'));
      const context = fakeContext();

      const result = await addHandler(fakeUploadRequest({ productId: 'p1' }), context);

      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });

  describe('deleteProductImage', () => {
    it('returns the auth status when not admin', async () => {
      requireRoleMock.mockReturnValue({ ok: false, status: 401 });
      const result = await deleteHandler(fakeDeleteRequest({ imageId: 'img-1' }), fakeContext());
      expect(result.status).toBe(401);
    });

    it('returns 404 when the image does not exist', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin' } });
      queryMock.mockResolvedValue({ recordset: [] });

      const result = await deleteHandler(fakeDeleteRequest({ imageId: 'missing' }), fakeContext());

      expect(result.status).toBe(404);
      expect(deleteImageMock).not.toHaveBeenCalled();
    });

    it('deletes the blob and the row', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin' } });
      queryMock.mockResolvedValue({ recordset: [{ blob_name: 'p1/img.png' }] });

      const result = await deleteHandler(fakeDeleteRequest({ imageId: 'img-1' }), fakeContext());

      expect(deleteImageMock).toHaveBeenCalledWith('p1/img.png');
      expect(result.status).toBe(204);
    });

    it('returns 500 and logs when deletion fails', async () => {
      requireRoleMock.mockReturnValue({ ok: true, claims: { role: 'admin' } });
      getPoolMock.mockRejectedValueOnce(new Error('db down'));
      const context = fakeContext();

      const result = await deleteHandler(fakeDeleteRequest({ imageId: 'img-1' }), context);

      expect(result.status).toBe(500);
      expect(context.error).toHaveBeenCalled();
    });
  });
});
