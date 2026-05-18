'use strict';

/**
 * TelegramService — class-based outbound Telegram delivery layer.
 *
 * Design principles:
 *  • chat_id is treated as BigInt throughout to prevent JS Number precision
 *    loss for large Telegram channel / supergroup IDs (> 2^53).
 *  • Per-code error handling:
 *      403 Forbidden  → no retry; route to ADMIN_LOG_CHANNEL with worker info
 *      429 Too Many Requests → respect Telegram's retry_after field
 *      5xx / network  → exponential backoff (700 ms × attempt)
 *      400 / 409      → no retry (invalid params / conflict)
 *  • sendLeadToWorker and editMessageText NEVER throw — callers are post-commit
 *    fire-and-forget; Telegram must not affect DB state.
 *  • Structured JSON delivery logs on every attempt result.
 *  • fetch is injected via constructor for unit-test isolation.
 */

const { TELEGRAM_TOKEN, ADMIN_CHAT_ID, ADMIN_LOG_CHANNEL } = require('../../config/config');

// ---------------------------------------------------------------------------
// TelegramDeliveryError — carries HTTP error code for per-code branching
// ---------------------------------------------------------------------------

class TelegramDeliveryError extends Error {
  /**
   * @param {string} message
   * @param {number} errorCode  — Telegram error_code (403, 429, 500, …)
   * @param {string} method     — API method name
   */
  constructor(message, errorCode, method) {
    super(message);
    this.name       = 'TelegramDeliveryError';
    this.errorCode  = errorCode;
    this.method     = method;
  }
}

// ---------------------------------------------------------------------------
// Message formatter — pure function, no I/O
// ---------------------------------------------------------------------------

const SERVICE_LABELS = {
  ogorod:  'Garden tilling',
  celina:  'Virgin land',
  mowing:  'Mowing',
  tree:    'Tree work',
  washing: 'Washing',
};

/**
 * Build the worker-facing lead notification text.
 *
 * @param {number}      leadId
 * @param {object|null} lead   — { name, phone_normalized, service_type, area,
 *                                 total_price, city_name, city_id,
 *                                 out_of_city, comment }
 * @returns {string}  HTML-safe (Telegram HTML parse_mode)
 */
