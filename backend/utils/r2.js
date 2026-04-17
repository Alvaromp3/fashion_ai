/**
 * Cloudflare R2 (S3-compatible) upload/delete for garment images.
 * Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.
 * Optional: R2_PUBLIC_URL (e.g. https://pub-xxx.r2.dev or custom domain) for stored image URLs.
 */
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { randomFileSuffix } = require('./randomFileSuffix');

function getConfig() {
  return {
    accountId: (process.env.R2_ACCOUNT_ID || '').trim(),
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
    bucketName: (process.env.R2_BUCKET_NAME || '').trim(),
    publicUrl: (process.env.R2_PUBLIC_URL || '').trim(),
    folder: (process.env.R2_FOLDER || 'fashion_ai').trim(),
  };
}

let client = null;
let clientCacheKey = '';

function getClient() {
  const cfg = getConfig();
  const cacheKey = `${cfg.accountId}|${cfg.accessKeyId}|${cfg.secretAccessKey}`;
  if (!client || cacheKey !== clientCacheKey) {
    if (!cfg.accountId || !cfg.accessKeyId || !cfg.secretAccessKey) {
      throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY required for R2');
    }
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      forcePathStyle: true,
    });
    clientCacheKey = cacheKey;
  }
  return client;
}

function isConfigured() {
  const cfg = getConfig();
  return !!(cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucketName);
}

/**
 * Upload file at filePath to R2. Returns public URL if R2_PUBLIC_URL set, else returns key.
 * @param {string} filePath - Local file path
 * @param {string} [objectKey] - Optional key (default: folder/timestamp-random.ext)
 * @returns {Promise<{ url: string, key: string }>}
 */
async function uploadToR2(filePath, objectKey = null) {
  if (!isConfigured()) throw new Error('R2 is not configured');
  const cfg = getConfig();
  const ext = path.extname(filePath) || '.jpg';
  const key = objectKey || `${cfg.folder || 'fashion_ai'}/${Date.now()}-${randomFileSuffix()}${ext}`;
  const body = fs.createReadStream(filePath);
  const s3 = getClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: key,
      Body: body,
      ContentType: ext === '.png' ? 'image/png' : 'image/jpeg',
    })
  );
  const url = cfg.publicUrl ? `${cfg.publicUrl.replace(/\/$/, '')}/${key}` : key;
  return { url, key };
}

/**
 * Delete object from R2 by URL (must be under R2_PUBLIC_URL) or by key.
 * @param {string} urlOrKey - Full R2 public URL or object key
 */
async function deleteFromR2(urlOrKey) {
  if (!isConfigured()) return;
  const cfg = getConfig();
  let key = urlOrKey;
  if (urlOrKey.startsWith('http')) {
    if (cfg.publicUrl && urlOrKey.startsWith(cfg.publicUrl)) {
      key = urlOrKey.slice(cfg.publicUrl.replace(/\/$/, '').length).replace(/^\//, '');
    } else {
      return; // can't derive key without R2_PUBLIC_URL
    }
  }
  const s3 = getClient();
  await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucketName, Key: key }));
}

module.exports = {
  isConfigured,
  uploadToR2,
  deleteFromR2,
};
