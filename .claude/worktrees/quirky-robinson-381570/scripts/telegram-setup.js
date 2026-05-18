#!/usr/bin/env node
'use strict';

/**
 * scripts/telegram-setup.js
 *
 * Registers the Telegram Bot webhook with the Telegram API.
 *
 * Usage:
 *   npm run telegram:setup
 *
 * Required env vars (.env or shell):
 *   TELEGRAM_BOT_TOKEN   — bot token from @BotFather
 *   PUBLIC_BASE_URL      — public HTTPS base URL, e.g. https://yourdomain.com
 *                          (or WEBHOOK_BASE_URL as an alias)
 *
 * On success: exits 0
 * On failure: prints the error and exits 1
 */

require('dotenv').config();

// ---------------------------------------------------------------------------
// Validate inputs
// ---------------------------------------------------------------------------

function die(msg) {
  console.error(`[telegram:setup] ERROR: ${msg}`);
  process.exit(1);
}

const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || process.env.WEBHOOK_BASE_URL;

if (!TOKEN) {
  die(
    'TELEGRAM_BOT_TOKEN is not set.\n' +
    '  1. Open .env\n' +
    '  2. Set TELEGRAM_BOT_TOKEN=<your token from @BotFather>'
  );
}

if (!/^\d{5,}:[A-Za-z0-9_-]{35,}$/.test(TOKEN)) {
  die(
    `TELEGRAM_BOT_TOKEN format looks wrong: "${TOKEN.slice(0, 20)}..."\n` +
    '  Expected format: <numeric_id>:<35+chars>  (get it from @BotFather)'
  );
}

if (!BASE_URL) {
  die(
    'PUBLIC_BASE_URL (or WEBHOOK_BASE_URL) is not set.\n' +
    '  1. Open .env\n' +
    '  2. Set PUBLIC_BASE_URL=https://yourdomain.com\n' +
    '  For local dev: use ngrok or Cloudflare Tunnel and set the tunnel URL.'
  );
}

if (!/^https:\/\/.+/.test(BASE_URL)) {
  die(
    `PUBLIC_BASE_URL must start with https:// — Telegram rejects plain HTTP.\n` +
    `  Got: "${BASE_URL}"`
  );
}

const webhookUrl = `${BASE_URL.replace(/\/+$/, '')}/api/telegram/webhook`;
const apiUrl     = `https://api.telegram.org/bot${TOKEN}/setWebhook`;

// ---------------------------------------------------------------------------
// Register webhook
// ---------------------------------------------------------------------------

async function setup() {
  console.log('[telegram:setup] Registering webhook URL:', webhookUrl);

  let resp;
  try {
    resp = await fetch(apiUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: webhookUrl }),
    });
  } catch (err) {
    die(`Network error calling Telegram API: ${err.message}`);
  }

  let data;
  try {
    data = await resp.json();
  } catch (err) {
    die(`Failed to parse Telegram API response: ${err.message}`);
  }

  console.log('[telegram:setup] Telegram API response:', JSON.stringify(data, null, 2));

  if (!data.ok) {
    die(
      `setWebhook failed:\n` +
      `  error_code:  ${data.error_code}\n` +
      `  description: ${data.description}\n\n` +
      `Common causes:\n` +
      `  • Token is invalid or revoked — get a new one from @BotFather\n` +
      `  • URL is not reachable by Telegram (check firewall / tunnelling)\n` +
      `  • URL must be HTTPS with a valid certificate`
    );
  }

  console.log('[telegram:setup] ✓ Webhook registered successfully.');
  console.log(`[telegram:setup]   URL: ${webhookUrl}`);
  console.log('[telegram:setup]   Run "npm run telegram:webhook:info" to verify the registration.');
}

setup().catch(err => {
  die(`Unexpected error: ${err.message}`);
});