function buildLeadText(leadId, lead) {
  if (!lead) return `New lead #${leadId}\n\nPlease respond within 3 minutes.`;

  const serviceLabel = SERVICE_LABELS[lead.service_type] ?? lead.service_type;

  const lines = [
    `📋 <b>New lead #${leadId}</b>`,
    ``,
    `👤 <b>Client:</b> ${lead.name}`,
    `📞 <b>Phone:</b> ${lead.phone_normalized}`,
    `🛠 <b>Service:</b> ${serviceLabel}`,
    `📐 <b>Area:</b> ${lead.area} m²`,
    `🌆 <b>City:</b> ${lead.city_name ?? lead.city_id}`,
  ];

  if (lead.out_of_city) lines.push(`🚗 <b>Out of city:</b> Yes`);
  if (lead.comment)     lines.push(`💬 <b>Comment:</b> ${lead.comment}`);

  lines.push(``, `💰 <b>Price:</b> ${lead.total_price} UAH`);
  lines.push(``, `⏰ Please respond within 3 minutes.`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// TelegramService class
// ---------------------------------------------------------------------------

class TelegramService {
  /**
   * @param {object}   opts
   * @param {string}   opts.token           — bot token
   * @param {number}   opts.adminChatId     — admin's personal / group chat id
   * @param {number}   opts.adminLogChannel — delivery-failure alert channel
   *                                          (falls back to adminChatId)
   * @param {Function} opts.fetch           — injectable fetch (default: globalThis.fetch)
   */
  constructor({
    token,
    adminChatId,
    adminLogChannel,
    fetch: fetchFn = globalThis.fetch,
  }) {
    if (!token) {
      // Warn but do not throw — allows the module to be required in test
      // environments where .env is not loaded, and where tests inject their
      // own token via the constructor directly.
      console.warn('[TelegramService] TELEGRAM_TOKEN is not set — bot notifications will be disabled');
    }

    this._token           = token ?? null;
    this._apiBase         = `https://api.telegram.org/bot${token}`;
    this._adminChatId     = adminChatId;
    this._adminLogChannel = adminLogChannel || adminChatId;
    this._fetch           = fetchFn;
    this._maxAttempts     = 3;
    this._baseDelayMs     = 700;
  }

  // ── Validation & serialization ─────────────────────────────────────────────

  /**
   * Returns true when chatId can be converted to a non-zero BigInt.
   * node-postgres returns BIGINT columns as strings; this handles both
   * string and numeric inputs.
   *
   * @param {string|number|bigint|null|undefined} chatId
   * @returns {boolean}
   */
  isValidChatId(chatId) {
    if (chatId == null || chatId === '') return false;
    try {
      return BigInt(chatId) !== 0n;
    } catch {
      return false;
    }
  }

  /**
   * Normalize chatId for the Telegram JSON payload.
   * Always uses string representation so values above Number.MAX_SAFE_INTEGER
   * (large channel / supergroup IDs) are not truncated by JSON serialisation.
   *
   * @param {string|number|bigint} chatId
   * @returns {string}
   */
  _serializeChatId(chatId) {
    return String(BigInt(chatId));
  }

  // ── Structured delivery logger ─────────────────────────────────────────────

  /**
   * Emit a structured JSON log for every delivery outcome.
   *
   * @param {'sent'|'failed'|'blocked'|'rate_limited'|'fallback_sent'|'skipped'} status
   * @param {object} ctx
   */
  _logDelivery(status, {
    method,
    leadId      = null,
    workerId    = null,
    chatId      = null,
    messageId   = null,
    errorCode   = null,
    errorDesc   = null,
  }) {
    try {
      console.log(JSON.stringify({
        event:           'telegram_delivery',
        delivery_status: status,
        method,
        lead_id:         leadId,
        worker_id:       workerId,
        chat_id:         chatId != null ? String(chatId) : null,
        message_id:      messageId,
        error_code:      errorCode,
        error_desc:      errorDesc,
        timestamp:       new Date().toISOString(),
      }));
    } catch (_) {
      // logger must never throw
    }
  }

  // ── Internal sleep ─────────────────────────────────────────────────────────

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── HTTP transport ─────────────────────────────────────────────────────────

  /**
   * POST to the Telegram Bot API.
   *
   * Retry strategy:
   *   • 403 / 400 / 409   → throw immediately (no retry)
   *   • 429               → wait `retry_after` seconds, then retry
   *   • 5xx / network err → exponential backoff (baseDelay × attempt)
   *
   * @param {string} method   — e.g. 'sendMessage'
   * @param {object} payload
   * @returns {Promise<object>}
   * @throws {TelegramDeliveryError}
   */
  async _post(method, payload) {
    if (!this._token) {
      throw new TelegramDeliveryError(
        'TELEGRAM_TOKEN is not configured', 0, method
      );
    }

    const url = `${this._apiBase}/${method}`;
    let lastErr;

    for (let attempt = 1; attempt <= this._maxAttempts; attempt++) {
      try {
        const res  = await this._fetch(url, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        const body = await res.json();

        if (body.ok) return body.result;

        const errCode = body.error_code;
        const errDesc = body.description ?? '';

        // ── Non-retryable: permanent configuration / state errors ────────────
        if (errCode === 403) {
          throw new TelegramDeliveryError(
            `Forbidden (403): ${errDesc}`, 403, method
          );
        }
        if (errCode === 400) {
          throw new TelegramDeliveryError(
            `Bad Request (400): ${errDesc}`, 400, method
          );
        }
        if (errCode === 409) {
          throw new TelegramDeliveryError(
            `Conflict (409): ${errDesc}`, 409, method
          );
        }

        // ── 429 Too Many Requests: honour retry_after ────────────────────────
        if (errCode === 429) {
          const retryAfterSec = (body.parameters?.retry_after ?? 30) + 1; // +1 s buffer
          console.warn(JSON.stringify({
            event:           'telegram_rate_limited',
            method,
            retry_after_sec: retryAfterSec,
            attempt,
            timestamp:       new Date().toISOString(),
          }));
          lastErr = new TelegramDeliveryError(
            `Too Many Requests (429): retry after ${retryAfterSec}s`, 429, method
          );
          if (attempt < this._maxAttempts) {
            await this._sleep(retryAfterSec * 1000);
            continue;
          }
          break;
        }

        // ── All other codes (5xx, unknown) — exponential backoff ────────────
        lastErr = new TelegramDeliveryError(
          `API error (${errCode}): ${errDesc}`, errCode, method
        );
        console.error(JSON.stringify({
          event:      'telegram_api_error',
          method,
          error_code: errCode,
          error_desc: errDesc,
          attempt,
          timestamp:  new Date().toISOString(),
        }));
        if (attempt < this._maxAttempts) {
          await this._sleep(this._baseDelayMs * attempt);
        }

      } catch (err) {
        // Non-retryable delivery errors bubble up immediately
        if (
          err instanceof TelegramDeliveryError &&
          [400, 403, 409].includes(err.errorCode)
        ) {
          throw err;
        }

        // Network errors, JSON parse failures, or retryable API errors
        lastErr = err;
        console.error(JSON.stringify({
          event:     'telegram_network_error',
          method,
          error:     err.message,
          attempt,
          timestamp: new Date().toISOString(),
        }));
        if (attempt < this._maxAttempts) {
          await this._sleep(this._baseDelayMs * attempt);
        }
      }
    }

    throw lastErr ?? new TelegramDeliveryError(
      `${method} failed after ${this._maxAttempts} attempts`, 0, method
    );
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generic sendMessage — base transport exposed for callers who need raw control.
   * Throws on failure; wrap in try/catch when fire-and-forget semantics are needed.
   *
   * @param {string|number|bigint} chatId
   * @param {string}               text
   * @param {object}               [options]  — merged into the payload
   * @returns {Promise<object>}  Telegram Message object
   */
  async sendMessage(chatId, text, options = {}) {
    return this._post('sendMessage', {
      chat_id: this._serializeChatId(chatId),
      text,
      ...options,
    });
  }

  /**
   * Send a new lead notification to a worker with Accept / Reject buttons.
   *
   * Handles all errors internally — NEVER throws.
   *
   * Fallback behaviour:
   *   • chatId is null/invalid → notify ADMIN_LOG_CHANNEL with "no Telegram linked"
   *   • 403 Forbidden         → worker blocked the bot → notify ADMIN_LOG_CHANNEL
   *   • other errors          → logged; null returned
   *
   * @param {string|number|bigint|null} chatId
   * @param {number}                    leadId
   * @param {number}                    workerId
   * @param {object|null}               lead
   * @returns {Promise<number|null>}  Telegram message_id, or null on failure
   */
  async sendLeadToWorker(chatId, leadId, workerId, lead = null) {
    // ── Guard: invalid / missing chat_id ──────────────────────────────────────
    if (!this.isValidChatId(chatId)) {
      this._logDelivery('fallback_sent', {
        method:    'sendMessage',
        leadId,
        workerId,
        chatId,
        errorDesc: 'Worker has no valid chat_id',
      });

      const fallbackText =
        `⚠️ <b>Worker #${workerId} has no Telegram linked.</b>\n` +
        `Lead #${leadId} could not be delivered.\n\n` +
        buildLeadText(leadId, lead);

      this._post('sendMessage', {
        chat_id:    this._serializeChatId(this._adminLogChannel),
        text:       fallbackText,
        parse_mode: 'HTML',
      }).catch(err =>
        console.error('[TelegramService] admin fallback failed (no chat_id):', err.message)
      );

      return null;
    }

    // ── Primary delivery ──────────────────────────────────────────────────────
    const acceptData = JSON.stringify({ l: leadId, w: workerId, a: 'accept' });
    const rejectData = JSON.stringify({ l: leadId, w: workerId, a: 'reject' });

    try {
      const result = await this._post('sendMessage', {
        chat_id:    this._serializeChatId(chatId),
        text:       buildLeadText(leadId, lead),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: 'Accept ✅', callback_data: acceptData },
            { text: 'Reject ❌', callback_data: rejectData },
          ]],
        },
      });

      this._logDelivery('sent', {
        method:    'sendMessage',
        leadId,
        workerId,
        chatId,
        messageId: result?.message_id,
      });

      return result?.message_id ?? null;

    } catch (err) {
      const errCode      = err instanceof TelegramDeliveryError ? err.errorCode : null;
      const deliveryStatus = errCode === 403 ? 'blocked' : 'failed';

      this._logDelivery(deliveryStatus, {
        method:    'sendMessage',
        leadId,
        workerId,
        chatId,
        errorCode: errCode,
        errorDesc: err.message,
      });

      // 403: worker blocked the bot — alert the delivery log channel
      if (errCode === 403) {
        this._post('sendMessage', {
          chat_id: this._serializeChatId(this._adminLogChannel),
          text:
            `⚠️ <b>Worker #${workerId}</b> (chat_id: <code>${chatId}</code>) ` +
            `has blocked the bot.\n` +
            `Lead #${leadId} was not delivered.`,
          parse_mode: 'HTML',
        }).catch(e =>
          console.error('[TelegramService] admin fallback for blocked worker failed:', e.message)
        );
      }

      // Never throw — Telegram must not affect committed DB state
      return null;
    }
  }

  /**
   * Edit an existing worker message and clear its inline keyboard.
   * Never throws — message editing is always non-critical.
   *
   * @param {string|number|bigint|null} chatId
   * @param {number|null}               messageId
   * @param {string}                    text
   */
  async editMessageText(chatId, messageId, text) {
    if (!this.isValidChatId(chatId) || !messageId) return;

    try {
      await this._post('editMessageText', {
        chat_id:    this._serializeChatId(chatId),
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] },
      });
    } catch (err) {
      // Common non-fatal: 400 "message is not modified", 400 "message to edit not found"
      console.error(JSON.stringify({
        event:      'telegram_delivery',
        delivery_status: 'failed',
        method:     'editMessageText',
        chat_id:    String(chatId),
        message_id: messageId,
        error_code: err instanceof TelegramDeliveryError ? err.errorCode : null,
        error_desc: err.message,
        timestamp:  new Date().toISOString(),
      }));
    }
  }

  /**
   * Answer a callback query (removes the Telegram loading spinner).
   * May throw; callers should use .catch(() => {}) if non-critical.
   *
   * @param {string} callbackQueryId
   * @param {string} [text]
   */
  async answerCallback(callbackQueryId, text = '') {
    await this._post('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
    });
  }

  /**
   * Notify the admin chat about a lifecycle event.
   * May throw; callers should use .catch(err => console.error(…)).
   *
   * @param {number} adminChatId
   * @param {number} leadId
   * @param {string} reason
   */
  async notifyAdmin(adminChatId, leadId, reason) {
    await this._post('sendMessage', {
      chat_id: this._serializeChatId(adminChatId),
      text:    `Admin alert — Lead #${leadId}: ${reason}`,
    });
  }

  /**
   * Expose buildLeadText as an instance method so existing callers
   * (telegram.js route) can call telegramService.buildLeadText(…).
   */
  buildLeadText(leadId, lead) {
    return buildLeadText(leadId, lead);
  }
}

// ---------------------------------------------------------------------------
// Singleton — export a ready-to-use instance (same import path as before)
// ---------------------------------------------------------------------------

const telegramService = new TelegramService({
  token:            TELEGRAM_TOKEN,
  adminChatId:      ADMIN_CHAT_ID,
  adminLogChannel:  ADMIN_LOG_CHANNEL,
});

module.exports = telegramService;

// Also export the class and helpers for tests / advanced usage
module.exports.TelegramService      = TelegramService;
module.exports.TelegramDeliveryError = TelegramDeliveryError;
module.exports.buildLeadText        = buildLeadText;
