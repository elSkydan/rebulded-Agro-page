#!/usr/bin/env node
'use strict';

/**
 * Registers the Telegram Bot webhook with the Telegram API.
 *
 * Usage: npm run telegram:setup
 * Requires: TELEGRAM_BOT_TOKEN, PUBLIC_BASE_URL (HTTPS, e.g. ngrok URL)
 */

require('dotenv').config();

function die(msg) {
  console.error(`[telegram:setup] ERROR: ${msg}`);
  process.exit(1);
}

const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || process.env.WEBHOOK_BASE_URL;

if (!TOKEN) {
  die('TELEGRAM_BOT_TOKEN is not set in .env');
}

if (!BASE_URL) {
  die('PUBLIC_BASE_URL is not set in .env (use your ngrok HTTPS URL)');
}

if (!/^https:\/\/.+/.test(BASE_URL)) {
  die(`PUBLIC_BASE_URL must be HTTPS. Got: "${BASE_URL}"`);
}

const webhookUrl = `${BASE_URL.replace(/\/+$/, '')}/api/telegram/webhook`;

async function setup() {
  console.log('[telegram:setup] Registering:', webhookUrl);

  const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      url:             webhookUrl,
      allowed_updates: ['callback_query'],
    }),
  });

  const data = await resp.json();
  console.log('[telegram:setup] Response:', JSON.stringify(data, null, 2));

  if (!data.ok) {
    die(data.description || 'setWebhook failed');
  }

  console.log('[telegram:setup] OK — run npm run telegram:webhook:info to verify');
}

setup().catch(err => die(err.message));
