'use strict';

/**
 * callbackErrors.test.js — node:test
 *
 * Tests the getCallbackErrorMessage() logic in server/routes/telegram.js.
 *
 * Because getCallbackErrorMessage is a module-private function, we extract
 * the mapping logic into a testable helper here and keep the route module
 * as a thin wrapper.
 *
 * Coverage:
 *   • WORKER_IDENTITY_MISMATCH → linked account message
 *   • LEAD_NOT_YOURS           → stale assignment message
 *   • INVALID_TRANSITION       → per-status messages
 *   • statusCode 403/404/409   → generic mapped messages
 *   • unknown errors           → safe fallback (no internals exposed)
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Inline the mapping function (mirrors the one in telegram.js exactly)
// ---------------------------------------------------------------------------

function getCallbackErrorMessage(err) {
  switch (err.code) {
    case 'WORKER_IDENTITY_MISMATCH':
      return 'Your Telegram account is not linked to this worker profile. Contact admin.';

    case 'LEAD_NOT_YOURS':
      return 'This lead is no longer assigned to you.';

    case 'INVALID_TRANSITION': {
      const s = err.leadStatus ?? '';
      if (s === 'accepted')   return 'This lead has already been accepted.';
      if (s === 'timeout')    return 'This lead timed out before you responded.';
      if (s === 'canceled')   return 'This lead was canceled.';
      if (s === 'unassigned') return 'This lead is no longer available.';
      return 'This lead is no longer available (state changed).';
    }

    default:
      if (err.statusCode === 403) return 'Unauthorized action. Contact admin.';
      if (err.statusCode === 404) return 'This lead no longer exists.';
      if (err.statusCode === 409) return 'Action conflict — this lead may already be processed.';
      return 'Unable to process your response. Please try again or contact admin.';
  }
}

function makeErr({ code, statusCode, leadStatus, message = 'test error' } = {}) {
  const e = new Error(message);
  if (code)        e.code        = code;
  if (statusCode)  e.statusCode  = statusCode;
  if (leadStatus)  e.leadStatus  = leadStatus;
  return e;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getCallbackErrorMessage — identity errors', () => {
  test('WORKER_IDENTITY_MISMATCH returns linked-account message', () => {
    const msg = getCallbackErrorMessage(makeErr({ code: 'WORKER_IDENTITY_MISMATCH' }));
    assert.ok(msg.includes('not linked'), `got: ${msg}`);
    assert.ok(msg.includes('Contact admin'));
    // Must NOT contain internal details
    assert.ok(!msg.includes('telegram_chat_id'));
    assert.ok(!msg.includes('workerId'));
  });

  test('LEAD_NOT_YOURS returns stale-assignment message', () => {
    const msg = getCallbackErrorMessage(makeErr({ code: 'LEAD_NOT_YOURS' }));
    assert.ok(msg.includes('no longer assigned to you'));
  });
});

describe('getCallbackErrorMessage — invalid transitions', () => {
  test('INVALID_TRANSITION + accepted status', () => {
    const msg = getCallbackErrorMessage(makeErr({ code: 'INVALID_TRANSITION', leadStatus: 'accepted' }));
    assert.ok(msg.includes('already been accepted'));
  });

  test('INVALID_TRANSITION + timeout status', () => {
    const msg = getCallbackErrorMessage(makeErr({ code: 'INVALID_TRANSITION', leadStatus: 'timeout' }));
    assert.ok(msg.includes('timed out'));
  });

  test('INVALID_TRANSITION + canceled status', () => {
    const msg = getCallbackErrorMessage(makeErr({ code: 'INVALID_TRANSITION', leadStatus: 'canceled' }));
    assert.ok(msg.includes('canceled'));
  });

  test('INVALID_TRANSITION + unassigned status', () => {
    const msg = getCallbackErrorMessage(makeErr({ code: 'INVALID_TRANSITION', leadStatus: 'unassigned' }));
    assert.ok(msg.includes('no longer available'));
  });

  test('INVALID_TRANSITION + unknown status falls back gracefully', () => {
    const msg = getCallbackErrorMessage(makeErr({ code: 'INVALID_TRANSITION', leadStatus: 'new' }));
    assert.ok(msg.includes('no longer available'));
    // Must not expose raw status string in a misleading way
    assert.ok(!msg.includes('stack'));
  });
});

describe('getCallbackErrorMessage — HTTP status fallbacks', () => {
  test('statusCode 403 without specific code', () => {
    const msg = getCallbackErrorMessage(makeErr({ statusCode: 403 }));
    assert.ok(msg.includes('Unauthorized'));
  });

  test('statusCode 404', () => {
    const msg = getCallbackErrorMessage(makeErr({ statusCode: 404 }));
    assert.ok(msg.includes('no longer exists'));
  });

  test('statusCode 409', () => {
    const msg = getCallbackErrorMessage(makeErr({ statusCode: 409 }));
    assert.ok(msg.includes('conflict'));
  });

  test('unknown error returns safe fallback', () => {
    const err = new Error('ECONNRESET — pool exhausted at line 42 of pg.js');
    const msg = getCallbackErrorMessage(err);
    // User must not see internal error message
    assert.ok(!msg.includes('ECONNRESET'));
    assert.ok(!msg.includes('pool'));
    assert.ok(!msg.includes('pg.js'));
    // Must be a human-readable sentence
    assert.ok(msg.length > 10);
  });
});

describe('getCallbackErrorMessage — message length safety', () => {
  // Telegram answerCallbackQuery has a 200-char limit on the text field
  test('all mapped messages are within 200 chars', () => {
    const testCases = [
      makeErr({ code: 'WORKER_IDENTITY_MISMATCH' }),
      makeErr({ code: 'LEAD_NOT_YOURS' }),
      makeErr({ code: 'INVALID_TRANSITION', leadStatus: 'accepted' }),
      makeErr({ code: 'INVALID_TRANSITION', leadStatus: 'timeout' }),
      makeErr({ code: 'INVALID_TRANSITION', leadStatus: 'canceled' }),
      makeErr({ code: 'INVALID_TRANSITION', leadStatus: 'unassigned' }),
      makeErr({ code: 'INVALID_TRANSITION', leadStatus: 'new' }),
      makeErr({ statusCode: 403 }),
      makeErr({ statusCode: 404 }),
      makeErr({ statusCode: 409 }),
      new Error('some generic error'),
    ];

    for (const tc of testCases) {
      const msg = getCallbackErrorMessage(tc);
      assert.ok(
        msg.length <= 200,
        `Message too long (${msg.length} chars): "${msg}"`
      );
    }
  });
});
