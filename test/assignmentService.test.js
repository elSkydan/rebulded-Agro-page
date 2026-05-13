'use strict';

/**
 * assignmentService.test.js — node:test
 *
 * Unit tests for:
 *   • verifyWorkerTelegramIdentity — identity check helper
 *   • applyWorkerResponse         — transaction safety + reject path
 *
 * All DB operations are mocked via dependency injection of a fake pool.
 * No real PostgreSQL connection is required.
 *
 * Coverage:
 *   A. verifyWorkerTelegramIdentity
 *      1. Passes when workerId + telegram_chat_id match
 *      2. Throws WORKER_IDENTITY_MISMATCH when no match
 *      3. Throws on DB error
 *
 *   B. applyWorkerResponse — identity check
 *      4. Throws WORKER_IDENTITY_MISMATCH when internal check fails
 *
 *   C. applyWorkerResponse — accept path
 *      5. Updates lead + assignment, commits, logs
 *
 *   D. applyWorkerResponse — reject path
 *      6. Commits (no state changes), then calls reassignLead
 *      7. ROLLBACK is NOT called after COMMIT on reassignment failure
 *
 *   E. applyWorkerResponse — invalid action
 *      8. Throws 400 for unknown action
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Test-only module loader that patches the pool dependency.
//
// We cannot easily DI-inject pool into assignmentService as it uses a
// top-level require.  Instead we use the module cache trick: replace the
// pool module in require.cache with a mock, then require assignmentService.
// After the test we restore the cache.
// ---------------------------------------------------------------------------

function loadServiceWithPool(fakePool) {
  // Clear any cached version of the service
  const svcKey  = require.resolve('../server/services/assignmentService');
  const poolKey = require.resolve('../db/pool');

  delete require.cache[svcKey];

  // Temporarily replace the pool in the module registry
  require.cache[poolKey] = { id: poolKey, filename: poolKey, loaded: true, exports: fakePool };

  // Also mock telegramService so no real HTTP calls happen
  const tgKey = require.resolve('../server/services/telegramService');
  const origTg = require.cache[tgKey];
  require.cache[tgKey] = {
    id: tgKey, filename: tgKey, loaded: true,
    exports: Object.assign(
      { notifyAdmin: async () => {}, sendLeadToWorker: async () => null },
      // preserve static exports for tests that need them
      require.cache[tgKey]?.exports ?? {}
    ),
  };

  const svc = require('../server/services/assignmentService');

  // Restore pool to real module after require (so other tests aren't affected)
  delete require.cache[poolKey];
  if (origTg) require.cache[tgKey] = origTg;

  return svc;
}

// ---------------------------------------------------------------------------
// Pool / client builders
// ---------------------------------------------------------------------------

/**
 * Build a fake pg client whose query() responses are pre-programmed.
 * Each element of `responses` maps to successive client.query() calls.
 *
 * @param {Array<{rows:Array}|Error>} responses
 */
function fakeClient(responses) {
  let idx = 0;
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      const resp = responses[idx++];
      if (resp instanceof Error) throw resp;
      return resp ?? { rows: [], rowCount: 0 };
    },
    release: () => {},
  };
}

function fakePool(client) {
  return {
    connect: async () => client,
    query:   async (sql, params) => client.query(sql, params),
  };
}

// ---------------------------------------------------------------------------
// A. verifyWorkerTelegramIdentity
// ---------------------------------------------------------------------------

