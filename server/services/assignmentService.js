'use strict';

/**
 * assignmentService.js
 *
 * EXECUTION ORDER (enforced, never deviate):
 *   1. BEGIN transaction
 *   2. INSERT or fetch lead  (done in controller before calling assignLead)
 *   3. SELECT lead FOR UPDATE
 *   4. Check lead.status === 'new'
 *   5. SELECT worker
 *   6. INSERT lead_assignments
 *   7. UPDATE lead.status
 *   8. COMMIT
 *   9. AFTER COMMIT → telegramService
 *
 * Telegram is NEVER called inside a transaction.
 * telegramService failure does NOT affect DB state.
 */

const pool            = require('../../db/pool');
const telegramService = require('./telegramService');
const { ACTIVE_LEAD_LIMIT, ADMIN_CHAT_ID } = require('../../config/config');

// ---------------------------------------------------------------------------
// Structured logger — never throws
// ---------------------------------------------------------------------------

function log(event, leadId, workerId = null) {
  try {
    console.log(JSON.stringify({
      event,
      leadId,
      workerId,
      timestamp: new Date().toISOString(),
    }));
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS = {
  new:            ['assigned', 'unassigned'],
  assigned:       ['accepted', 'rejected', 'timeout', 'unassigned', 'canceled'],
  rejected:       ['assigned', 'unassigned'],
  timeout:        ['assigned', 'unassigned'],
  accepted:       ['completed', 'failed_contact', 'canceled'],
  completed:      ['canceled'],
  unassigned:     ['assigned', 'canceled'],
  failed_contact: ['canceled'],
  canceled:       [],
};

function assertTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    console.error(JSON.stringify({
      event: 'invalid_transition',
      from, to,
      timestamp: new Date().toISOString(),
    }));
    const err = new Error(`Invalid lead status transition: "${from}" -> "${to}"`);
    err.code       = 'INVALID_TRANSITION';
    err.statusCode = 409;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// pickWorker — INSIDE an open transaction (never lock workers table)
//
// Locking strategy (per spec):
//   1. Lead row locked first (caller's responsibility, done before pickWorker)
//   2. Worker selected by query — NOT locked (spec: NEVER lock worker table)
// ---------------------------------------------------------------------------

async function pickWorker(client, leadId, cityId) {
  const { rows } = await client.query(
    `SELECT w.id, w.name, w.telegram_chat_id
     FROM   workers w
     WHERE  w.city_id   = $1
       AND  w.is_active = TRUE
       AND  NOT EXISTS (
              SELECT 1
              FROM   lead_assignments la
              WHERE  la.lead_id  = $2
                AND  la.worker_id = w.id
            )
       AND  (
              SELECT COUNT(*)
              FROM   leads l
              WHERE  l.worker_id = w.id
                AND  l.status IN ('assigned', 'accepted')
            ) < $3
     ORDER BY
       w.priority         DESC,
       w.last_assigned_at ASC NULLS FIRST
     LIMIT 1`,
    [cityId, leadId, ACTIVE_LEAD_LIMIT]
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// logPickWorkerDiagnostics — called only when pickWorker returns null
//
// Runs supplementary diagnostic queries on the SAME transaction client to
// explain WHY no worker was selected.  Must be called before COMMIT so the
// FOR UPDATE lock on the lead is still held.
//
// Does NOT throw — diagnostic failure must never affect the main flow.
// ---------------------------------------------------------------------------

async function logPickWorkerDiagnostics(client, leadId, cityId) {
  try {
    const [totalRes, activeRes, underLimitRes, notTriedRes] = await Promise.all([
      // All workers registered in this city (any status)
      client.query(
        `SELECT COUNT(*) AS n FROM workers WHERE city_id = $1`,
        [cityId]
      ),
      // Active workers in city
      client.query(
        `SELECT COUNT(*) AS n FROM workers WHERE city_id = $1 AND is_active = TRUE`,
        [cityId]
      ),
      // Active workers in city that are under the active-lead limit
      client.query(
        `SELECT COUNT(*) AS n
         FROM   workers w
         WHERE  w.city_id   = $1
           AND  w.is_active = TRUE
           AND  (SELECT COUNT(*)
                 FROM   leads l
                 WHERE  l.worker_id = w.id
                   AND  l.status IN ('assigned', 'accepted')
                ) < $2`,
        [cityId, ACTIVE_LEAD_LIMIT]
      ),
      // Active workers in city that have NOT been tried for this lead yet
      client.query(
        `SELECT COUNT(*) AS n
         FROM   workers w
         WHERE  w.city_id   = $1
           AND  w.is_active = TRUE
           AND  NOT EXISTS (
                  SELECT 1 FROM lead_assignments la
                  WHERE  la.lead_id   = $2
                    AND  la.worker_id = w.id
                )`,
        [cityId, leadId]
      ),
    ]);

    const workersInCity      = parseInt(totalRes.rows[0].n,       10);
    const workersActive      = parseInt(activeRes.rows[0].n,      10);
    const workersUnderLimit  = parseInt(underLimitRes.rows[0].n,  10);
    const workersNotTried    = parseInt(notTriedRes.rows[0].n,    10);

    console.log(JSON.stringify({
      event:               'pick_worker_failed',
      leadId,
      cityId,
      ACTIVE_LEAD_LIMIT,
      workersInCity,
      workersActive,
      workersUnderLimit,
      workersNotTried,
      filteredInactive:    workersInCity  - workersActive,
      filteredOverloaded:  workersActive  - workersUnderLimit,
      filteredAlreadyTried: workersActive - workersNotTried,
      timestamp:           new Date().toISOString(),
    }));
  } catch (diagErr) {
    // Diagnostic failure must never propagate
    console.error('[pickWorker] diagnostic query failed:', diagErr.message);
  }
}

// ---------------------------------------------------------------------------
// assignLead — main entry point
// Returns { assigned, status, worker: {id, name} | null }
// ---------------------------------------------------------------------------

async function assignLead(leadId, cityId) {
  const client = await pool.connect();
  try {
    // STEP 1: BEGIN
    await client.query('BEGIN');

    // STEP 3: SELECT lead FOR UPDATE  (lead was inserted by controller — step 2)
    // Join cities so we have city_name ready for the Telegram message (no extra query).
    // FOR UPDATE OF l locks only the leads row; cities is read-only here.
    const { rows: leadRows } = await client.query(
      `SELECT l.id, l.status, l.name, l.phone_normalized,
              l.service_type, l.area, l.total_price,
              l.city_id, l.out_of_city, l.comment,
              c.name AS city_name
       FROM   leads l
       LEFT JOIN cities c ON c.id = l.city_id
       WHERE  l.id = $1
       FOR UPDATE OF l`,
      [leadId]
    );

    if (!leadRows.length) {
      await client.query('ROLLBACK');
      const err = new Error(`Lead ${leadId} not found`);
      err.statusCode = 404;
      throw err;
    }

    // STEP 4: check status === 'new'
    if (leadRows[0].status !== 'new') {
      await client.query('ROLLBACK');
      // Idempotent — already processed, not an error
      return { assigned: false, workerId: null, worker: null, status: leadRows[0].status };
    }

    // STEP 5: select worker
    const worker = await pickWorker(client, leadId, cityId);

    if (!worker) {
      // Log WHY no worker was found before committing the transaction
      await logPickWorkerDiagnostics(client, leadId, cityId);

      // STEP 6 (no worker path): update lead → unassigned
      await client.query(
        `UPDATE leads SET status = 'unassigned', updated_at = NOW() WHERE id = $1`,
        [leadId]
      );
      // STEP 8: COMMIT
      await client.query('COMMIT');

      log('lead_rejected', leadId, null);

      // STEP 9: Telegram after commit
      telegramService
        .notifyAdmin(ADMIN_CHAT_ID, leadId, 'No workers available')
        .catch(err => console.error('[telegram] notifyAdmin failed:', err.message));

      return { assigned: false, workerId: null, worker: null, status: 'unassigned' };
    }

    // STEP 6: INSERT lead_assignments
    await client.query(
      `INSERT INTO lead_assignments (lead_id, worker_id, status) VALUES ($1, $2, 'sent')`,
      [leadId, worker.id]
    );

    // STEP 7: UPDATE lead.status
    await client.query(
      `UPDATE leads
       SET    status     = 'assigned',
              worker_id  = $1,
              updated_at = NOW()
       WHERE  id = $2`,
      [worker.id, leadId]
    );

    await client.query(
      `UPDATE workers SET last_assigned_at = NOW() WHERE id = $1`,
      [worker.id]
    );

    // STEP 8: COMMIT
    await client.query('COMMIT');

    // Structured log after commit
    console.log('Assigned lead', leadId, 'to worker', worker.id);
    log('lead_assigned', leadId, worker.id);

    // STEP 9: Telegram after commit — failure never affects DB.
    // Pass the full lead object so the worker sees all client/job details.
    // Capture the returned message_id and persist it so editMessageText()
    // can later update the worker's message on accept/reject/timeout.
    const leadData = leadRows[0];
    telegramService
      .sendLeadToWorker(worker.telegram_chat_id, leadId, worker.id, leadData)
      .then(messageId => {
        if (messageId) {
          pool.query(
            `UPDATE lead_assignments SET message_id = $1
             WHERE  lead_id = $2 AND worker_id = $3`,
            [messageId, leadId, worker.id]
          ).catch(err =>
            console.error(`[telegram] persist message_id failed (lead ${leadId}):`, err.message)
          );
        }
      })
      .catch(err => console.error(`[telegram] sendLeadToWorker failed (lead ${leadId}):`, err.message));

    return {
      assigned: true,
      workerId: worker.id,
      worker:   { id: worker.id, name: worker.name },
      status:   'assigned',
    };

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(`[assignLead] lead ${leadId}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// reassignLead — after rejection or timeout (max 1 attempt from timeoutService)
// ---------------------------------------------------------------------------

async function reassignLead(leadId, reason) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: leadRows } = await client.query(
      `SELECT l.id, l.status, l.city_id, l.worker_id,
              l.name, l.phone_normalized,
              l.service_type, l.area, l.total_price,
              l.out_of_city, l.comment,
              c.name AS city_name
       FROM   leads l
       LEFT JOIN cities c ON c.id = l.city_id
       WHERE  l.id = $1
       FOR UPDATE OF l`,
      [leadId]
    );

    if (!leadRows.length) {
      await client.query('ROLLBACK');
      const err = new Error(`Lead ${leadId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const lead = leadRows[0];

    // timeoutService may bulk-set lead to 'timeout' before calling reassignLead; in that case
    // assertTransition('timeout','timeout') would fail — only sync assignment rows and continue.
    if (lead.status === reason && reason === 'timeout') {
      if (lead.worker_id !== null) {
        // Single-worker flow: mark the specific worker's assignment
        await client.query(
          `UPDATE lead_assignments
           SET    status = $1
           WHERE  lead_id   = $2 AND worker_id = $3 AND status = 'sent'`,
          [reason, leadId, lead.worker_id]
        );
      } else {
        // Multi-worker distribution (worker_id = NULL): mark ALL pending assignments
        await client.query(
          `UPDATE lead_assignments SET status = 'timeout'
           WHERE  lead_id = $1 AND status = 'sent'`,
          [leadId]
        );
      }
    } else {
      assertTransition(lead.status, reason);
      if (lead.worker_id !== null) {
        await client.query(
          `UPDATE lead_assignments
           SET    status = $1
           WHERE  lead_id   = $2 AND worker_id = $3 AND status = 'sent'`,
          [reason, leadId, lead.worker_id]
        );
      } else {
        await client.query(
          `UPDATE lead_assignments SET status = 'timeout'
           WHERE  lead_id = $1 AND status = 'sent'`,
          [leadId]
        );
      }
      await client.query(
        `UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2`,
        [reason, leadId]
      );
    }

    const worker = await pickWorker(client, leadId, lead.city_id);

    if (!worker) {
      await logPickWorkerDiagnostics(client, leadId, lead.city_id);

      await client.query(
        `UPDATE leads SET status = 'unassigned', updated_at = NOW() WHERE id = $1`,
        [leadId]
      );
      await client.query('COMMIT');

      log('lead_timeout', leadId, null);

      telegramService
        .notifyAdmin(ADMIN_CHAT_ID, leadId, `Unassigned after ${reason}`)
        .catch(err => console.error('[telegram] notifyAdmin failed:', err.message));

      return { assigned: false, workerId: null, worker: null, status: 'unassigned' };
    }

    assertTransition(reason, 'assigned');

    await client.query(
      `INSERT INTO lead_assignments (lead_id, worker_id, status) VALUES ($1, $2, 'sent')`,
      [leadId, worker.id]
    );

    await client.query(
      `UPDATE leads
       SET    status              = 'assigned',
              worker_id           = $1,
              last_sent_worker_id = $1,
              updated_at          = NOW()
       WHERE  id = $2`,
      [worker.id, leadId]
    );

    await client.query(
      `UPDATE workers SET last_assigned_at = NOW() WHERE id = $1`,
      [worker.id]
    );

    await client.query('COMMIT');

    log('lead_assigned', leadId, worker.id);

    const leadData = leadRows[0];
    telegramService
      .sendLeadToWorker(worker.telegram_chat_id, leadId, worker.id, leadData)
      .then(messageId => {
        if (messageId) {
          pool.query(
            `UPDATE lead_assignments SET message_id = $1
             WHERE  lead_id = $2 AND worker_id = $3`,
            [messageId, leadId, worker.id]
          ).catch(err =>
            console.error(`[telegram] persist message_id failed (lead ${leadId}):`, err.message)
          );
        }
      })
      .catch(err => console.error(`[telegram] sendLeadToWorker failed (lead ${leadId}):`, err.message));

    return {
      assigned: true,
      workerId: worker.id,
      worker:   { id: worker.id, name: worker.name },
      status:   'assigned',
    };

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(`[reassignLead] lead ${leadId} (${reason}):`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// applyWorkerResponse — Telegram inline button: accept / reject
// ---------------------------------------------------------------------------

async function applyWorkerResponse(leadId, workerId, telegramChatId, action) {
  if (action !== 'accept' && action !== 'reject') {
    const err = new Error(`Unknown action: "${action}"`);
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: workerRows } = await client.query(
      `SELECT id FROM workers WHERE id = $1 AND telegram_chat_id = $2`,
      [workerId, telegramChatId]
    );
    if (!workerRows.length) {
      await client.query('ROLLBACK');
      const err = new Error('Worker identity mismatch');
      err.statusCode = 403;
      throw err;
    }

    const { rows: leadRows } = await client.query(
      `SELECT id, status, worker_id FROM leads WHERE id = $1 FOR UPDATE`,
      [leadId]
    );
    if (!leadRows.length) {
      await client.query('ROLLBACK');
      const err = new Error(`Lead ${leadId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const lead = leadRows[0];

    if (lead.status !== 'assigned') {
      await client.query('ROLLBACK');
      console.error(`[applyWorkerResponse] lead ${leadId} status="${lead.status}", expected "assigned"`);
      const err = new Error(`Lead is not in "assigned" state (current: "${lead.status}")`);
      err.statusCode = 409;
      err.code = 'INVALID_TRANSITION';
      throw err;
    }

    if (lead.worker_id !== workerId) {
      await client.query('ROLLBACK');
      console.error(`[applyWorkerResponse] lead ${leadId} worker mismatch: assigned=${lead.worker_id}, caller=${workerId}`);
      const err = new Error('This lead is no longer assigned to you');
      err.statusCode = 409;
      throw err;
    }

    if (action === 'accept') {
      assertTransition(lead.status, 'accepted');
      await client.query(
        `UPDATE leads SET status = 'accepted', updated_at = NOW() WHERE id = $1`, [leadId]
      );
      await client.query(
        `UPDATE lead_assignments SET status = 'accepted'
         WHERE lead_id = $1 AND worker_id = $2 AND status = 'sent'`,
        [leadId, workerId]
      );
      await client.query('COMMIT');
      log('lead_assigned', leadId, workerId); // accepted = still same worker

    } else {
      await client.query('COMMIT');
      log('lead_rejected', leadId, workerId);
      await reassignLead(leadId, 'rejected');
    }

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(`[applyWorkerResponse] lead ${leadId} action="${action}":`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// acceptLead — multi-worker distribution: atomic first-come-first-served
//
// Idempotent:
//   • Same worker calls twice  → { result: 'success', alreadyAccepted: true }
//   • Different worker calls   → { result: 'already_taken' }
//   • No pending assignment    → { result: 'already_taken' }
// ---------------------------------------------------------------------------

async function acceptLead(workerId, leadId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: workerRows } = await client.query(
      `SELECT id FROM workers WHERE id = $1`,
      [workerId]
    );
    if (!workerRows.length) {
      await client.query('ROLLBACK');
      const err = new Error(`Worker ${workerId} not found`);
      err.statusCode = 404;
      throw err;
    }

    // Lock lead — prevents two concurrent accepts from both winning
    const { rows: leadRows } = await client.query(
      `SELECT id, status, worker_id FROM leads WHERE id = $1 FOR UPDATE`,
      [leadId]
    );
    if (!leadRows.length) {
      await client.query('ROLLBACK');
      const err = new Error(`Lead ${leadId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const lead = leadRows[0];

    // Idempotency: this worker already won
    if (lead.worker_id === workerId && lead.status === 'accepted') {
      await client.query('ROLLBACK');
      return { result: 'success', alreadyAccepted: true };
    }

    // Another worker already won
    if (lead.worker_id !== null && lead.worker_id !== workerId) {
      await client.query('ROLLBACK');
      return { result: 'already_taken' };
    }

    if (lead.status !== 'assigned') {
      await client.query('ROLLBACK');
      const err = new Error(`Lead ${leadId} is not available (status: "${lead.status}")`);
      err.statusCode = 409;
      err.code = 'INVALID_TRANSITION';
      throw err;
    }

    // Verify this worker has a pending (sent) assignment
    const { rows: assignRows } = await client.query(
      `SELECT id FROM lead_assignments
       WHERE lead_id = $1 AND worker_id = $2 AND status = 'sent'`,
      [leadId, workerId]
    );
    if (!assignRows.length) {
      await client.query('ROLLBACK');
      // Assignment was already resolved (timed out or rejected by another path)
      return { result: 'already_taken' };
    }

    // Mark this assignment accepted
    await client.query(
      `UPDATE lead_assignments
       SET    status = 'accepted', responded_at = NOW()
       WHERE  lead_id = $1 AND worker_id = $2`,
      [leadId, workerId]
    );

    // Reject all competing pending assignments; return their data for message editing
    const { rows: rejectedRows } = await client.query(
      `UPDATE lead_assignments
       SET    status = 'rejected', responded_at = NOW()
       FROM   workers
       WHERE  lead_assignments.lead_id    = $1
         AND  lead_assignments.worker_id != $2
         AND  lead_assignments.status     = 'sent'
         AND  workers.id = lead_assignments.worker_id
       RETURNING
         lead_assignments.worker_id,
         lead_assignments.message_id,
         workers.telegram_chat_id`,
      [leadId, workerId]
    );

    // Award lead to this worker
    await client.query(
      `UPDATE leads
       SET    status    = 'accepted',
              worker_id = $1,
              updated_at = NOW()
       WHERE  id = $2`,
      [workerId, leadId]
    );

    await client.query(
      `UPDATE workers SET last_assigned_at = NOW() WHERE id = $1`,
      [workerId]
    );

    await client.query('COMMIT');

    log('lead_accepted', leadId, workerId);

    return { result: 'success', rejectedWorkers: rejectedRows };

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}

    // PG error 23505 = unique_violation.
    // uq_la_lead_accepted fires when two workers accept concurrently;
    // the second transaction loses the race.  Return a clean business
    // response instead of letting a 500 reach the webhook handler.
    if (err.code === '23505') {
      log('accept_lead_race_lost', leadId, workerId);
      return { result: 'already_taken' };
    }

    console.error(`[acceptLead] lead ${leadId} worker ${workerId}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// rejectLead — multi-worker distribution: one worker declines
//
// If this is the last pending assignment and none were accepted,
// the lead is automatically moved to 'unassigned' and admin is notified.
// ---------------------------------------------------------------------------

async function rejectLead(workerId, leadId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rowCount } = await client.query(
      `UPDATE lead_assignments
       SET    status = 'rejected', responded_at = NOW()
       WHERE  lead_id   = $1
         AND  worker_id = $2
         AND  status    = 'sent'`,
      [leadId, workerId]
    );

    if (!rowCount) {
      await client.query('ROLLBACK');
      // Idempotent: already rejected or assignment not found
      return { result: 'no_op' };
    }

    // Check remaining pending assignments
    const { rows: pendingRows } = await client.query(
      `SELECT COUNT(*) AS count
       FROM   lead_assignments
       WHERE  lead_id = $1 AND status = 'sent'`,
      [leadId]
    );
    const pendingCount = parseInt(pendingRows[0].count, 10);

    // Check if already accepted by another worker
    const { rows: acceptedRows } = await client.query(
      `SELECT COUNT(*) AS count
       FROM   lead_assignments
       WHERE  lead_id = $1 AND status = 'accepted'`,
      [leadId]
    );
    const acceptedCount = parseInt(acceptedRows[0].count, 10);

    // All workers have responded and none accepted — mark lead unassigned
    // inside the SAME transaction so lead_assignments + leads are always
    // consistent (previously this used pool.query after COMMIT — bug fix P5).
    let allRejected = false;
    if (pendingCount === 0 && acceptedCount === 0) {
      await client.query(
        `UPDATE leads SET status = 'unassigned', updated_at = NOW() WHERE id = $1`,
        [leadId]
      );
      allRejected = true;
    }

    await client.query('COMMIT');

    log('lead_rejected', leadId, workerId);

    if (allRejected) {
      telegramService
        .notifyAdmin(ADMIN_CHAT_ID, leadId, 'All workers rejected — lead unassigned')
        .catch(err => console.error('[rejectLead] notifyAdmin failed:', err.message));
      return { result: 'unassigned' };
    }

    return { result: 'rejected', pendingCount };

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(`[rejectLead] lead ${leadId} worker ${workerId}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { assignLead, reassignLead, applyWorkerResponse, acceptLead, rejectLead };
