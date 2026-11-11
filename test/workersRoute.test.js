'use strict';

/**
 * workersRoute.test.js — node:test
 *
 * Mounts the real /api/workers router on an ephemeral port with db/pool and
 * config replaced via require.cache, so no database is needed.
 */

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');

const TOKEN = 'test-admin-token-0123456789abcdef0123';

// ── Stubs ────────────────────────────────────────────────────────────────────
const queries = [];
let nextResult = { rows: [] };

function stub(relPath, exportsValue) {
  const file = require.resolve(path.join('..', relPath));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: exportsValue };
}

stub('db/pool', {
  query: async (sql, params) => {
    queries.push({ sql, params });
    if (nextResult instanceof Error) throw nextResult;
    return nextResult;
  },
});
stub('config/config', { ADMIN_TOKEN: TOKEN });

const workersRoute = require('../server/routes/workers');

// ── Server ───────────────────────────────────────────────────────────────────
let server;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/workers', workersRoute);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api/workers`;
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  queries.length = 0;
  nextResult = { rows: [] };
});

const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const pgErr = (code) => Object.assign(new Error('boom'), { code });
const validBody = { name: 'Іван', city_id: 1, telegram_chat_id: '197656058' };

describe('/api/workers', () => {
  test('rejects requests without a token', async () => {
    const res = await fetch(base);
    assert.equal(res.status, 401);
    assert.equal(queries.length, 0);
  });

  test('GET returns every column the admin UI needs', async () => {
    nextResult = { rows: [{ id: 1 }] };
    const res = await fetch(base, { headers: auth });
    assert.equal(res.status, 200);
    const sql = queries[0].sql;
    for (const col of [
      'w.phone',
      'w.telegram_chat_id',
      'w.equipment_type',
      'w.last_assigned_at',
      'w.created_at',
      'c.name AS city_name',
    ]) {
      assert.ok(sql.includes(col), `SELECT should include ${col}`);
    }
  });

  test('POST with a duplicate telegram_chat_id → 409', async () => {
    nextResult = pgErr('23505');
    const res = await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(validBody) });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, 'DUPLICATE');
  });

  test('POST with an unknown city → 400', async () => {
    nextResult = pgErr('23503');
    const res = await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(validBody) });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, 'CITY_NOT_FOUND');
  });

  test('PATCH with a duplicate telegram_chat_id → 409', async () => {
    nextResult = pgErr('23505');
    const res = await fetch(`${base}/1`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ telegram_chat_id: '42' }),
    });
    assert.equal(res.status, 409);
  });

  test('POST trims the name and rejects a blank one', async () => {
    const res = await fetch(base, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ ...validBody, name: '   ' }),
    });
    assert.equal(res.status, 400);
    assert.equal(queries.length, 0);
  });
});
