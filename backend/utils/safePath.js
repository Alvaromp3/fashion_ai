'use strict';
const path = require('path');

/**
 * Resolve ...segments under baseDir; throw if result escapes baseDir.
 */
function resolveUnder(baseDir, ...segments) {
  const base = path.resolve(baseDir);
  const clean = segments
    .filter((s) => s != null && String(s).length > 0)
    .map((s) => String(s));
  const target = path.resolve(base, ...clean);
  const rel = path.relative(base, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path escapes allowed directory: ${target}`);
  }
  return target;
}

/**
 * Resolve /uploads/... URL to an absolute path under uploadsRoot. Returns null if invalid.
 * @param {string} imagenUrl - e.g. /uploads/userId/file.jpg
 * @param {string} uploadsAbsoluteDir - absolute path to backend/uploads
 */
function resolveUploadsPublicPath(imagenUrl, uploadsAbsoluteDir) {
  if (typeof imagenUrl !== 'string' || !imagenUrl.startsWith('/uploads/')) return null;
  const raw = imagenUrl.replace(/^\/uploads\/?/, '');
  const parts = raw.split(/[/\\]+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.some((p) => p === '.' || p === '..')) return null;
  try {
    return resolveUnder(uploadsAbsoluteDir, ...parts);
  } catch {
    return null;
  }
}

module.exports = { resolveUnder, resolveUploadsPublicPath };
