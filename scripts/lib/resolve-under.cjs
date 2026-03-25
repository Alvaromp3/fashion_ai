'use strict';
const path = require('path');
const fs = require('fs');

/**
 * Resuelve path.join(baseDir, ...segments) y comprueba que el resultado no salga de baseDir.
 * Evita path traversal si algún segmento viniera de entrada no confiable.
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

/** @returns {boolean} */
function existsUnder(baseDir, ...segments) {
  const p = resolveUnder(baseDir, ...segments);
  return fs.existsSync(p);
}

/** @returns {string} */
function readOptionalUtf8(baseDir, ...segments) {
  const p = resolveUnder(baseDir, ...segments);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

/** @returns {string} */
function readRequiredUtf8(baseDir, ...segments) {
  const p = resolveUnder(baseDir, ...segments);
  if (!fs.existsSync(p)) {
    throw new Error(`Required file missing under ${baseDir}: ${segments.join('/')}`);
  }
  return fs.readFileSync(p, 'utf8');
}

/** Last argument must be UTF-8 string file content; preceding args are path segments. */
function writeUtf8(baseDir, ...segmentsAndContent) {
  const parts = [...segmentsAndContent];
  const content = parts.pop();
  if (typeof content !== 'string') throw new Error('writeUtf8: last argument must be string content');
  const p = resolveUnder(baseDir, ...parts);
  fs.writeFileSync(p, content, 'utf8');
}

function unlinkIfExists(baseDir, ...segments) {
  const p = resolveUnder(baseDir, ...segments);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

module.exports = {
  resolveUnder,
  existsUnder,
  readOptionalUtf8,
  readRequiredUtf8,
  writeUtf8,
  unlinkIfExists
};
