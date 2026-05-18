'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { respondLeadDbError } = require('../server/utils/pgLeadError.js');

test('service_type_enum mismatch → 503 SCHEMA_ENUM_MISMATCH', () => {
  const calls = [];
  const res = {
    status(n) {
      calls.push(['status', n]);
      return this;
    },
    json(body) {
      calls.push(['json', body]);
      return this;
    },
  };
  const err = Object.assign(new Error('invalid input value for enum service_type_enum'), {
    code: '22P02',
    message: 'invalid input value for enum service_type_enum: "mowing"',
  });
  respondLeadDbError(res, err, 'test');
  assert.strictEqual(calls[0][1], 503);
  assert.strictEqual(calls[1][1].code, 'SCHEMA_ENUM_MISMATCH');
});

test('unknown PG error → 500 Database error', () => {
  const calls = [];
  const res = {
    status(n) {
      calls.push(['status', n]);
      return this;
    },
    json(body) {
      calls.push(['json', body]);
      return this;
    },
  };
  respondLeadDbError(res, { code: 'XX000', message: 'boom' }, 'test');
  assert.strictEqual(calls[0][1], 500);
  assert.strictEqual(calls[1][1].error, 'Database error');
});
