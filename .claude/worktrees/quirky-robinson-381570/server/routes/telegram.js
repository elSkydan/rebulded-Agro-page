'use strict';

/**
 * server/routes/telegram.js
 *
 * Receives Telegram Bot webhook updates (POST /api/telegram/webhook).
 *
 * Design:
 *   • Responds HTTP 200 immediately — Telegram MUST receive 200 quickly or
 *     it will retry the update, causing duplicate processing.
 *   • All async processing runs inside setImmediate() after the response.
 *   • Identity is verified BEFORE any DB write for BOTH Accept and Reject,
 *     using the shared verifyWorkerTelegramIdentity helper.  This replaces
 *     the previous asymmetry where Accept skipped the telegram_chat_id check.
 *   • User-facing errors are mapped to friendly Telegram toast messages via
 *     answerCallbackQuery.  Internal details NEVER reach the user.
 *
 * Callback data format (set by telegramService.sendLeadToWorker):
 *   { l: leadId, w: workerId, a: 'accept' | 'reject' }
 *
 * Flows:
 *   accept → verifyIdentity → acceptLead → editMessage (winner) + notifyAdmin
 *                           → editMessage (all losers, fire-and-forget)
 *   reject → verifyIdentity → applyWorkerResponse (marks rejected + reassigns)
 *                           → editMessage (decliner)
 */

const express                          = require('express');
const router                           = express.Router();
const { acceptLead,
        applyWorkerResponse,
        verifyWorkerTelegramIdentity } = require('../services/assignmentService');
const telegramService                  = require('../services/telegramService');
const { ADMIN_CHAT_ID }                = require('../../config/config');
const pool                             = require('../../db/pool');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a business-logic error to a short user-readable Telegram toast message.
 * NEVER expose stack traces, DB errors, or internal details to users.
 *
 * @param {Error} err
 * @returns {string}  max ~200 chars (Telegram answerCallbackQuery limit)
 */
function getCallbackErrorMessage(err) {
  switch (err.code) {
    case 'WORKER_IDENTITY_MISMATCH':
      return 'Your Telegram account is not linked to this worker profile. Contact admin.';

    case 'LEAD_NOT_YOURS':
      return 'This lead is no longer assigned to you.';

    case 'INVALID_TRANSITION': {
      const s = err.leadStatus ?? '';
      if (s === 'accepted')   return 'This lead has already been accepted.';
      if (s === 'timeout')    return 'This lead timed out before you responded.';
      if (s === 'canceled')   return 'This lead was canceled.';
      if (s === 'unassigned') return 'This lead is no longer available.';
      return 'This lead is no longer available (state changed).';
    }

    default:
      if (err.statusCode === 403) return 'Unauthorized action. Contact admin.';
      if (err.statusCode === 404) return 'This lead no longer exists.';
      if (err.statusCode === 409) return 'Action conflict — this lead may already be processed.';
      return 'Unable to process your response. Please try again or contact admin.';
  }
}

/**
 * Structured JSON logger — all lines are grep-friendly with a consistent prefix.
 *
 * @param {'info'|'error'} level
 * @param {string}         prefix  — e.g. '[telegram:callback]'
 * @param {object}         data
 */
function logEvent(level, prefix, data) {
  const line = JSON.stringify({ ...data, timestamp: new Date().toISOString() });
  (level === 'error' ? console.error : console.log)(`${prefix} ${line}`);
}

// ---------------------------------------------------------------------------
// POST /api/telegram/webhook
// ---------------------------------------------------------------------------

// Middleware 1 — raw request logger.
// Fires BEFORE any validation so even malformed or misrouted updates appear
// in logs.  Gate behind process.env.DEBUG once integration is confirmed.
router.post('/webhook', (req, res, next) => {
  console.log('[telegram:webhook] incoming update:', JSON.stringify(req.body));
  next();
});

// Middleware 2 — main handler
router.post('/webhook', (req, res) => {
  // ACK immediately — never let processing latency cause Telegram retries
  res.sendStatus(200);

  setImmediate(async () => {
    let callbackQueryId;

    try {
      const update = req.body;

      if (!update?.callback_query) {
        console.log('[telegram:webhook] non-callback update ignored');
        return;
      }

      const cq             = update.callback_query;
      callbackQueryId      = cq.id;
      const telegramChatId = cq.from?.id;
      const messageId      = cq.message?.message_id;

      // ── Parse callback_data ────────────────────────────────────────────
      let parsed;
      try {
        parsed = JSON.parse(cq.data);
      } catch {
        console.error('[telegram:webhook] unparseable callback_data:', cq.data);
        await telegramService.answerCallback(callbackQueryId, 'Invalid button data.').catch(() => {});
        return;
      }

      const { l: leadIdRaw, w: workerIdRaw, a: action } = parsed;
      const leadId   = Number(leadIdRaw);
      const workerId = Number(workerIdRaw);

      if (!Number.isFinite(leadId) || !Number.isFinite(workerId) || !action) {
        console.error('[telegram:webhook] invalid callback payload:', JSON.stringify(parsed));
        await telegramService.answerCallback(callbackQueryId, 'Malformed button data.').catch(() => {});
        return;
      }

      logEvent('info', '[telegram:callback]', {
        event:            'callback_received',
        callback_id:      callbackQueryId,
        telegram_user_id: telegramChatId,
        action,
        worker_id:        workerId,
        lead_id:          leadId,
      });

      // ── Route by action ───────────────────────────────────────────────
      if (action === 'accept') {
        await handleAccept({ leadId, workerId, telegramChatId, messageId, callbackQueryId });
      } else if (action === 'reject') {
        await handleReject({ leadId, workerId, telegramChatId, messageId, callbackQueryId });
      } else {
        console.error('[telegram:webhook] unknown action:', action);
        await telegramService.answerCallback(callbackQueryId, 'Unknown action.').catch(() => {});
      }

    } catch (err) {
      // Outer safety net — catches errors from handleAccept / handleReject
      logEvent('error', '[telegram:error]', {
        event:  'unhandled_webhook_error',
        error:  err.message,
        code:   err.code   ?? null,
        status: err.statusCode ?? null,
      });

      try {
        if (callbackQueryId) {
          const userMsg = getCallbackErrorMessage(err);
          await telegramService.answerCallback(callbackQueryId, userMsg).catch(() => {});
        }
      } catch (_) { /* answerCallback failure must not propagate */ }
    }
  });
});

