'use strict';

/**
 * validateEnv unit tests — node:test
 *
 * Tests the fail-fast env validation logic without spawning a real server.
 * process.exit() is monkey-patched to throw instead, allowing assertions
 * on the exit code and log output.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// We test the internal helpers directly by requiring the module and then
// calling validateEnv() with a patched process.exit so it throws instead.

const { isPlaceholder } = require('../config/validateEnv');

// ---------------------------------------------------------------------------
// isPlaceholder
// ---------------------------------------------------------------------------

describe('isPlaceholder()', () => {
  test('detects Telegram docs example token prefix', () => {
    assert.ok(isPlaceholder('123456:ABC-DEF_not_real'));
  });

  test('detects "your-token" phrase', () => {
    assert.ok(isPlaceholder('your-token'));
    assert.ok(isPlaceholder('your_token_here'));
  });

  test('detects "change-me" phrase', () => {
    assert.ok(isPlaceholder('change-me-to-something'));
    assert.ok(isPlaceholder('CHANGE_ME'));
  });

  test('detects "placeholder" word', () => {
    assert.ok(isPlaceholder('placeholder_value'));
  });

  test('detects "test-token" phrase', () => {
    assert.ok(isPlaceholder('test_token_123'));
  });

  test('accepts a valid-looking bot token', () => {
    assert.ok(!isPlaceholder('8123456789:AAErql98V5-D5aOFAmOBiqrZg-peJvnGrRg'));
  });

  test('accepts a random admin token', () => {
    assert.ok(!isPlaceholder('124321345123sedafasdfasd(*asdfasd'));
  });
});

// ---------------------------------------------------------------------------
// validateEnv() — using process.exit patch
//
// We re-require the module inside each test with freshly set env vars.
// Node module cache is cleared before each test so the module re-evaluates.
// ---------------------------------------------------------------------------

/**
 * Run validateEnv() in an isolated env snapshot.
 * Returns { exited: bool, exitCode: number|null, warnings: string[], errors: string[] }
 */
function runValidateEnv(envOverrides = {}) {
  // Snapshot + override env
  const originalEnv = { ...process.env };
  // Clear Telegram-related vars first so tests start clean
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.ADMIN_CHAT_ID;
  delete process.env.PUBLIC_BASE_URL;
  delete process.env.ADMIN_LOG_CHANNEL;
  delete process.env.DATABASE_URL;
  delete process.env.PGHOST;
  Object.assign(process.env, envOverrides);

  const logs     = [];
  const errors   = [];
  let exited     = false;
  let exitCode   = null;

  // Patch console
  const origLog   = console.log;
  const origWarn  = console.warn;
  const origError = console.error;
  console.log   = (...args) => logs.push(args.join(' '));
  console.warn  = (...args) => logs.push('[WARN] ' + args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));

  // Patch process.exit to throw
  const origExit = process.exit;
  process.exit = (code) => {
    exited   = true;
    exitCode = code;
    throw new Error(`process.exit(${code})`);
  };

  try {
    // Clear module cache so validateEnv re-reads process.env fresh
    delete require.cache[require.resolve('../config/validateEnv')];
    const { validateEnv } = require('../config/validateEnv');
    validateEnv();
  } catch (e) {
    if (!exited) throw e; // re-throw unexpected errors
  } finally {
    // Restore everything
    console.log   = origLog;
    console.warn  = origWarn;
    console.error = origError;
    process.exit  = origExit;
    process.env   = originalEnv;  // restore full env snapshot
    delete require.cache[require.resolve('../config/validateEnv')];
  }

  return { exited, exitCode, logs, errors };
}

// Minimal valid env that passes all checks in non-production mode
const VALID_ENV = {
  TELEGRAM_BOT_TOKEN: '8123456789:AAErql98V5-D5aOFAmOBiqrZg-peJvnGrRg',
  ADMIN_CHAT_ID:      '197656058',
  DATABASE_URL:       'postgres://localhost/lead_distribution',
  PUBLIC_BASE_URL:    'https://example.ngrok-free.app',
};

