'use strict';

/**
 * dbErrors.test.js — node:test
 * PostgreSQL error → safe HTTP error mapping for admin writes (workers).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mapDbError } = require('../server/utils/dbErrors');

const pgErr = (code, extra = {}) => Object.assign(new Error('pg internals: secret detail'), { code, ...extra });

describe('mapDbError', () => {
  test('23505 unique on telegram_chat_id → 409 DUPLICATE', () => {
    assert.deepEqual(mapDbError(pgErr('23505', { constraint: 'workers_telegram_chat_id_key' })), {
      status: 409,
      body: { error: 'Worker with this telegram_chat_id already exists', code: 'DUPLICATE' },
    });
  });

  test('23503 foreign key → 400 CITY_NOT_FOUND', () => {
    assert.deepEqual(mapDbError(pgErr('23503')), {
      status: 400,
      body: { error: 'City not found', code: 'CITY_NOT_FOUND' },
    });
  });

  for (const code of ['23514', '22P02', '22003']) {
    test(`${code} → 400 INVALID_INPUT`, () => {
      assert.deepEqual(mapDbError(pgErr(code)), {
        status: 400,
        body: { error: 'Invalid value', code: 'INVALID_INPUT' },
      });
    });
  }

  test('22001 → 400 value too long', () => {
    assert.deepEqual(mapDbError(pgErr('22001')), {
      status: 400,
      body: { error: 'Value too long', code: 'INVALID_INPUT' },
    });
  });

  test('unknown errors → generic 500 without internals', () => {
    const r = mapDbError(pgErr('XX000'));
    assert.deepEqual(r, { status: 500, body: { error: 'Database error' } });
    assert.ok(!JSON.stringify(r).includes('secret'));
  });
});
