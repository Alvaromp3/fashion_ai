'use strict';

const MAX_DATA_URL_LEN = 8_000_000;

/**
 * Mirror vision: allow data:image/*;base64,... or https URLs that are not clearly SSRF targets.
 * @param {string} url
 * @returns {{ ok: true, url: string } | { ok: false, reason: string }}
 */
function validateMirrorImageUrl(url) {
  if (typeof url !== 'string' || url.length === 0) {
    return { ok: false, reason: 'image URL required' };
  }
  if (url.length > MAX_DATA_URL_LEN) {
    return { ok: false, reason: 'image payload too large' };
  }

  if (url.startsWith('data:image/')) {
    const semi = url.indexOf(';base64,');
    if (semi === -1) return { ok: false, reason: 'data URL must be ;base64,' };
    const mime = url.slice('data:'.length, semi).toLowerCase();
    const allowed = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ]);
    if (!allowed.has(mime)) {
      return { ok: false, reason: 'unsupported data:image mime type' };
    }
    return { ok: true, url };
  }

  if (!url.startsWith('https://')) {
    return { ok: false, reason: 'only data:image or https image URLs are allowed' };
  }

  let u;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, reason: 'invalid URL' };
  }

  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host === '[::1]' ||
    /^169\.254\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return { ok: false, reason: 'private or loopback hosts are not allowed for image URLs' };
  }

  return { ok: true, url };
}

module.exports = { validateMirrorImageUrl, MAX_DATA_URL_LEN };
