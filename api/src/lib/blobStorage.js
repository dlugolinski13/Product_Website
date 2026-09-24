const { BlobServiceClient } = require('@azure/storage-blob');

let containerClient;

function getContainerClient() {
  if (!containerClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
    if (!connectionString || !containerName) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING / AZURE_STORAGE_CONTAINER_NAME is not set');
    }
    containerClient = BlobServiceClient.fromConnectionString(connectionString).getContainerClient(containerName);
  }
  return containerClient;
}

async function uploadImage(blobName, buffer, contentType) {
  const blockBlobClient = getContainerClient().getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
  return blockBlobClient.url;
}

async function deleteImage(blobName) {
  await getContainerClient().getBlockBlobClient(blobName).deleteIfExists();
}

function getImageUrl(blobName) {
  return getContainerClient().getBlockBlobClient(blobName).url;
}

module.exports = { uploadImage, deleteImage, getImageUrl };