describe('validateEnv() — pass cases', () => {
  test('passes with all valid required vars set', () => {
    const { exited, errors } = runValidateEnv({ ...VALID_ENV });
    assert.ok(!exited, 'should not exit');
    assert.equal(errors.length, 0, `unexpected errors: ${errors.join(' | ')}`);
  });

  test('passes without PUBLIC_BASE_URL in non-production mode (warns only)', () => {
    const env = { ...VALID_ENV };
    delete env.PUBLIC_BASE_URL;
    const { exited, logs } = runValidateEnv(env);
    assert.ok(!exited, 'should not exit when PUBLIC_BASE_URL missing outside production');
    assert.ok(
      logs.some(l => l.includes('PUBLIC_BASE_URL')),
      'should warn about missing PUBLIC_BASE_URL'
    );
  });

  test('passes without ADMIN_LOG_CHANNEL (warns only)', () => {
    const { exited, logs } = runValidateEnv({ ...VALID_ENV });
    assert.ok(!exited);
    // ADMIN_LOG_CHANNEL not in VALID_ENV — expect a warning
    assert.ok(logs.some(l => l.includes('ADMIN_LOG_CHANNEL')));
  });
});

describe('validateEnv() — fail cases', () => {
  test('exits when TELEGRAM_BOT_TOKEN is missing', () => {
    const env = { ...VALID_ENV };
    delete env.TELEGRAM_BOT_TOKEN;
    const { exited, exitCode } = runValidateEnv(env);
    assert.ok(exited);
    assert.equal(exitCode, 1);
  });

  test('exits when TELEGRAM_BOT_TOKEN is a placeholder', () => {
    const { exited, exitCode, errors } = runValidateEnv({
      ...VALID_ENV,
      TELEGRAM_BOT_TOKEN: '123456:ABC-your-token-here',
    });
    assert.ok(exited);
    assert.equal(exitCode, 1);
    assert.ok(errors.some(e => e.includes('placeholder')));
  });

  test('exits when TELEGRAM_BOT_TOKEN has wrong format', () => {
    const { exited, exitCode } = runValidateEnv({
      ...VALID_ENV,
      TELEGRAM_BOT_TOKEN: 'not-a-real-token',
    });
    assert.ok(exited);
    assert.equal(exitCode, 1);
  });

  test('exits when ADMIN_CHAT_ID is missing', () => {
    const env = { ...VALID_ENV };
    delete env.ADMIN_CHAT_ID;
    const { exited, exitCode } = runValidateEnv(env);
    assert.ok(exited);
    assert.equal(exitCode, 1);
  });

  test('exits when ADMIN_CHAT_ID is zero', () => {
    const { exited, exitCode } = runValidateEnv({
      ...VALID_ENV,
      ADMIN_CHAT_ID: '0',
    });
    assert.ok(exited);
    assert.equal(exitCode, 1);
  });

  test('exits when ADMIN_CHAT_ID is non-numeric', () => {
    const { exited, exitCode } = runValidateEnv({
      ...VALID_ENV,
      ADMIN_CHAT_ID: 'not-a-number',
    });
    assert.ok(exited);
    assert.equal(exitCode, 1);
  });

  test('exits when PUBLIC_BASE_URL uses http:// in production', () => {
    const { exited, exitCode, errors } = runValidateEnv({
      ...VALID_ENV,
      NODE_ENV:        'production',
      PUBLIC_BASE_URL: 'http://example.com',
    });
    assert.ok(exited);
    assert.equal(exitCode, 1);
    assert.ok(errors.some(e => e.includes('https://')));
  });

  test('exits when PUBLIC_BASE_URL is missing in production', () => {
    const env = { ...VALID_ENV, NODE_ENV: 'production' };
    delete env.PUBLIC_BASE_URL;
    const { exited, exitCode } = runValidateEnv(env);
    assert.ok(exited);
    assert.equal(exitCode, 1);
  });

  test('exits when both DATABASE_URL and PGHOST are missing', () => {
    const env = { ...VALID_ENV };
    delete env.DATABASE_URL;
    const { exited, exitCode } = runValidateEnv(env);
    assert.ok(exited);
    assert.equal(exitCode, 1);
  });
});
