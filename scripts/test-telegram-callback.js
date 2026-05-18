#!/usr/bin/env node
'use strict';

/**
 * Simulates a Telegram inline-button callback locally (no Telegram needed).
 *
 * Usage:
 *   node scripts/test-telegram-callback.js accept 40 6 231918839
 *   node scripts/test-telegram-callback.js reject 40 6 231918839
 *
 * Args: action leadId workerId telegramChatId [port]
 */

const action = process.argv[2];
const leadId = Number(process.argv[3]);
const workerId = Number(process.argv[4]);
const telegramChatId = Number(process.argv[5]);
const port = process.argv[6] || process.env.PORT || 3000;

if (!['accept', 'reject'].includes(action) || !Number.isFinite(leadId) || !Number.isFinite(workerId)) {
  console.error('Usage: node scripts/test-telegram-callback.js <accept|reject> <leadId> <workerId> <telegramChatId> [port]');
  process.exit(1);
}

const body = {
  callback_query: {
    id: `test-${Date.now()}`,
    from: { id: telegramChatId },
    message: { message_id: 45 },
    data: JSON.stringify({ l: leadId, w: workerId, a: action }),
  },
};

async function main() {
  const url = `http://127.0.0.1:${port}/api/telegram/webhook`;
  console.log(`POST ${url}`);
  console.log(JSON.stringify(body, null, 2));

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  console.log('HTTP status:', res.status, res.statusText);
  console.log('Check server console for [telegram:callback] logs and DB lead status.');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
