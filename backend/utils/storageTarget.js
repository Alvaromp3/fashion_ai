/**
 * Decide which image storage backend to use.
 *
 * Priority:
 * 1) Cloudflare R2 (only when core credentials + public URL are all present)
 * 2) Cloudinary
 * 3) Local filesystem (backend/uploads)
 */

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasR2CoreConfig(env = process.env) {
  return (
    hasValue(env.R2_ACCOUNT_ID) &&
    hasValue(env.R2_ACCESS_KEY_ID) &&
    hasValue(env.R2_SECRET_ACCESS_KEY) &&
    hasValue(env.R2_BUCKET_NAME)
  );
}

function hasR2PublicUrl(env = process.env) {
  return hasValue(env.R2_PUBLIC_URL);
}

function isR2ReadyForImages(env = process.env) {
  return hasR2CoreConfig(env) && hasR2PublicUrl(env);
}

function isCloudinaryReady(env = process.env) {
  return (
    hasValue(env.CLOUDINARY_CLOUD_NAME) &&
    hasValue(env.CLOUDINARY_API_KEY) &&
    hasValue(env.CLOUDINARY_API_SECRET)
  );
}

function getImageStorageTarget(env = process.env) {
  if (isR2ReadyForImages(env)) return 'r2';
  if (isCloudinaryReady(env)) return 'cloudinary';
  return 'local';
}

module.exports = {
  getImageStorageTarget,
  hasR2CoreConfig,
  hasR2PublicUrl,
  isR2ReadyForImages,
  isCloudinaryReady,
};
