const {
  BlobSASPermissions,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters
} = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

function getAzureCreds() {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT;
  const accountKey = process.env.AZURE_STORAGE_KEY;
  const container = process.env.AZURE_STORAGE_CONTAINER;
  const publicBase = process.env.AZURE_PUBLIC_BASE; // e.g., https://acc.blob.core.windows.net/videos
  if (!accountName || !accountKey || !container || !publicBase) {
    throw new Error('Missing Azure storage env variables');
  }
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  return { accountName, container, publicBase, credential };
}

function newBlobName(ext = '') {
  const clean = (ext || '').replace(/[^a-zA-Z0-9.]/g, '');
  return `${uuidv4()}${clean && !clean.startsWith('.') ? '.' : ''}${clean}`;
}

/**
 * Create a SAS URL (write-only) for client-side upload to a *single blob*.
 */
function createUploadSasUrl(blobName, expiresMinutes = 15) {
  const { accountName, container, credential } = getAzureCreds();

  const sas = generateBlobSASQueryParameters(
    {
      containerName: container,
      blobName,
      permissions: BlobSASPermissions.parse('cw'), // create + write
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + expiresMinutes * 60 * 1000)
    },
    credential
  ).toString();

  const url = `https://${accountName}.blob.core.windows.net/${container}/${blobName}?${sas}`;
  return url;
}

/** Build public URL (container must allow public read or be behind CDN). */
function publicBlobUrl(blobName) {
  const { publicBase } = getAzureCreds();
  return `${publicBase}/${blobName}`;
}

module.exports = { createUploadSasUrl, publicBlobUrl, newBlobName };
