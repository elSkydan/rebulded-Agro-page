'use strict';

/**
 * config/validateEnv.js
 *
 * Fail-fast startup validation for required environment variables.
 *
 * Rules:
 *   • Hard errors  → process.exit(1)   — application must not start
 *   • Warnings     → console.warn      — application continues but degraded
 *
 * Call validateEnv() as the FIRST thing in server.js, before any route
 * or service is initialised.  This prevents silent placeholder configs
 * from reaching production.
 */

// Regex that matches known placeholder / template values
const PLACEHOLDER_PATTERNS = [
  /^123456:ABC/,                // example token from Telegram docs
  /your[_-]?token/i,
  /change[_-]?me/i,
  /abc[_-]?def/i,
  /test[_-]?token/i,
  /placeholder/i,
];

/**
 * Returns true when the value looks like an unfilled template placeholder.
 * @param {string} value
 * @returns {boolean}
 */
function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some(p => p.test(value));
}

/**
 * Validate all required environment variables.
 * Exits the process with code 1 if any hard error is found.
 */
function validateEnv() {
  const errors   = [];
  const warnings = [];

  const isProduction = process.env.NODE_ENV === 'production';

  // ── TELEGRAM_BOT_TOKEN ─────────────────────────────────────────────────────
  // Format: <numeric_bot_id>:<35+ char alphanumeric token>
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    errors.push('TELEGRAM_BOT_TOKEN is not set');
  } else if (isPlaceholder(token)) {
    errors.push(`TELEGRAM_BOT_TOKEN appears to be a placeholder: "${token}"`);
  } else if (!/^\d{5,}:[A-Za-z0-9_-]{35,}$/.test(token)) {
    errors.push(
      `TELEGRAM_BOT_TOKEN format is invalid — expected "<numeric_id>:<35+chars>", ` +
      `got: "${token.slice(0, 20)}..."`
    );
  }

  // ── ADMIN_CHAT_ID ──────────────────────────────────────────────────────────
  const adminChatIdRaw = process.env.ADMIN_CHAT_ID;
  if (!adminChatIdRaw) {
    errors.push('ADMIN_CHAT_ID is not set');
  } else {
    const n = Number(adminChatIdRaw);
    if (!Number.isFinite(n) || n === 0) {
      errors.push(
        `ADMIN_CHAT_ID must be a non-zero integer — got: "${adminChatIdRaw}". ` +
        `Use @userinfobot in Telegram to find your numeric chat_id.`
      );
    }
  }

  // ── PUBLIC_BASE_URL — required in production ───────────────────────────────
  // Also required for the telegram:setup script to function.
  // In development, Telegram cannot reach localhost so this is a warning only.
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  if (!publicBaseUrl) {
    if (isProduction) {
      errors.push(
        'PUBLIC_BASE_URL is required in production ' +
        '(used to register the Telegram webhook via npm run telegram:setup)'
      );
    } else {
      warnings.push(
        'PUBLIC_BASE_URL is not set — Telegram webhook cannot be registered. ' +
        'Use ngrok/Cloudflare Tunnel and set PUBLIC_BASE_URL=https://<tunnel-url>'
      );
    }
  } else if (!/^https:\/\/.+/.test(publicBaseUrl)) {
    errors.push(
      `PUBLIC_BASE_URL must start with https:// ` +
      `(Telegram rejects non-HTTPS webhook URLs) — got: "${publicBaseUrl}"`
    );
  }

  // ── ADMIN_LOG_CHANNEL — optional, warn if absent ───────────────────────────
  if (!process.env.ADMIN_LOG_CHANNEL) {
    warnings.push(
      'ADMIN_LOG_CHANNEL is not set — delivery-failure alerts will fall back to ADMIN_CHAT_ID'
    );
  }

  // ── DATABASE_URL ───────────────────────────────────────────────────────────
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    errors.push('Neither DATABASE_URL nor PGHOST is set — cannot connect to PostgreSQL');
  }

  // ── Emit ───────────────────────────────────────────────────────────────────
  warnings.forEach(w => console.warn(`[startup:env] WARNING: ${w}`));

  if (errors.length > 0) {
    errors.forEach(e => console.error(`[startup:env] ERROR: ${e}`));
    console.error('[startup:env] Application cannot start with invalid configuration. Exiting.');
    process.exit(1);
  }

  console.log('[startup:env] Environment validation passed ✓');
}

module.exports = { validateEnv, isPlaceholder };