// ---------------------------------------------------------------------------
// Accept handler
// ---------------------------------------------------------------------------

async function handleAccept({ leadId, workerId, telegramChatId, messageId, callbackQueryId }) {

  // ── Identity verification (unified with reject path) ─────────────────────
  // Both Accept and Reject verify the Telegram user pressing the button
  // matches the worker recorded in the DB.  Throws WORKER_IDENTITY_MISMATCH
  // (statusCode 403) if the chat_id does not match.
  await verifyWorkerTelegramIdentity(workerId, telegramChatId);

  const result = await acceptLead(workerId, leadId);

  if (result.result === 'success') {
    // Fetch lead details for rich confirmation text.
    // This lightweight read runs after the accept transaction committed — non-fatal.
    let leadData = null;
    try {
      const { rows } = await pool.query(
        `SELECT l.name, l.phone_normalized, l.service_type, l.area,
                l.total_price, l.city_id, l.out_of_city, l.comment,
                c.name AS city_name
         FROM   leads l
         LEFT JOIN cities c ON c.id = l.city_id
         WHERE  l.id = $1`,
        [leadId]
      );
      leadData = rows[0] ?? null;
    } catch (err) {
      console.error(
        `[telegram:error] lead fetch for accept confirmation failed (lead ${leadId}):`,
        err.message
      );
    }

    const confirmText = leadData
      ? telegramService.buildLeadText(leadId, leadData).replace(
          /⏰ Please respond within 3 minutes\./,
          '✅ <b>You accepted this lead. Call the client now!</b>'
        )
      : `✅ Lead #${leadId} is assigned to you!`;

    logEvent('info', '[telegram:callback]', {
      event:     'accept_success',
      lead_id:   leadId,
      worker_id: workerId,
    });

    await Promise.allSettled([
      messageId
        ? telegramService.editMessageText(telegramChatId, messageId, confirmText)
        : Promise.resolve(),
      telegramService.notifyAdmin(ADMIN_CHAT_ID, leadId, `Accepted by worker ${workerId}`),
      telegramService.answerCallback(callbackQueryId, 'Lead accepted! 🎉'),
    ]);

    // Notify workers who lost the race (fire-and-forget; failures non-critical)
    for (const loser of (result.rejectedWorkers ?? [])) {
      if (!loser.message_id || !loser.telegram_chat_id) continue;
      telegramService
        .editMessageText(
          loser.telegram_chat_id,
          loser.message_id,
          `Lead #${leadId} was taken by another worker.`
        )
        .catch(err =>
          console.error(
            `[telegram:error] editMessage for rejected worker ${loser.worker_id} failed:`,
            err.message
          )
        );
    }

  } else if (result.result === 'already_taken') {
    logEvent('info', '[telegram:callback]', {
      event:     'accept_already_taken',
      lead_id:   leadId,
      worker_id: workerId,
    });

    await Promise.allSettled([
      messageId
        ? telegramService.editMessageText(
            telegramChatId, messageId,
            `Lead #${leadId} has already been taken.`
          )
        : Promise.resolve(),
      telegramService.answerCallback(callbackQueryId, 'Already taken by another worker.'),
    ]);

  } else {
    // alreadyAccepted: idempotent second press from the same winner
    await telegramService.answerCallback(callbackQueryId, 'Already confirmed ✅').catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Reject handler
// ---------------------------------------------------------------------------

async function handleReject({ leadId, workerId, telegramChatId, messageId, callbackQueryId }) {

  // ── Identity verification (same helper as Accept) ────────────────────────
  await verifyWorkerTelegramIdentity(workerId, telegramChatId);

  // applyWorkerResponse verifies identity again inside its transaction
  // (defense-in-depth) and handles post-commit reassignment safely.
  await applyWorkerResponse(leadId, workerId, telegramChatId, 'reject');

  logEvent('info', '[telegram:callback]', {
    event:     'reject_success',
    lead_id:   leadId,
    worker_id: workerId,
  });

  await Promise.allSettled([
    messageId
      ? telegramService.editMessageText(
          telegramChatId, messageId,
          `Lead #${leadId} — Declined`
        )
      : Promise.resolve(),
    telegramService.answerCallback(callbackQueryId, 'Declined'),
  ]);
}

module.exports = router;
