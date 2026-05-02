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
const { acceptLead, rejectLead } = require('../services/assignmentService');
const telegramService            = require('../services/telegramService');
const { ADMIN_CHAT_ID }          = require('../../config/config');

// ---------------------------------------------------------------------------
// POST /api/telegram/webhook
// ---------------------------------------------------------------------------

router.post('/webhook', async (req, res) => {
  // ACK Telegram immediately — never let it retry due to slow processing
  res.sendStatus(200);

  const update = req.body;
  if (!update?.callback_query) return;

  const cq              = update.callback_query;
  const callbackQueryId = cq.id;
  const telegramChatId  = cq.from?.id;
  const messageId       = cq.message?.message_id;

  // ── Parse callback data ──────────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(cq.data);
  } catch {
    console.error('[telegram webhook] Unparseable callback_data:', cq.data);
    telegramService.answerCallback(callbackQueryId).catch(() => {});
    return;
  }

  const { l: leadId, w: workerId, a: action } = parsed;

  if (!Number.isFinite(leadId) || !Number.isFinite(workerId) || !action) {
    console.error('[telegram webhook] Invalid callback payload:', parsed);
    telegramService.answerCallback(callbackQueryId).catch(() => {});
    return;
  }

  // ── Route by action ───────────────────────────────────────────────────────
  try {
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
    telegramService.answerCallback(callbackQueryId, 'Something went wrong').catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// Accept handler
// ---------------------------------------------------------------------------

async function handleAccept({ leadId, workerId, telegramChatId, messageId, callbackQueryId }) {
  const result = await acceptLead(workerId, leadId);

  if (result.result === 'success') {
    await Promise.allSettled([
      telegramService.editMessageText(
        telegramChatId, messageId,
        `Lead #${leadId} is assigned to you!`
      ),
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
      telegramService.editMessageText(
        telegramChatId, messageId,
        `Lead #${leadId} has already been taken.`
      ),
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
  await rejectLead(workerId, leadId);

  await Promise.allSettled([
    telegramService.editMessageText(
      telegramChatId, messageId,
      `Lead #${leadId} — Declined`
    ),
    telegramService.answerCallback(callbackQueryId, 'Declined'),
  ]);
}

module.exports = router;