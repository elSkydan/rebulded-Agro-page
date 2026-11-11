'use strict';

/**
 * adminToken.test.js — node:test
 * The admin API must fail closed when ADMIN_TOKEN is not configured.
 */

const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const CONFIG = require.resolve('../config/config');
const VALIDATE = require.resolve('../config/validateEnv');

const VALID_ENV = {
  TELEGRAM_BOT_TOKEN: '1234567:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  ADMIN_CHAT_ID: '197656058',
  ADMIN_LOG_CHANNEL: '197656058',
  PUBLIC_BASE_URL: 'https://example.com',
  DATABASE_URL: 'postgres://u:p@localhost/db',
};

let savedEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
  delete require.cache[CONFIG];
  delete require.cache[VALIDATE];
});

afterEach(() => {
  process.env = savedEnv;
  delete require.cache[CONFIG];
  delete require.cache[VALIDATE];
  mock.restoreAll();
});

function warningsFor(adminToken) {
  process.env = { ...VALID_ENV };
  if (adminToken !== undefined) process.env.ADMIN_TOKEN = adminToken;
  const warn = mock.method(console, 'warn', () => {});
  mock.method(console, 'log', () => {});
  const exit = mock.method(process, 'exit', () => {});
  require('../config/validateEnv').validateEnv();
  assert.equal(exit.mock.callCount(), 0, 'ADMIN_TOKEN problems must not stop the server');
  return warn.mock.calls.map((c) => String(c.arguments[0])).filter((m) => m.includes('ADMIN_TOKEN'));
}

describe('ADMIN_TOKEN', () => {
  test('defaults to empty (auth rejects everything) instead of a public placeholder', () => {
    delete process.env.ADMIN_TOKEN;
    assert.equal(require('../config/config').ADMIN_TOKEN, '');
  });

  test('validateEnv warns when missing', () => {
    assert.equal(warningsFor(undefined).length, 1);
  });

  test('validateEnv warns on a placeholder', () => {
    assert.equal(warningsFor('change-me').length, 1);
  });

  test('validateEnv warns when shorter than 32 chars', () => {
    assert.equal(warningsFor('short-token').length, 1);
  });

  test('no warning for a strong token', () => {
    assert.equal(warningsFor('a'.repeat(40)).length, 0);
  });
});
