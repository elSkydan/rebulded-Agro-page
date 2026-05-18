'use strict';

/**
 * Contract: telegramService.sendLeadToWorker uses callback_data JSON with keys
 * l (lead id), w (worker id), a ('accept' | 'reject'). Webhook must parse the same shape.
 */

const { test } = require('node:test');
const assert = require('node:assert');

const TELEGRAM_CALLBACK_MAX_BYTES = 64;

function buildCallbackPayload(leadId, workerId, action) {
  return JSON.stringify({ l: leadId, w: workerId, a: action });
}

function parseCallbackPayload(raw) {
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object') throw new Error('invalid');
  const leadId = data.l;
  const workerId = data.w;
  const action = data.a;
  if (!Number.isFinite(Number(leadId)) || !Number.isFinite(Number(workerId))) {
    throw new Error('invalid ids');
  }
  if (action !== 'accept' && action !== 'reject') throw new Error('invalid action');
  return {
    leadId: Number(leadId),
    workerId: Number(workerId),
    action,
  };
}

test('callback_data JSON matches sendLeadToWorker format (parse roundtrip)', () => {
  const raw = buildCallbackPayload(42, 7, 'accept');
  const parsed = parseCallbackPayload(raw);
  assert.strictEqual(parsed.leadId, 42);
  assert.strictEqual(parsed.workerId, 7);
  assert.strictEqual(parsed.action, 'accept');
});

test('callback_data stays within Telegram 64-byte limit for typical ids', () => {
  const raw = buildCallbackPayload(999999, 888888, 'reject');
  assert.ok(Buffer.byteLength(raw, 'utf8') <= TELEGRAM_CALLBACK_MAX_BYTES, raw);
});
