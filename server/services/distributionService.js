'use strict';

/**
 * distributionService.js
 *
 * Fan-out lead distribution: sends one lead to up to BATCH_SIZE workers
 * simultaneously.  The first worker to accept wins; all others are rejected.
 *
 * Contract
 * --------
 * • Idempotent: calling distributeLead twice for the same lead is a no-op.
 * • Telegram failures never break DB state (all sends run after DB commit).
 * • Backward-compatible: existing assignLead (single-worker) flow is unaffected.
 *
 * After distribution the lead moves to status='assigned' with worker_id=NULL.
 * The partial unique index uq_la_lead_accepted prevents double-acceptance.
 *
 * ── ACTIVATION STATUS ────────────────────────────────────────────────────────
 * STATUS: INTENTIONALLY INACTIVE — NOT wired into any route.
 *
 * The active lead submission path (POST /api/leads → routes/leads.js) uses
 * assignmentService.assignLead() which assigns exactly one worker at a time.
 *
 * distributeLead() is a completed implementation of a parallel fan-out flow
 * (up to DISTRIBUTION_BATCH_SIZE workers notified simultaneously; first to
 * accept wins).  It was developed alongside the single-worker flow but has
 * not been activated.
 *
 * To activate: import distributeLead from this file in routes/leads.js and
 * call it instead of / in addition to assignLead().  The acceptLead /
 * rejectLead functions in assignmentService already handle the multi-worker
 * race (partial unique index uq_la_lead_accepted + RETURNING clause).
 *
 * Do NOT delete this file. Do NOT wire it in without a deliberate decision.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool               = require('../../db/pool');
const telegramService    = require('./telegramService');
const leadAssignmentRepo = require('../repositories/leadAssignmentRepository');
const { ADMIN_CHAT_ID }  = require('../../config/config');

const DISTRIBUTION_BATCH_SIZE = 5;

function log(event, leadId, extra = {}) {
  try {
    console.log(JSON.stringify({ event, leadId, ...extra, timestamp: new Date().toISOString() }));
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// distributeLead
// ---------------------------------------------------------------------------

/**
 * Distribute a lead to up to DISTRIBUTION_BATCH_SIZE active workers in the
 * lead's city, ordered by priority DESC / last_assigned_at ASC (fairness queue).
 *
 * @param {number} leadId
 * @returns {Promise<{
 *   distributed: boolean,
 *   workerCount?: number,
 *   telegramSuccess?: number,
 *   reason?: string,
 *   status?: string
 * }>}
 */
async function distributeLead(leadId) {

  // ── Idempotency guard ──────────────────────────────────────────────────
  const existingCount = await leadAssignmentRepo.checkExistingAssignments(leadId);
  if (existingCount > 0) {
    log('distribution_skipped', leadId, { reason: 'already_distributed', existingCount });
    return { distributed: false, reason: 'already_distributed' };
  }

  // ── Load lead ──────────────────────────────────────────────────────────
  const { rows: leadRows } = await pool.query(
    `SELECT id, status, city_id FROM leads WHERE id = $1`,
    [leadId]
  );
  if (!leadRows.length) {
    const err = new Error(`Lead ${leadId} not found`);
    err.statusCode = 404;
    throw err;
  }
  const lead = leadRows[0];

  if (lead.status !== 'new') {
    log('distribution_skipped', leadId, { reason: 'invalid_status', status: lead.status });
    return { distributed: false, reason: 'invalid_status', status: lead.status };
  }

  // ── Fetch eligible workers ─────────────────────────────────────────────
  // Active workers in the lead's city that haven't been tried yet,
  // ordered by priority DESC then last_assigned_at ASC NULLS FIRST.
  const { rows: workers } = await pool.query(
    `SELECT w.id, w.name, w.telegram_chat_id
     FROM   workers w
     WHERE  w.city_id   = $1
       AND  w.is_active = TRUE
       AND  NOT EXISTS (
              SELECT 1 FROM lead_assignments la
              WHERE  la.lead_id   = $2
                AND  la.worker_id = w.id
            )
     ORDER BY
       w.priority         DESC,
       w.last_assigned_at ASC NULLS FIRST
     LIMIT $3`,
    [lead.city_id, leadId, DISTRIBUTION_BATCH_SIZE]
  );

  if (!workers.length) {
    await pool.query(
      `UPDATE leads SET status = 'unassigned', updated_at = NOW() WHERE id = $1`,
      [leadId]
    );
    log('lead_unassigned', leadId, { reason: 'no_workers' });
    telegramService
      .notifyAdmin(ADMIN_CHAT_ID, leadId, 'No active workers available')
      .catch(err => console.error('[distributionService] notifyAdmin failed:', err.message));
    return { distributed: false, reason: 'no_workers' };
  }

  // ── Create DB assignments (before any Telegram call) ──────────────────
  // Failures per-worker are logged and skipped so one bad row can't block others.
  const createdAssignments = [];
  for (const worker of workers) {
    try {
      const row = await leadAssignmentRepo.createAssignment(pool, leadId, worker.id);
      if (row) createdAssignments.push({ worker, assignmentId: row.id });
    } catch (err) {
      console.error(
        `[distributionService] createAssignment failed (lead ${leadId}, worker ${worker.id}):`,
        err.message
      );
    }
  }

  if (!createdAssignments.length) {
    console.error(`[distributionService] All assignment inserts failed for lead ${leadId}`);
    return { distributed: false, reason: 'assignment_creation_failed' };
  }

  // Advance lead status so the single-worker assignLead flow ignores this lead.
  // worker_id stays NULL — acceptLead will set it when someone wins.
  await pool.query(
    `UPDATE leads SET status = 'assigned', updated_at = NOW() WHERE id = $1`,
    [leadId]
  );

  // ── Send Telegram messages concurrently ────────────────────────────────
  // Promise.allSettled — individual failures must not stop the others.
  const sendResults = await Promise.allSettled(
    createdAssignments.map(({ worker }) =>
      telegramService
        .sendLeadToWorker(worker.telegram_chat_id, leadId, worker.id)
        .then(messageId => ({ workerId: worker.id, messageId }))
    )
  );

  // ── Persist returned message_ids (fire-and-forget, non-critical) ───────
  for (const result of sendResults) {
    if (result.status === 'fulfilled' && result.value?.messageId) {
      const { workerId, messageId } = result.value;
      pool.query(
        `UPDATE lead_assignments SET message_id = $1 WHERE lead_id = $2 AND worker_id = $3`,
        [messageId, leadId, workerId]
      ).catch(err =>
        console.error('[distributionService] Failed to persist message_id:', err.message)
      );
    } else if (result.status === 'rejected') {
      console.error('[distributionService] sendLeadToWorker failed:', result.reason?.message);
    }
  }

  const telegramSuccess = sendResults.filter(r => r.status === 'fulfilled').length;

  log('lead_distributed', leadId, {
    workerCount:     createdAssignments.length,
    telegramSuccess,
  });

  return {
    distributed:     true,
    workerCount:     createdAssignments.length,
    telegramSuccess,
  };
}

module.exports = { distributeLead };
