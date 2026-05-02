'use strict';

/**
 * leadAssignmentRepository.js
 *
 * All SQL for lead_assignments in one place.
 * Functions that must run inside a transaction accept a `client` parameter.
 * Functions that are safe to run outside a transaction accept a `db` parameter
 * (either pool or client — callers decide).
 */

const pool = require('../../db/pool');

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Insert a new assignment record.
 * ON CONFLICT DO NOTHING makes this safe to call twice for the same pair.
 *
 * @param {object} db      - pool or transaction client
 * @param {number} leadId
 * @param {number} workerId
 * @param {number|null} messageId  - Telegram message_id (may be stored later)
 * @returns {object|null}  inserted row, or null if it already existed
 */
async function createAssignment(db, leadId, workerId, messageId = null) {
  const { rows } = await db.query(
    `INSERT INTO lead_assignments (lead_id, worker_id, message_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (lead_id, worker_id) DO NOTHING
     RETURNING *`,
    [leadId, workerId, messageId]
  );
  return rows[0] ?? null;
}

/**
 * Mark one assignment as accepted.
 * Must be called inside an open transaction — the partial unique index on
 * (lead_id) WHERE status='accepted' will block concurrent duplicate accepts.
 *
 * @param {object} client  - transaction client
 * @returns {object|null}  updated row, or null if assignment was already resolved
 */
async function markAccepted(client, leadId, workerId) {
  const { rows } = await client.query(
    `UPDATE lead_assignments
     SET    status       = 'accepted',
            responded_at = NOW()
     WHERE  lead_id   = $1
       AND  worker_id = $2
       AND  status    = 'sent'
     RETURNING *`,
    [leadId, workerId]
  );
  return rows[0] ?? null;
}

/**
 * Mark one assignment as rejected.
 *
 * @param {object} db  - pool or transaction client
 */
async function markRejected(db, leadId, workerId) {
  await db.query(
    `UPDATE lead_assignments
     SET    status       = 'rejected',
            responded_at = NOW()
     WHERE  lead_id   = $1
       AND  worker_id = $2
       AND  status    = 'sent'`,
    [leadId, workerId]
  );
}

/**
 * Mark every still-pending assignment for this lead (except the winner) as
 * rejected.  Returns the rejected rows so callers can edit Telegram messages.
 *
 * Must be called inside an open transaction.
 *
 * @param {object} client
 * @returns {Array<{ worker_id, message_id, telegram_chat_id }>}
 */
async function markAllOthersRejected(client, leadId, winnerWorkerId) {
  const { rows } = await client.query(
    `UPDATE lead_assignments
     SET    status       = 'rejected',
            responded_at = NOW()
     FROM   workers
     WHERE  lead_assignments.lead_id    = $1
       AND  lead_assignments.worker_id != $2
       AND  lead_assignments.status     = 'sent'
       AND  workers.id = lead_assignments.worker_id
     RETURNING
       lead_assignments.worker_id,
       lead_assignments.message_id,
       workers.telegram_chat_id`,
    [leadId, winnerWorkerId]
  );
  return rows;
}

/**
 * Mark all pending (sent) assignments for a lead as timed out.
 *
 * @param {object} db  - pool or transaction client
 * @returns {number}   rows affected
 */
async function markTimeout(db, leadId) {
  const { rowCount } = await db.query(
    `UPDATE lead_assignments
     SET status = 'timeout'
     WHERE lead_id = $1 AND status = 'sent'`,
    [leadId]
  );
  return rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * All assignments for a lead, with worker telegram_chat_id joined.
 */
async function getAssignmentsByLead(leadId) {
  const { rows } = await pool.query(
    `SELECT la.*, w.telegram_chat_id
     FROM   lead_assignments la
     JOIN   workers w ON w.id = la.worker_id
     WHERE  la.lead_id = $1
     ORDER BY la.created_at ASC`,
    [leadId]
  );
  return rows;
}

/**
 * Returns total count of assignments (any status) for a lead.
 * Used as an idempotency check before distribution.
 */
async function checkExistingAssignments(leadId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS count FROM lead_assignments WHERE lead_id = $1`,
    [leadId]
  );
  return parseInt(rows[0].count, 10);
}

/**
 * Returns count of pending (sent) assignments.
 *
 * @param {object} db  - pool or transaction client
 */
async function countPendingAssignments(db, leadId) {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS count
     FROM   lead_assignments
     WHERE  lead_id = $1 AND status = 'sent'`,
    [leadId]
  );
  return parseInt(rows[0].count, 10);
}

/**
 * Returns count of accepted assignments for a lead.
 *
 * @param {object} db  - pool or transaction client
 */
async function countAcceptedAssignments(db, leadId) {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS count
     FROM   lead_assignments
     WHERE  lead_id = $1 AND status = 'accepted'`,
    [leadId]
  );
  return parseInt(rows[0].count, 10);
}

/**
 * Lock the lead row for UPDATE inside an open transaction.
 * Always call this before any state mutation that needs to be atomic.
 *
 * @param {object} client  - transaction client
 * @returns {object|null}  lead row or null
 */
async function lockLead(client, leadId) {
  const { rows } = await client.query(
    `SELECT id, status, worker_id, city_id
     FROM   leads
     WHERE  id = $1
     FOR UPDATE`,
    [leadId]
  );
  return rows[0] ?? null;
}

module.exports = {
  createAssignment,
  getAssignmentsByLead,
  markAccepted,
  markRejected,
  markAllOthersRejected,
  markTimeout,
  checkExistingAssignments,
  lockLead,
  countPendingAssignments,
  countAcceptedAssignments,
};
