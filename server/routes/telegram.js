'use strict';

/**
 * server/routes/telegram.js
 *
 * Receives Telegram Bot webhook updates.
 * Always responds 200 immediately so Telegram does not retry.
 * All async processing happens after the response is sent.
 *
 * Callback data format (set by telegramService.sendLeadToWorker):
 *   { l: leadId, w: workerId, a: 'accept' | 'reject' }
 *
 * Flows handled:
 *   accept → acceptLead → editMessage (winner) + notifyAdmin
 *                       → editMessage (all losers, fire-and-forget)
 *   reject → rejectLead → editMessage (decliner)
 */

const express                    = require('express');
const router                     = express.Router();
const { acceptLead, applyWorkerResponse } = require('../services/assignmentService');
const telegramService            = require('../services/telegramService');
const { ADMIN_CHAT_ID }          = require('../../config/config');
const pool                       = require('../../db/pool');

// ---------------------------------------------------------------------------
// POST /api/telegram/webhook
// ---------------------------------------------------------------------------

router.post('/webhook', (req, res) => {
  // ACK Telegram immediately — never let it retry due to slow processing
  res.sendStatus(200);

  setImmediate(async () => {
    try {
      const update = req.body;
      if (!update?.callback_query) return;

      const cq = update.callback_query;
      const callbackQueryId = cq.id;
      const telegramChatId = cq.from?.id;
      const messageId = cq.message?.message_id;
      // ── Parse callback data ────────────────────────────────────────────────
      let parsed;
      try {
        parsed = JSON.parse(cq.data);
      } catch {
        console.error('[telegram webhook] Unparseable callback_data:', cq.data);
        telegramService.answerCallback(callbackQueryId).catch(() => {});
        return;
      }

      const { l: leadIdRaw, w: workerIdRaw, a: action } = parsed;
      const leadId = Number(leadIdRaw);
      const workerId = Number(workerIdRaw);
      if (!Number.isFinite(leadId) || !Number.isFinite(workerId) || !action) {
        console.error('[telegram webhook] Invalid callback payload:', parsed);
        telegramService.answerCallback(callbackQueryId).catch(() => {});
        return;
      }

      // ── Route by action ───────────────────────────────────────────────────
      if (action === 'accept') {
        await handleAccept({ leadId, workerId, telegramChatId, messageId, callbackQueryId });
      } else if (action === 'reject') {
        await handleReject({ leadId, workerId, telegramChatId, messageId, callbackQueryId });
      } else {
        console.error('[telegram webhook] Unknown action:', action);
        telegramService.answerCallback(callbackQueryId).catch(() => {});
      }

    } catch (err) {
      console.error('[telegram webhook] Unhandled error:', err.message);
      try {
        const callbackQueryId = req.body?.callback_query?.id;
        if (callbackQueryId) {
          telegramService.answerCallback(callbackQueryId, 'Something went wrong').catch(() => {});
        }
      } catch (_) {}
    }
  });
});

// ---------------------------------------------------------------------------
// Accept handler
// ---------------------------------------------------------------------------

async function handleAccept({ leadId, workerId, telegramChatId, messageId, callbackQueryId }) {
  const result = await acceptLead(workerId, leadId);

  if (result.result === 'success') {
    // Bug 3 fix: fetch lead details so the accept confirmation shows client contact.
    // This is a lightweight read after the accept transaction has already committed.
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
      console.error(`[telegram webhook] lead fetch for accept confirmation failed (lead ${leadId}):`, err.message);
      // Non-fatal — fall back to bare confirmation text
    }

    const confirmText = leadData
      ? telegramService.buildLeadText(leadId, leadData).replace(
          /⏰ Please respond within 3 minutes\./,
          '✅ <b>You accepted this lead. Call the client now!</b>'
        )
      : `✅ Lead #${leadId} is assigned to you!`;

    await Promise.allSettled([
      // Bug 4 guard: skip edit when messageId is missing
      messageId
        ? telegramService.editMessageText(telegramChatId, messageId, confirmText)
        : Promise.resolve(),
      telegramService.notifyAdmin(
        ADMIN_CHAT_ID, leadId,
        `Accepted by worker ${workerId}`
      ),
      telegramService.answerCallback(callbackQueryId, 'Lead accepted!'),
    ]);

    // Notify workers who lost the race (fire-and-forget; failures are non-critical)
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
            `[telegram webhook] editMessage for rejected worker ${loser.worker_id} failed:`,
            err.message
          )
        );
    }

  } else if (result.result === 'already_taken') {
    await Promise.allSettled([
      // Bug 4 guard
      messageId
        ? telegramService.editMessageText(telegramChatId, messageId, `Lead #${leadId} has already been taken.`)
        : Promise.resolve(),
      telegramService.answerCallback(callbackQueryId, 'Already taken'),
    ]);

  } else {
    // alreadyAccepted: idempotent repeat press from the same winner
    telegramService.answerCallback(callbackQueryId, 'Already confirmed').catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Reject handler
// ---------------------------------------------------------------------------

async function handleReject({ leadId, workerId, telegramChatId, messageId, callbackQueryId }) {
  // applyWorkerResponse handles single-worker flow correctly:
  //   1. Marks this assignment as rejected (inside transaction)
  //   2. Calls reassignLead() to try the next available worker
  // The old rejectLead() skipped step 2, leaving the lead permanently unassigned.
  await applyWorkerResponse(leadId, workerId, telegramChatId, 'reject');

  await Promise.allSettled([
    // Bug 4 guard: messageId is undefined when callback comes from a message
    // older than 48 h or from a channel — skip editMessageText in that case.
    messageId
      ? telegramService.editMessageText(telegramChatId, messageId, `Lead #${leadId} — Declined`)
      : Promise.resolve(),
    telegramService.answerCallback(callbackQueryId, 'Declined'),
  ]);
}

module.exports = router;