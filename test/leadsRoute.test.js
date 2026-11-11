'use strict';

/**
 * leadsRoute.test.js — node:test
 *
 * Admin side of /api/leads (list, stats, cancel) on a real Express router with
 * db/pool, config and the assignment service stubbed via require.cache.
 */

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');

const TOKEN = 'test-admin-token-0123456789abcdef0123';

// ── Stubs ────────────────────────────────────────────────────────────────────
const queries = [];
/** Results returned by successive pool.query calls (FIFO). */
let results = [];

function stub(relPath, exportsValue) {
  const file = require.resolve(path.join('..', relPath));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: exportsValue };
}

stub('db/pool', {
  query: async (sql, params) => {
    queries.push({ sql, params });
    const next = results.length ? results.shift() : { rows: [] };
    if (next instanceof Error) throw next;
    return next;
  },
});
stub('config/config', { ...require('../config/config'), ADMIN_TOKEN: TOKEN });
const assignmentStub = {
  assignLead: async () => ({ assigned: false }),
  assignLeadToWorker: async () => ({
    lead_id: 5,
    status: 'assigned',
    worker_id: 2,
    worker_name: 'Іван',
  }),
};
stub('server/services/assignmentService', assignmentStub);

const leadsRoute = require('../server/routes/leads');

// ── Server ───────────────────────────────────────────────────────────────────
let server;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/leads', leadsRoute);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api/leads`;
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  queries.length = 0;
  results = [];
});

const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

describe('GET /api/leads', () => {
  test('rejects an unknown status without querying the database', async () => {
    const res = await fetch(`${base}?status=bogus`, { headers: auth });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, 'INVALID_STATUS');
    assert.equal(queries.length, 0);
  });

  test('filters by a valid status and returns the columns the admin list needs', async () => {
    results = [{ rows: [{ count: '1' }] }, { rows: [{ id: 41 }] }];
    const res = await fetch(`${base}?status=unassigned&limit=20&offset=40`, { headers: auth });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { total: 1, limit: 20, offset: 40, data: [{ id: 41 }] });

    const listSql = queries[1].sql;
    for (const col of ['c.name AS city_name', 'l.out_of_city', 'l.comment', 'l.phone_raw']) {
      assert.ok(listSql.includes(col), `list should select ${col}`);
    }
    assert.match(listSql, /WHEN l\.status IN \('unassigned', 'new', 'canceled'\) THEN NULL/i);
    assert.deepEqual(queries[1].params, ['unassigned', 20, 40]);
  });
});

describe('GET /api/leads/debug/stats', () => {
  test('returns unassigned and today counts alongside the existing ones', async () => {
    results = [
      { rows: [{ total_leads: '37', active_workers: '3', pending_leads: '2', unassigned_leads: '1', today_leads: '4' }] },
    ];
    const res = await fetch(`${base}/debug/stats`, { headers: auth });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      total_leads: 37,
      active_workers: 3,
      pending_leads: 2,
      unassigned_leads: 1,
      today_leads: 4,
    });
    // 'Europe/Kiev' is understood by every tzdata version; 'Europe/Kyiv' only by 2022b+.
    assert.match(queries[0].sql, /Europe\/Kiev/);
  });
});

describe('PATCH /api/leads/:id/cancel', () => {
  test('cancels with a single conditional UPDATE', async () => {
    results = [{ rows: [{ id: 5, status: 'canceled' }] }];
    const res = await fetch(`${base}/5/cancel`, { method: 'PATCH', headers: auth });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { lead_id: 5, status: 'canceled' });
    assert.equal(queries.length, 1);
    assert.match(queries[0].sql, /UPDATE leads[\s\S]*WHERE[\s\S]*status = ANY/);
  });

  test('400 INVALID_TRANSITION when the lead has already moved on', async () => {
    results = [{ rows: [] }, { rows: [{ status: 'accepted' }] }];
    const res = await fetch(`${base}/5/cancel`, { method: 'PATCH', headers: auth });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, 'INVALID_TRANSITION');
  });

  test('404 for a missing lead', async () => {
    results = [{ rows: [] }, { rows: [] }];
    const res = await fetch(`${base}/999/cancel`, { method: 'PATCH', headers: auth });
    assert.equal(res.status, 404);
  });
});

describe('POST /api/leads/:id/assign', () => {
  test('requires auth', async () => {
    const res = await fetch(`${base}/5/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: 2 }),
    });
    assert.equal(res.status, 401);
  });

  test('400 INVALID_INPUT when worker_id is missing', async () => {
    const res = await fetch(`${base}/5/assign`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, 'INVALID_INPUT');
  });

  test('delegates to assignLeadToWorker and returns its payload', async () => {
    const res = await fetch(`${base}/5/assign`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ worker_id: 2 }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      lead_id: 5,
      status: 'assigned',
      worker_id: 2,
      worker_name: 'Іван',
    });
  });

  test('maps service statusCode / code onto the HTTP response', async () => {
    const err = new Error('Worker is inactive');
    err.statusCode = 400;
    err.code = 'INVALID_WORKER';
    assignmentStub.assignLeadToWorker = async () => { throw err; };

    const res = await fetch(`${base}/5/assign`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ worker_id: 9 }),
    });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'Worker is inactive', code: 'INVALID_WORKER' });

    assignmentStub.assignLeadToWorker = async () => ({
      lead_id: 5,
      status: 'assigned',
      worker_id: 2,
      worker_name: 'Іван',
    });
  });
});
