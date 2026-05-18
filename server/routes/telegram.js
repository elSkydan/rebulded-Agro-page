'use strict';

/**
 * POST /api/telegram/webhook — Telegram inline Accept / Reject callbacks.
 * Callback data: { l: leadId, w: workerId, a: 'accept' | 'reject' }
 */

const express = require('express');
const router  = express.Router();
const {
  acceptLead,
  applyWorkerResponse,
  verifyWorkerTelegramIdentity,
} = require('../services/assignmentService');
const telegramService = require('../services/telegramService');
const { ADMIN_CHAT_ID } = require('../../config/config');
const pool = require('../../db/pool');

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
      if (s === 'unassigned') return 'This lead is no longer available.';
      return 'This lead is no longer available (state changed).';
    }
    default:
      if (err.statusCode === 404) return 'This lead no longer exists.';
      if (err.statusCode === 409) return 'This lead may already be processed.';
      return 'Unable to process your response. Try again or contact admin.';
  }
}

function logEvent(level, prefix, data) {
  const line = JSON.stringify({ ...data, timestamp: new Date().toISOString() });
  (level === 'error' ? console.error : console.log)(`${prefix} ${line}`);
}

router.post('/webhook', (req, res, next) => {
  console.log('[telegram:webhook] incoming:', JSON.stringify(req.body));
  next();
});

router.post('/webhook', (req, res) => {
  res.sendStatus(200);

  setImmediate(async () => {
    let callbackQueryId;

    try {
      const update = req.body;
      if (!update?.callback_query) {
        console.log('[telegram:webhook] ignored (not a callback_query)');
        return;
      }

      const cq             = update.callback_query;
      callbackQueryId      = cq.id;
      const telegramChatId = cq.from?.id;
      const messageId      = cq.message?.message_id;

      let parsed;
      try {
        parsed = JSON.parse(cq.data);
      } catch {
        console.error('[telegram:webhook] bad callback_data:', cq.data);
        await telegramService.answerCallback(callbackQueryId, 'Invalid button data.').catch(() => {});
        return;
      }

      const leadId   = Number(parsed.l);
      const workerId = Number(parsed.w);
      const action   = parsed.a;

      if (!Number.isFinite(leadId) || !Number.isFinite(workerId) || !action) {
        console.error('[telegram:webhook] bad payload:', parsed);
        await telegramService.answerCallback(callbackQueryId, 'Malformed button data.').catch(() => {});
        return;
      }

      logEvent('info', '[telegram:callback]', {
        event:            'callback_received',
        action,
        lead_id:          leadId,
        worker_id:        workerId,
        telegram_user_id: telegramChatId,
      });

      if (action === 'accept') {
        await handleAccept({ leadId, workerId, telegramChatId, messageId, callbackQueryId });
      } else if (action === 'reject') {
        await handleReject({ leadId, workerId, telegramChatId, messageId, callbackQueryId });
      } else {
        await telegramService.answerCallback(callbackQueryId, 'Unknown action.').catch(() => {});
      }
    } catch (err) {
      logEvent('error', '[telegram:error]', {
        event: 'unhandled_webhook_error',
        error: err.message,
        code:  err.code ?? null,
      });
      if (callbackQueryId) {
        const msg = getCallbackErrorMessage(err);
        await telegramService.answerCallback(callbackQueryId, msg).catch(() => {});
      }
    }
  });
});

async function handleAccept({ leadId, workerId, telegramChatId, messageId, callbackQueryId }) {
  await verifyWorkerTelegramIdentity(workerId, telegramChatId);

  const result = await acceptLead(workerId, leadId);

  if (result.result === 'success') {
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
      console.error(`[telegram:webhook] lead fetch failed (lead ${leadId}):`, err.message);
    }

    const confirmText = leadData
      ? telegramService.buildLeadText(leadId, leadData).replace(
          /⏰ Please respond within 3 minutes\./,
          '✅ <b>You accepted this lead. Call the client now!</b>'
        )
      : `✅ Lead #${leadId} is assigned to you!`;

    logEvent('info', '[telegram:callback]', { event: 'accept_success', lead_id: leadId, worker_id: workerId });

    await Promise.allSettled([
      messageId
        ? telegramService.editMessageText(telegramChatId, messageId, confirmText)
        : Promise.resolve(),
      telegramService.notifyAdmin(ADMIN_CHAT_ID, leadId, `Accepted by worker ${workerId}`).catch(err =>
        console.error('[telegram:webhook] notifyAdmin failed:', err.message)
      ),
      telegramService.answerCallback(callbackQueryId, 'Lead accepted!'),
    ]);

    for (const loser of result.rejectedWorkers ?? []) {
      if (!loser.message_id || !loser.telegram_chat_id) continue;
      telegramService
        .editMessageText(loser.telegram_chat_id, loser.message_id, `Lead #${leadId} was taken by another worker.`)
        .catch(() => {});
    }
  } else if (result.result === 'already_taken') {
    await Promise.allSettled([
      messageId
        ? telegramService.editMessageText(telegramChatId, messageId, `Lead #${leadId} has already been taken.`)
        : Promise.resolve(),
      telegramService.answerCallback(callbackQueryId, 'Already taken'),
    ]);
  } else {
    await telegramService.answerCallback(callbackQueryId, 'Already confirmed').catch(() => {});
  }
}

async function handleReject({ leadId, workerId, telegramChatId, messageId, callbackQueryId }) {
  await verifyWorkerTelegramIdentity(workerId, telegramChatId);
  await applyWorkerResponse(leadId, workerId, telegramChatId, 'reject');

  logEvent('info', '[telegram:callback]', { event: 'reject_success', lead_id: leadId, worker_id: workerId });

  await Promise.allSettled([
    messageId
      ? telegramService.editMessageText(telegramChatId, messageId, `Lead #${leadId} — Declined`)
      : Promise.resolve(),
    telegramService.answerCallback(callbackQueryId, 'Declined'),
  ]);
}

module.exports = router;
