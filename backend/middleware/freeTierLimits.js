/**
 * Safeguards to stay within free tier: rate limits and optional storage/count caps.
 * Configure via env: RATE_LIMIT_* , PRENDAS_MAX_PER_USER, R2_SOFT_LIMIT_GB
 */

const rateLimit = require('express-rate-limit');

const windowMs = 60 * 1000; // 1 minute
const keyGenerator = (req) => req.user?.sub || req.ip || 'anonymous';

function skipFreeTierLimit(req) {
  const p = (req.path || '') + (req.originalUrl || '');
  return p.includes('/health') || p.includes('ml-health');
}

// General API: 80/min per user (or IP if unauthenticated) to avoid blowing Render hours
const apiMax = Math.min(parseInt(process.env.RATE_LIMIT_API_PER_MIN, 10) || 80, 200);
const apiLimiter = rateLimit({
  windowMs,
  max: apiMax,
  message: { error: 'Too many requests; free tier limit.', retryAfter: 60 },
  keyGenerator,
  skip: skipFreeTierLimit,
  standardHeaders: true,
  legacyHeaders: false
});

// Classify (ML): 20/min per user to protect HF Space and reduce burst cost
const classifyMax = Math.min(parseInt(process.env.RATE_LIMIT_CLASSIFY_PER_MIN, 10) || 20, 60);
const classifyLimiter = rateLimit({
  windowMs,
  max: classifyMax,
  message: { error: 'Too many classification requests. Try again in a minute.', retryAfter: 60 },
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false
});

// Upload (prendas): 15/min per user to protect R2 ops and storage
const uploadMax = Math.min(parseInt(process.env.RATE_LIMIT_UPLOAD_PER_MIN, 10) || 15, 30);
const uploadLimiter = rateLimit({
  windowMs,
  max: uploadMax,
  message: { error: 'Too many uploads. Try again in a minute.', retryAfter: 60 },
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false
});

/** Only run upload limiter for POST /api/prendas/upload and POST /api/prendas/auto */
function uploadLimiterConditional(req, res, next) {
  const isUpload = req.method === 'POST' && (
    req.originalUrl?.endsWith('/upload') ||
    req.originalUrl?.endsWith('/auto')
  );
  if (isUpload) return uploadLimiter(req, res, next);
  next();
}

module.exports = {
  apiLimiter,
  classifyLimiter,
  uploadLimiter,
  uploadLimiterConditional,
  skipFreeTierLimit
};
