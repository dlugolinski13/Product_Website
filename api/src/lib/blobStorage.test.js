import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const uploadDataMock = vi.fn();
const deleteIfExistsMock = vi.fn();
const getBlockBlobClientMock = vi.fn(() => ({
  url: 'https://storage.example.com/container/blob.png',
  uploadData: uploadDataMock,
  deleteIfExists: deleteIfExistsMock,
}));
const getContainerClientMock = vi.fn(() => ({ getBlockBlobClient: getBlockBlobClientMock }));
const fromConnectionStringMock = vi.fn(() => ({ getContainerClient: getContainerClientMock }));

vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: { fromConnectionString: (...args) => fromConnectionStringMock(...args) },
}));

describe('blobStorage', () => {
  const originalConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const originalContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  beforeEach(() => {
    vi.resetModules();
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

  it('throws when storage settings are not configured', async () => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    delete process.env.AZURE_STORAGE_CONTAINER_NAME;
    const { getImageUrl } = await import('./blobStorage.js');
    expect(() => getImageUrl('blob.png')).toThrow(
      'AZURE_STORAGE_CONNECTION_STRING / AZURE_STORAGE_CONTAINER_NAME is not set'
    );
  });

  it('uploads image data with the given content type', async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'conn-string';
    process.env.AZURE_STORAGE_CONTAINER_NAME = 'product-images';
    const { uploadImage } = await import('./blobStorage.js');

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
    const { deleteImage } = await import('./blobStorage.js');

    await deleteImage('abc/img.png');

    expect(getBlockBlobClientMock).toHaveBeenCalledWith('abc/img.png');
    expect(deleteIfExistsMock).toHaveBeenCalled();
  });

  it('resolves the public url for a blob name', async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'conn-string';
    process.env.AZURE_STORAGE_CONTAINER_NAME = 'product-images';
    const { getImageUrl } = await import('./blobStorage.js');

    expect(getImageUrl('abc/img.png')).toBe('https://storage.example.com/container/blob.png');
  });

  it('reuses the same container client across calls', async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'conn-string';
    process.env.AZURE_STORAGE_CONTAINER_NAME = 'product-images';
    const { getImageUrl } = await import('./blobStorage.js');

    getImageUrl('a.png');
    getImageUrl('b.png');

    expect(fromConnectionStringMock).toHaveBeenCalledTimes(1);
  });
});
