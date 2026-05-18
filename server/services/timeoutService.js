'use strict';

/**
 * timeoutService.js
 *
 * Cron: every minute.
 * Case 1 — 'assigned' leads past TIMEOUT_MINUTES → timeout + 1 reassignment attempt
 * Case 2 — 'accepted' leads past ACCEPTED_TTL_MINUTES → failed_contact + admin notify
 *
 * FOR UPDATE SKIP LOCKED prevents double-processing under concurrent cron ticks.
 * Max 1 reassignment attempt per lead per timeout event.
 */

const pool             = require('../../db/pool');
const { reassignLead } = require('./assignmentService');
const telegramService  = require('./telegramService');
const {
  TIMEOUT_MINUTES,
  ACCEPTED_TTL_MINUTES,
  ADMIN_CHAT_ID,
} = require('../../config/config');

const BATCH_SIZE = 20;

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
// Case 1: assigned → timeout → try 1 reassignment
// ---------------------------------------------------------------------------

async function processAssignedTimeouts() {
  const client = await pool.connect();
  let timedOutIds = [];

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id
       FROM   leads
       WHERE  status     = 'assigned'
         AND  updated_at < NOW() - ($1 || ' minutes')::INTERVAL
       ORDER BY updated_at ASC
       LIMIT  $2
       FOR UPDATE SKIP LOCKED`,
      [TIMEOUT_MINUTES, BATCH_SIZE]
    );

    timedOutIds = rows.map(r => r.id);

    if (!timedOutIds.length) {
      await client.query('ROLLBACK');
      return;
    }

    // Bulk-mark timeout — individual reassignment happens outside this tx
    await client.query(
      `UPDATE leads
       SET    status = 'timeout', updated_at = NOW()
       WHERE  id = ANY($1::int[])`,
      [timedOutIds]
    );

    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[timeoutService] processAssignedTimeouts:', err.message);
    return;
  } finally {
    client.release();
  }

  // One reassignment attempt per lead — failure is logged, not re-thrown
  for (const leadId of timedOutIds) {
    log('lead_timeout', leadId, null);
    try {
      await reassignLead(leadId, 'timeout');
    } catch (err) {
      console.error(`[timeoutService] reassignLead failed for lead ${leadId}:`, err.message);
      // No further attempts — lead stays in current status (unassigned or timeout)
    }
  }
}

// ---------------------------------------------------------------------------
// Case 2: accepted past TTL → failed_contact
// ---------------------------------------------------------------------------

async function processAcceptedTTL() {
  const client = await pool.connect();
  let expiredIds = [];

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id
       FROM   leads
       WHERE  status     = 'accepted'
         AND  updated_at < NOW() - ($1 || ' minutes')::INTERVAL
       ORDER BY updated_at ASC
       LIMIT  $2
       FOR UPDATE SKIP LOCKED`,
      [ACCEPTED_TTL_MINUTES, BATCH_SIZE]
    );

    expiredIds = rows.map(r => r.id);

    if (!expiredIds.length) {
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `UPDATE leads
       SET    status = 'failed_contact', updated_at = NOW()
       WHERE  id = ANY($1::int[])`,
      [expiredIds]
    );

    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[timeoutService] processAcceptedTTL:', err.message);
    return;
  } finally {
    client.release();
  }

  for (const leadId of expiredIds) {
    log('lead_timeout', leadId, null);
    telegramService
      .notifyAdmin(ADMIN_CHAT_ID, leadId, 'Accepted but no contact — marked failed_contact')
      .catch(err =>
        console.error(`[timeoutService] notifyAdmin failed for lead ${leadId}:`, err.message)
      );
  }
}

// ---------------------------------------------------------------------------
// handleLeadTimeout — single-lead timeout (callable on demand or by cron)
//
// Marks all pending (sent) assignments older than TIMEOUT_MINUTES as timeout.
// If nothing was accepted, moves lead to 'unassigned' and notifies admin.
// ---------------------------------------------------------------------------

async function handleLeadTimeout(leadId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: leadRows } = await client.query(
      `SELECT id, status FROM leads WHERE id = $1 FOR UPDATE`,
      [leadId]
    );

    if (!leadRows.length) {
      await client.query('ROLLBACK');
      return { result: 'not_found' };
    }

    const { status } = leadRows[0];

    if (!['assigned', 'new'].includes(status)) {
      await client.query('ROLLBACK');
      return { result: 'skipped', status };
    }

    // Mark stale pending assignments as timeout
    const { rowCount: timedOut } = await client.query(
      `UPDATE lead_assignments
       SET    status = 'timeout'
       WHERE  lead_id    = $1
         AND  status     = 'sent'
         AND  created_at < NOW() - ($2 || ' minutes')::INTERVAL`,
      [leadId, TIMEOUT_MINUTES]
    );

    // Check whether any worker already accepted
    const { rows: acceptedRows } = await client.query(
      `SELECT COUNT(*) AS count
       FROM   lead_assignments
       WHERE  lead_id = $1 AND status = 'accepted'`,
      [leadId]
    );
    const acceptedCount = parseInt(acceptedRows[0].count, 10);

    if (acceptedCount === 0) {
      await client.query(
        `UPDATE leads SET status = 'unassigned', updated_at = NOW() WHERE id = $1`,
        [leadId]
      );
      await client.query('COMMIT');

      log('lead_timeout', leadId, null);

      telegramService
        .notifyAdmin(ADMIN_CHAT_ID, leadId, 'Lead timed out — no worker responded')
        .catch(err => console.error('[timeoutService] notifyAdmin failed:', err.message));

      return { result: 'expired', timedOutCount: timedOut ?? 0 };
    }

    await client.query('COMMIT');
    return { result: 'accepted_exists', timedOutCount: timedOut ?? 0 };

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(`[handleLeadTimeout] lead ${leadId}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Start cron
// ---------------------------------------------------------------------------

function startTimeoutCron() {
  const cron = require('node-cron');

  cron.schedule('* * * * *', async () => {
    try {
      await processAssignedTimeouts();
      await processAcceptedTTL();
    } catch (err) {
      console.error('[timeoutService] cron tick error:', err.message);
    }
  });

  console.log('[timeoutService] Cron started (every minute)');
}

module.exports = { startTimeoutCron, handleLeadTimeout };
