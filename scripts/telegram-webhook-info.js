#!/usr/bin/env node
'use strict';

/**
 * Shows current Telegram webhook URL, errors, and pending updates.
 * Usage: npm run telegram:webhook:info
 */

require('dotenv').config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const EXPECTED = process.env.PUBLIC_BASE_URL || process.env.WEBHOOK_BASE_URL;

if (!TOKEN) {
  console.error('[telegram:webhook-info] TELEGRAM_BOT_TOKEN is not set');
  process.exit(1);
}

async function info() {
  const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
  const data = await resp.json();

  if (!data.ok) {
    console.error('[telegram:webhook-info] Telegram error:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const wi = data.result;
  const expectedUrl = EXPECTED
    ? `${EXPECTED.replace(/\/+$/, '')}/api/telegram/webhook`
    : null;

  console.log('\n[telegram:webhook-info]');
  console.log('  url:                  ', wi.url || '(none — buttons will NOT work)');
  console.log('  pending_update_count: ', wi.pending_update_count);
  if (expectedUrl) {
    console.log('  expected (.env):      ', expectedUrl);
    console.log('  url matches .env:     ', wi.url === expectedUrl);
  }
  if (wi.last_error_message) {
    console.error('  last_error_message:   ', wi.last_error_message);
  }

  if (!wi.url) {
    console.warn('\n  → Run: npm run telegram:setup  (with server + ngrok running)\n');
  }

  console.log('\nRaw:', JSON.stringify(data, null, 2));
}

info().catch(err => {
  console.error('[telegram:webhook-info]', err.message);
  process.exit(1);
});
