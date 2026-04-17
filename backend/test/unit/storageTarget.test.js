'use strict';

const {
  getImageStorageTarget,
  hasR2CoreConfig,
  hasR2PublicUrl,
  isR2ReadyForImages,
  isCloudinaryReady,
} = require('../../utils/storageTarget');

describe('storageTarget', () => {
  it('selects r2 when core R2 credentials and public URL are present', () => {
    const env = {
      R2_ACCOUNT_ID: 'acct',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET_NAME: 'bucket',
      R2_PUBLIC_URL: 'https://pub.example.r2.dev',
    };
    expect(hasR2CoreConfig(env)).toBe(true);
    expect(hasR2PublicUrl(env)).toBe(true);
    expect(isR2ReadyForImages(env)).toBe(true);
    expect(getImageStorageTarget(env)).toBe('r2');
  });

  it('falls back to cloudinary when R2 public URL is missing but Cloudinary is complete', () => {
    const env = {
      R2_ACCOUNT_ID: 'acct',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET_NAME: 'bucket',
      CLOUDINARY_CLOUD_NAME: 'cloud',
      CLOUDINARY_API_KEY: 'api-key',
      CLOUDINARY_API_SECRET: 'api-secret',
    };
    expect(hasR2CoreConfig(env)).toBe(true);
    expect(hasR2PublicUrl(env)).toBe(false);
    expect(isR2ReadyForImages(env)).toBe(false);
    expect(isCloudinaryReady(env)).toBe(true);
    expect(getImageStorageTarget(env)).toBe('cloudinary');
  });

  it('falls back to local when cloud providers are not fully configured', () => {
    const env = {
      CLOUDINARY_CLOUD_NAME: 'cloud',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
    };
    expect(isCloudinaryReady(env)).toBe(false);
    expect(getImageStorageTarget(env)).toBe('local');
  });
});
