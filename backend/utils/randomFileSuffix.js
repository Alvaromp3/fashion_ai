'use strict';
const crypto = require('crypto');

/** Unpredictable suffix for temp upload filenames / object keys (not for statistical sampling). */
function randomFileSuffix() {
  return crypto.randomBytes(8).toString('hex');
}

module.exports = { randomFileSuffix };