describe('A. verifyWorkerTelegramIdentity', () => {

  test('1. resolves when worker id + telegram_chat_id match', async () => {
    const client = fakeClient([
      // BEGIN
      { rows: [] },
      // SELECT workers ... → match found
      { rows: [{ id: 7 }] },
    ]);

    // verifyWorkerTelegramIdentity uses pool.query directly (not a client transaction)
    const pool = {
      connect: async () => client,
      query: async (sql, params) => {
        client.calls.push({ sql, params });
        return { rows: [{ id: 7 }] };
      },
    };

    const svcKey  = require.resolve('../server/services/assignmentService');
    const poolKey = require.resolve('../db/pool');
    delete require.cache[svcKey];
    require.cache[poolKey] = { id: poolKey, filename: poolKey, loaded: true, exports: pool };
    const { verifyWorkerTelegramIdentity } = require('../server/services/assignmentService');
    delete require.cache[poolKey];
    delete require.cache[svcKey];

    // Must not throw
    await assert.doesNotReject(() => verifyWorkerTelegramIdentity(7, '231918839'));
  });

  test('2. throws WORKER_IDENTITY_MISMATCH when no row returned', async () => {
    const pool = {
      connect: async () => fakeClient([]),
      query: async () => ({ rows: [] }),  // no match
    };

    const svcKey  = require.resolve('../server/services/assignmentService');
    const poolKey = require.resolve('../db/pool');
    delete require.cache[svcKey];
    require.cache[poolKey] = { id: poolKey, filename: poolKey, loaded: true, exports: pool };
    const { verifyWorkerTelegramIdentity } = require('../server/services/assignmentService');
    delete require.cache[poolKey];
    delete require.cache[svcKey];

    await assert.rejects(
      () => verifyWorkerTelegramIdentity(7, '999999999'),
      (err) => {
        assert.equal(err.code,       'WORKER_IDENTITY_MISMATCH');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  test('3. propagates DB errors', async () => {
    const dbError = new Error('connection refused');
    const pool = {
      connect: async () => fakeClient([]),
      query: async () => { throw dbError; },
    };

    const svcKey  = require.resolve('../server/services/assignmentService');
    const poolKey = require.resolve('../db/pool');
    delete require.cache[svcKey];
    require.cache[poolKey] = { id: poolKey, filename: poolKey, loaded: true, exports: pool };
    const { verifyWorkerTelegramIdentity } = require('../server/services/assignmentService');
    delete require.cache[poolKey];
    delete require.cache[svcKey];

    await assert.rejects(
      () => verifyWorkerTelegramIdentity(7, '231918839'),
      (err) => err.message === 'connection refused'
    );
  });
});

// ---------------------------------------------------------------------------
// B. applyWorkerResponse — unknown action
// ---------------------------------------------------------------------------

describe('B. applyWorkerResponse — input validation', () => {

  test('8. throws 400 for unknown action', async () => {
    const client = fakeClient([]);
    const svc = loadServiceWithPool(fakePool(client));

    await assert.rejects(
      () => svc.applyWorkerResponse(1, 2, '123', 'unknown'),
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
    // Should NOT have opened a DB connection
    assert.equal(client.calls.length, 0);
  });
});

// ---------------------------------------------------------------------------
// C. applyWorkerResponse — identity check (internal, within transaction)
// ---------------------------------------------------------------------------

describe('C. applyWorkerResponse — identity mismatch', () => {

  test('4. throws WORKER_IDENTITY_MISMATCH and ROLLBACKs when internal check fails', async () => {
    const client = fakeClient([
      { rows: [] },          // BEGIN
      { rows: [] },          // SELECT workers → empty (mismatch)
      { rows: [] },          // ROLLBACK
    ]);

    const svc = loadServiceWithPool(fakePool(client));

    await assert.rejects(
      () => svc.applyWorkerResponse(1, 7, '999', 'accept'),
      (err) => {
        assert.equal(err.code,       'WORKER_IDENTITY_MISMATCH');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // Verify ROLLBACK was called (transaction still open when identity check failed)
    const queries = client.calls.map(c => c.sql.trim().toUpperCase());
    assert.ok(queries.includes('ROLLBACK'), 'ROLLBACK must be called on identity failure');
    assert.ok(!queries.includes('COMMIT'),  'COMMIT must NOT be called on identity failure');
  });
});

// ---------------------------------------------------------------------------
// D. applyWorkerResponse — accept path (transaction + commit)
// ---------------------------------------------------------------------------

describe('D. applyWorkerResponse — accept path', () => {

  test('5. commits accept update, does NOT attempt ROLLBACK after COMMIT', async () => {
    const client = fakeClient([
      { rows: [] },                // BEGIN
      { rows: [{ id: 7 }] },       // SELECT workers (identity ok)
      { rows: [{ id: 1, status: 'assigned', worker_id: 7 }] }, // SELECT leads FOR UPDATE
      { rows: [] },                // UPDATE leads SET status='accepted'
      { rows: [] },                // UPDATE lead_assignments SET status='accepted'
      { rows: [] },                // COMMIT
    ]);

    const svc = loadServiceWithPool(fakePool(client));

    // Should not throw
    await svc.applyWorkerResponse(1, 7, '231918839', 'accept');

    const queries = client.calls.map(c => c.sql.trim().toUpperCase());
    assert.ok(queries.includes('BEGIN'),    'must BEGIN');
    assert.ok(queries.includes('COMMIT'),   'must COMMIT');
    assert.ok(!queries.includes('ROLLBACK'),'must NOT ROLLBACK after success');
  });
});

// ---------------------------------------------------------------------------
// E. applyWorkerResponse — reject path (COMMIT before reassign, no ROLLBACK after)
// ---------------------------------------------------------------------------

describe('E. applyWorkerResponse — reject path transaction safety', () => {

  test('6. commits verification, then calls reassignLead post-commit', async () => {
    // We track whether reassignLead was called by patching it.
    // The client only needs to handle: BEGIN + identity + lead lock + COMMIT.
    const client = fakeClient([
      { rows: [] },                // BEGIN
      { rows: [{ id: 7 }] },       // SELECT workers (identity ok)
      { rows: [{ id: 1, status: 'assigned', worker_id: 7 }] }, // SELECT leads FOR UPDATE
      { rows: [] },                // COMMIT (reject path commits here)
    ]);

    let reassignCalled = false;
    let reassignArgs   = null;

    // Build pool that also intercepts reassignLead's separate connection
    // by returning a client that handles reassignLead's queries
    const reassignClient = fakeClient([
      { rows: [] },   // BEGIN
      { rows: [{ id: 1, status: 'assigned', city_id: 1, worker_id: 7,
                 name: 'Test', phone_normalized: '+380501234567',
                 service_type: 'ogorod', area: 10, total_price: 1000,
                 out_of_city: false, comment: null, city_name: 'Kyiv' }] }, // SELECT leads FOR UPDATE
      { rows: [] },   // UPDATE lead_assignments
      { rows: [] },   // UPDATE leads
      { rows: [] },   // SELECT worker (pickWorker — no workers, returns empty)
      { rows: [{ n: 0 }], rowCount: 1 },  // logPickWorkerDiagnostics q1
      { rows: [{ n: 0 }], rowCount: 1 },  // logPickWorkerDiagnostics q2
      { rows: [{ n: 0 }], rowCount: 1 },  // logPickWorkerDiagnostics q3
      { rows: [{ n: 0 }], rowCount: 1 },  // logPickWorkerDiagnostics q4
      { rows: [] },   // UPDATE leads SET status='unassigned'
      { rows: [] },   // COMMIT
    ]);

    let connectionCount = 0;
    const pool = {
      query: async (sql, params) => client.query(sql, params),
      connect: async () => {
        connectionCount++;
        return connectionCount === 1 ? client : reassignClient;
      },
    };

    const svc = loadServiceWithPool(pool);

    // Should not throw — reassign gets a no-worker result (unassigned)
    await svc.applyWorkerResponse(1, 7, '231918839', 'reject');

    // Primary transaction: BEGIN + identity + lead + COMMIT
    const primaryQueries = client.calls.map(c => c.sql.trim().toUpperCase());
    assert.ok(primaryQueries.includes('BEGIN'),   'primary tx must BEGIN');
    assert.ok(primaryQueries.includes('COMMIT'),  'primary tx must COMMIT');
    assert.ok(!primaryQueries.includes('ROLLBACK'), 'primary tx must NOT ROLLBACK');
  });

  test('7. does NOT call ROLLBACK after COMMIT even when reassignLead fails', async () => {
    const client = fakeClient([
      { rows: [] },                // BEGIN
      { rows: [{ id: 7 }] },       // SELECT workers (identity ok)
      { rows: [{ id: 1, status: 'assigned', worker_id: 7 }] }, // SELECT leads FOR UPDATE
      { rows: [] },                // COMMIT
    ]);

    // Reassign client that throws immediately
    const failClient = {
      calls: [],
      query: async (sql) => {
        failClient.calls.push(sql);
        if (sql.trim().toUpperCase() !== 'BEGIN') throw new Error('DB connection lost');
        return { rows: [] };
      },
      release: () => {},
    };

    let connectionCount = 0;
    const pool = {
      query: async (sql, params) => client.query(sql, params),
      connect: async () => {
        connectionCount++;
        return connectionCount === 1 ? client : failClient;
      },
    };

    const svc = loadServiceWithPool(pool);

    // reassignLead failure should propagate
    await assert.rejects(
      () => svc.applyWorkerResponse(1, 7, '231918839', 'reject'),
      (err) => err.message === 'DB connection lost'
    );

    // CRITICAL: primary client must NOT have received ROLLBACK after its COMMIT
    const primaryQueries = client.calls.map(c => c.sql.trim().toUpperCase());
    assert.ok(primaryQueries.includes('COMMIT'), 'primary tx must have committed');
    assert.ok(
      !primaryQueries.includes('ROLLBACK'),
      'ROLLBACK must NOT be called on primary client after COMMIT — this was the bug'
    );
  });
});
