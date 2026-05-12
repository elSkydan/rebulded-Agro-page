'use strict';

const crypto = require('crypto');
const { ADMIN_TOKEN } = require('../../config/config');

module.exports = function auth(req, res, next) {
  const header = req.headers['authorization'] ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  // Reject immediately if token is missing or ADMIN_TOKEN is not configured.
  if (!token || !ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }

  // Timing-safe comparison: prevents character-by-character timing attacks.
  // Buffers must be the same byte length for timingSafeEqual; a length mismatch
  // is itself a definitive rejection, but we still avoid short-circuit leakage
  // by comparing same-length zero-padded copies.
  const tokenBuf = Buffer.from(token);
  const adminBuf = Buffer.from(ADMIN_TOKEN);

  const lengthsMatch = tokenBuf.length === adminBuf.length;
  // Compare against a same-length target so timingSafeEqual never throws.
  const compareTarget = lengthsMatch ? adminBuf : Buffer.alloc(tokenBuf.length);
  const valuesMatch   = crypto.timingSafeEqual(tokenBuf, compareTarget);

  if (!lengthsMatch || !valuesMatch) {
    return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }

  next();
};
