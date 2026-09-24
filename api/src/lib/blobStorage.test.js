import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { loadWithMocks } from '../testUtils/mockRequire.js';

const nodeRequire = createRequire(import.meta.url);

const uploadDataMock = vi.fn();
const deleteIfExistsMock = vi.fn();
const getBlockBlobClientMock = vi.fn(() => ({
  url: 'https://storage.example.com/container/blob.png',
  uploadData: uploadDataMock,
  deleteIfExists: deleteIfExistsMock,
}));
const getContainerClientMock = vi.fn(() => ({ getBlockBlobClient: getBlockBlobClientMock }));
const fromConnectionStringMock = vi.fn(() => ({ getContainerClient: getContainerClientMock }));

function loadBlobStorage() {
  return loadWithMocks(
    nodeRequire,
    { '@azure/storage-blob': { BlobServiceClient: { fromConnectionString: (...args) => fromConnectionStringMock(...args) } } },
    './blobStorage.js'
  );
}

describe('blobStorage', () => {
  const originalConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const originalContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  beforeEach(() => {
    uploadDataMock.mockReset();
    deleteIfExistsMock.mockReset();
    getBlockBlobClientMock.mockClear();
    getContainerClientMock.mockClear();
    fromConnectionStringMock.mockClear();
  });

  afterEach(() => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = originalConnectionString;
    process.env.AZURE_STORAGE_CONTAINER_NAME = originalContainerName;
  });

  it('throws when storage settings are not configured', () => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    delete process.env.AZURE_STORAGE_CONTAINER_NAME;
    const { getImageUrl } = loadBlobStorage();
    expect(() => getImageUrl('blob.png')).toThrow(
      'AZURE_STORAGE_CONNECTION_STRING / AZURE_STORAGE_CONTAINER_NAME is not set'
    );
  });

  it('uploads image data with the given content type', async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'conn-string';
    process.env.AZURE_STORAGE_CONTAINER_NAME = 'product-images';
    const { uploadImage } = loadBlobStorage();

    const buffer = Buffer.from('fake-bytes');
    const url = await uploadImage('abc/img.png', buffer, 'image/png');

    expect(fromConnectionStringMock).toHaveBeenCalledWith('conn-string');
    expect(getContainerClientMock).toHaveBeenCalledWith('product-images');
    expect(getBlockBlobClientMock).toHaveBeenCalledWith('abc/img.png');
    expect(uploadDataMock).toHaveBeenCalledWith(buffer, { blobHTTPHeaders: { blobContentType: 'image/png' } });
    expect(url).toBe('https://storage.example.com/container/blob.png');
  });

  it('deletes an image blob if it exists', async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'conn-string';
    process.env.AZURE_STORAGE_CONTAINER_NAME = 'product-images';
    const { deleteImage } = loadBlobStorage();

    await deleteImage('abc/img.png');

    expect(getBlockBlobClientMock).toHaveBeenCalledWith('abc/img.png');
    expect(deleteIfExistsMock).toHaveBeenCalled();
  });

  it('resolves the public url for a blob name', () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'conn-string';
    process.env.AZURE_STORAGE_CONTAINER_NAME = 'product-images';
    const { getImageUrl } = loadBlobStorage();

    expect(getImageUrl('abc/img.png')).toBe('https://storage.example.com/container/blob.png');
  });

  it('reuses the same container client across calls', () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'conn-string';
    process.env.AZURE_STORAGE_CONTAINER_NAME = 'product-images';
    const { getImageUrl } = loadBlobStorage();

    getImageUrl('a.png');
    getImageUrl('b.png');

    expect(fromConnectionStringMock).toHaveBeenCalledTimes(1);
  });
});
