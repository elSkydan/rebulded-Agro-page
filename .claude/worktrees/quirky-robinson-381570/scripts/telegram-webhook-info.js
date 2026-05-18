#!/usr/bin/env node
'use strict';

/**
 * scripts/telegram-webhook-info.js
 *
 * Queries Telegram for the current webhook configuration and pending updates.
 *
 * Usage:
 *   npm run telegram:webhook:info
 *
 * Useful for verifying:
 *   • Which URL Telegram is currently POSTing updates to
 *   • Whether there are pending undelivered updates
 *   • Last error message from Telegram (if webhook is failing)
 *   • Max connections and allowed update types
 */

require('dotenv').config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  console.error(
    '[telegram:webhook-info] ERROR: TELEGRAM_BOT_TOKEN is not set.\n' +
    '  Set it in .env or as a shell env var.'
  );
  process.exit(1);
}

async function info() {
  console.log('[telegram:webhook-info] Fetching webhook info...');

  let resp;
  try {
    resp = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
  } catch (err) {
    console.error('[telegram:webhook-info] Network error:', err.message);
    process.exit(1);
  }

  const data = await resp.json();

  if (!data.ok) {
    console.error(
      '[telegram:webhook-info] Telegram error:',
      JSON.stringify(data, null, 2)
    );
    process.exit(1);
  }

  const wi = data.result;

  console.log('\n[telegram:webhook-info] Current webhook configuration:');
  console.log('  url:                        ', wi.url            || '(none)');
  console.log('  has_custom_certificate:     ', wi.has_custom_certificate);
  console.log('  pending_update_count:       ', wi.pending_update_count);
  console.log('  max_connections:            ', wi.max_connections ?? '(default)');
  console.log('  allowed_updates:            ', (wi.allowed_updates ?? []).join(', ') || '(all)');

  if (wi.last_error_date) {
    const lastErr = new Date(wi.last_error_date * 1000).toISOString();
    console.error('  last_error_date:            ', lastErr);
    console.error('  last_error_message:         ', wi.last_error_message);
  } else {
    console.log('  last_error_date:             (none)');
  }

  if (!wi.url) {
    console.warn(
      '\n[telegram:webhook-info] WARNING: No webhook URL is registered.\n' +
      '  Run "npm run telegram:setup" to register your webhook URL.'
    );
  } else if (wi.pending_update_count > 0) {
    console.warn(
      `\n[telegram:webhook-info] WARNING: ${wi.pending_update_count} pending update(s).\n` +
      '  Telegram could not deliver them — check server logs for errors.'
    );
  }

  console.log('\n[telegram:webhook-info] Raw response:', JSON.stringify(data, null, 2));
}

info().catch(err => {
  console.error('[telegram:webhook-info] Unexpected error:', err.message);
  process.exit(1);
});
