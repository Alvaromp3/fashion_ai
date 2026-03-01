/**
 * Cloudflare R2 (S3-compatible) upload/delete for garment images.
 * Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.
 * Optional: R2_PUBLIC_URL (e.g. https://pub-xxx.r2.dev or custom domain) for stored image URLs.
 */
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL || ''; // e.g. https://pub-xxx.r2.dev (no trailing slash)
const folder = process.env.R2_FOLDER || 'fashion_ai';

let client = null;

function getClient() {
  if (!client) {
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY required for R2');
    }
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }
  return client;
}

function isConfigured() {
  return !!(accountId && accessKeyId && secretAccessKey && bucketName);
}

/**
 * Upload file at filePath to R2. Returns public URL if R2_PUBLIC_URL set, else returns key.
 * @param {string} filePath - Local file path
 * @param {string} [objectKey] - Optional key (default: folder/timestamp-random.ext)
 * @returns {Promise<{ url: string, key: string }>}
 */
async function uploadToR2(filePath, objectKey = null) {
  if (!isConfigured()) throw new Error('R2 is not configured');
  const ext = path.extname(filePath) || '.jpg';
  const key = objectKey || `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const body = fs.createReadStream(filePath);
  const s3 = getClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: ext === '.png' ? 'image/png' : 'image/jpeg',
    })
  );
  const url = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${key}` : key;
  return { url, key };
}

/**
 * Delete object from R2 by URL (must be under R2_PUBLIC_URL) or by key.
 * @param {string} urlOrKey - Full R2 public URL or object key
 */
async function deleteFromR2(urlOrKey) {
  if (!isConfigured()) return;
  let key = urlOrKey;
  if (urlOrKey.startsWith('http')) {
    if (publicUrl && urlOrKey.startsWith(publicUrl)) {
      key = urlOrKey.slice(publicUrl.replace(/\/$/, '').length).replace(/^\//, '');
    } else {
      return; // can't derive key without R2_PUBLIC_URL
    }
  }
  const s3 = getClient();
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}

module.exports = {
  isConfigured,
  uploadToR2,
  deleteFromR2,
};
