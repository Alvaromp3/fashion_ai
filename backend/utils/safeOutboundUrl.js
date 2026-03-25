'use strict';

const ALLOWED_ML_CLASSIFY_PATHS = new Set(['/classify', '/classify-vit']);

/** Exact path (no query) for GET proxy to ML dashboard artifacts */
const ALLOWED_ML_PROXY_GET_PATHS = new Set([
  '/data-audit',
  '/confusion-matrix',
  '/confusion-matrix-vit',
  '/confusion-matrix-vit-real',
  '/training-curves-vit',
  '/metrics',
  '/metrics-vit'
]);

function normalizeMlBase(mlServiceUrl) {
  let base = typeof mlServiceUrl === 'string' ? mlServiceUrl.trim() : '';
  if (!base) base = 'http://localhost:6001';
  base = base.replace(/\/+$/, '');
  let u;
  try {
    u = new URL(base);
  } catch {
    throw new Error('Invalid ML_SERVICE_URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('ML_SERVICE_URL must use http or https');
  }
  return base;
}

/**
 * Build ML service POST URL from env base + fixed endpoint (no user-controlled path segments).
 * @param {string} mlServiceUrl
 * @param {string} endpoint - must be in ALLOWED_ML_CLASSIFY_PATHS
 * @returns {string}
 */
function buildMlClassifyUrl(mlServiceUrl, endpoint) {
  if (!ALLOWED_ML_CLASSIFY_PATHS.has(endpoint)) {
    throw new Error('Invalid ML classification endpoint');
  }
  const base = normalizeMlBase(mlServiceUrl);
  return `${base}${endpoint}`;
}

/**
 * Full URL for proxy GET to ML (path before ? must be allowlisted).
 * @param {string} mlServiceUrl
 * @param {string} subPath - e.g. '/metrics' or '/metrics?x=1'
 * @returns {string}
 */
function buildMlProxyGetUrl(mlServiceUrl, subPath) {
  if (typeof subPath !== 'string' || !subPath.startsWith('/')) {
    throw new Error('Invalid ML proxy path');
  }
  const pathOnly = subPath.split('?')[0];
  if (!ALLOWED_ML_PROXY_GET_PATHS.has(pathOnly)) {
    throw new Error('Invalid ML proxy path');
  }
  const base = normalizeMlBase(mlServiceUrl);
  return `${base}${subPath}`;
}

module.exports = {
  buildMlClassifyUrl,
  buildMlProxyGetUrl,
  ALLOWED_ML_CLASSIFY_PATHS,
  ALLOWED_ML_PROXY_GET_PATHS
};
