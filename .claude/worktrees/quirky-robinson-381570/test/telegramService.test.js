'use strict';

/**
 * TelegramService unit tests — node:test (no external dependencies)
 *
 * Tests are isolated: a fresh TelegramService instance is constructed with an
 * injected mock fetch so no real HTTP calls are made.
 *
 * Coverage:
 *   Case 1 – Success:     valid chat_id → message delivered, message_id returned
 *   Case 2 – Fallback:    null chat_id  → admin log channel notified, null returned
 *   Case 3 – Resiliency:  Telegram 5xx  → 3 retry attempts with exponential backoff,
 *                          all fail, null returned (no unhandled rejection)
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { TelegramService, TelegramDeliveryError, buildLeadText } = require('../server/services/telegramService');

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const FAKE_TOKEN          = 'TEST:token_123';
const ADMIN_CHAT_ID       = 100000001;
const ADMIN_LOG_CHANNEL   = 100000002;
const WORKER_CHAT_ID      = '231918839';
const LEAD_ID             = 42;
const WORKER_ID           = 7;
const FAKE_MESSAGE_ID     = 9999;

const SAMPLE_LEAD = {
  name:             'Test Client',
  phone_normalized: '+380501234567',
  service_type:     'ogorod',
  area:             50,
  total_price:      1500,
  city_id:          1,
  city_name:        'Kyiv',
  out_of_city:      false,
  comment:          null,
};

/**
 * Build a mock fetch that returns Telegram-style JSON.
 *
 * @param {object|Function} responseOrFactory
 *   Pass a plain object → always returns that body.
 *   Pass a function (callIndex) → body factory for call-specific responses.
 * @returns {Function} mock fetch
 */
function mockFetch(responseOrFactory) {
  let callCount = 0;
  return async (_url, _opts) => {
    const body = typeof responseOrFactory === 'function'
      ? responseOrFactory(callCount++)
      : responseOrFactory;
    return {
      json: async () => body,
    };
  };
}

/**
 * Track every fetch call (url + body) and return a fixed Telegram response.
 */
function spyFetch(fixedResponse) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return { json: async () => fixedResponse };
  };
  fn.calls = calls;
  return fn;
}

// ---------------------------------------------------------------------------
// Case 1 — Success: message delivered to a valid chat_id
// ---------------------------------------------------------------------------

describe('Case 1 — Success delivery to valid chat_id', () => {

  test('sendLeadToWorker returns the Telegram message_id on success', async () => {
    const fetchSpy = spyFetch({
      ok:     true,
      result: { message_id: FAKE_MESSAGE_ID },
    });

    const svc = new TelegramService({
      token:           FAKE_TOKEN,
      adminChatId:     ADMIN_CHAT_ID,
      adminLogChannel: ADMIN_LOG_CHANNEL,
      fetch:           fetchSpy,
    });

    const returnedId = await svc.sendLeadToWorker(
      WORKER_CHAT_ID, LEAD_ID, WORKER_ID, SAMPLE_LEAD
    );

    // Returned value must be the Telegram message_id
    assert.equal(returnedId, FAKE_MESSAGE_ID);

    // Exactly one HTTP call must have been made (no fallback)
    assert.equal(fetchSpy.calls.length, 1);

    const payload = fetchSpy.calls[0].body;

    // chat_id serialised as string (BigInt-safe)
    assert.equal(payload.chat_id, WORKER_CHAT_ID);

    // Message contains the lead details
    assert.ok(payload.text.includes(SAMPLE_LEAD.name),
      'text must include client name');
    assert.ok(payload.text.includes(SAMPLE_LEAD.phone_normalized),
      'text must include phone');
    assert.ok(payload.text.includes(String(LEAD_ID)),
      'text must include lead id');

    // Both inline buttons present
    const kb = payload.reply_markup.inline_keyboard[0];
    assert.ok(kb.some(btn => btn.callback_data.includes('"a":"accept"')),
      'Accept button must be present');
    assert.ok(kb.some(btn => btn.callback_data.includes('"a":"reject"')),
      'Reject button must be present');
  });

  test('isValidChatId accepts numeric strings and bigint-representable values', () => {
    const svc = new TelegramService({
      token: FAKE_TOKEN, adminChatId: 0, adminLogChannel: 0,
      fetch: mockFetch({}),
    });
    assert.ok(svc.isValidChatId('231918839'));
    assert.ok(svc.isValidChatId(231918839));
    assert.ok(svc.isValidChatId(BigInt('9007199254740993'))); // > MAX_SAFE_INTEGER
    assert.ok(svc.isValidChatId('-1001234567890'));           // supergroup
    assert.ok(!svc.isValidChatId(null));
    assert.ok(!svc.isValidChatId(''));
    assert.ok(!svc.isValidChatId('not-a-number'));
    assert.ok(!svc.isValidChatId(0));
  });

  test('buildLeadText includes all lead fields in the HTML output', () => {
    const text = buildLeadText(LEAD_ID, SAMPLE_LEAD);
    assert.ok(text.includes(SAMPLE_LEAD.name));
    assert.ok(text.includes(SAMPLE_LEAD.phone_normalized));
    assert.ok(text.includes('Garden tilling'));   // ogorod label
    assert.ok(text.includes(SAMPLE_LEAD.city_name));
    assert.ok(text.includes(String(SAMPLE_LEAD.total_price)));
  });

  test('buildLeadText falls back to bare text when lead is null', () => {
    const text = buildLeadText(LEAD_ID, null);
    assert.ok(text.includes(`#${LEAD_ID}`));
    assert.ok(text.includes('Please respond'));
  });

});

// ---------------------------------------------------------------------------
// Case 2 — Fallback: worker has no chat_id → admin log channel notified
// ---------------------------------------------------------------------------

describe('Case 2 — Fallback when worker chat_id is null or invalid', () => {

  test('sendLeadToWorker with null chat_id sends fallback to ADMIN_LOG_CHANNEL', async () => {
    const fetchSpy = spyFetch({ ok: true, result: { message_id: 1 } });

    const svc = new TelegramService({
      token:           FAKE_TOKEN,
      adminChatId:     ADMIN_CHAT_ID,
      adminLogChannel: ADMIN_LOG_CHANNEL,
      fetch:           fetchSpy,
    });

    // Await the returned promise; since fallback is fire-and-forget we must
    // give it a tick to settle before asserting call count.
    const result = await svc.sendLeadToWorker(null, LEAD_ID, WORKER_ID, SAMPLE_LEAD);

    // Must return null (no message_id when fallback fires)
    assert.equal(result, null);

    // Small async drain so the fire-and-forget fallback fetch settles
    await new Promise(r => setImmediate(r));

    // Fallback fetch must target the ADMIN_LOG_CHANNEL (not the worker)
    assert.equal(fetchSpy.calls.length, 1);
    assert.equal(
      fetchSpy.calls[0].body.chat_id,
      String(ADMIN_LOG_CHANNEL),
      'fallback must route to ADMIN_LOG_CHANNEL'
    );

    // Fallback message must name the worker
    assert.ok(
      fetchSpy.calls[0].body.text.includes(`Worker #${WORKER_ID}`),
      'fallback text must identify the worker'
    );
  });

  test('sendLeadToWorker with empty-string chat_id also routes to fallback', async () => {
    const fetchSpy = spyFetch({ ok: true, result: { message_id: 1 } });

    const svc = new TelegramService({
      token: FAKE_TOKEN, adminChatId: ADMIN_CHAT_ID,
      adminLogChannel: ADMIN_LOG_CHANNEL, fetch: fetchSpy,
    });

    const result = await svc.sendLeadToWorker('', LEAD_ID, WORKER_ID, SAMPLE_LEAD);
    await new Promise(r => setImmediate(r));

    assert.equal(result, null);
    assert.equal(fetchSpy.calls.length, 1);
    assert.equal(fetchSpy.calls[0].body.chat_id, String(ADMIN_LOG_CHANNEL));
  });

  test('sendLeadToWorker with 403 response routes blocked-worker alert to ADMIN_LOG_CHANNEL', async () => {
    // First call: primary delivery → 403
    // Second call: fallback admin log → success
    let callIndex = 0;
    const fetchSpy = spyFetch(null); // unused — we override below
    const calls = [];

    const mockFetchImpl = async (_url, opts) => {
      calls.push(JSON.parse(opts.body));
      callIndex++;
      if (callIndex === 1) {
        return { json: async () => ({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }) };
      }
      return { json: async () => ({ ok: true, result: { message_id: 2 } }) };
    };

    const svc = new TelegramService({
      token: FAKE_TOKEN, adminChatId: ADMIN_CHAT_ID,
      adminLogChannel: ADMIN_LOG_CHANNEL, fetch: mockFetchImpl,
    });

    const result = await svc.sendLeadToWorker(
      WORKER_CHAT_ID, LEAD_ID, WORKER_ID, SAMPLE_LEAD
    );
    await new Promise(r => setImmediate(r));

    // Primary delivery fails → null
    assert.equal(result, null);

    // Two calls: primary attempt + admin log fallback
    assert.equal(calls.length, 2,
      'should have made 2 fetch calls: primary + admin alert');

    // First call targeted the worker
    assert.equal(calls[0].chat_id, WORKER_CHAT_ID);

    // Second call targeted the admin log channel
    assert.equal(calls[1].chat_id, String(ADMIN_LOG_CHANNEL));
    assert.ok(calls[1].text.includes('blocked'),
      'admin alert must mention "blocked"');
  });

});

// ---------------------------------------------------------------------------
// Case 3 — Resiliency: 5xx errors are retried with backoff; null returned
// ---------------------------------------------------------------------------

describe('Case 3 — Resiliency under 5xx / network errors', () => {

  test('sendLeadToWorker retries exactly maxAttempts (3) times on 500 and returns null', async () => {
    let callCount = 0;
    const mockFetchImpl = async (_url, _opts) => {
      callCount++;
      return {
        json: async () => ({
          ok:          false,
          error_code:  500,
          description: 'Internal Server Error',
        }),
      };
    };

    const svc = new TelegramService({
      token: FAKE_TOKEN, adminChatId: ADMIN_CHAT_ID,
      adminLogChannel: ADMIN_LOG_CHANNEL, fetch: mockFetchImpl,
      // Speed up the test: override baseDelayMs to 0 by monkey-patching after construction
    });
    svc._baseDelayMs = 0;  // disable real sleeps in tests

    const result = await svc.sendLeadToWorker(
      WORKER_CHAT_ID, LEAD_ID, WORKER_ID, SAMPLE_LEAD
    );

    // Must not throw — sendLeadToWorker swallows errors
    assert.equal(result, null);

    // Should have attempted exactly 3 times (maxAttempts)
    assert.equal(callCount, 3,
      `expected 3 retry attempts, got ${callCount}`);
  });

  test('sendLeadToWorker retries on network error and returns null after exhausting attempts', async () => {
    let callCount = 0;
    const mockFetchImpl = async () => {
      callCount++;
      throw new TypeError('fetch failed: ECONNREFUSED');
    };

    const svc = new TelegramService({
      token: FAKE_TOKEN, adminChatId: ADMIN_CHAT_ID,
      adminLogChannel: ADMIN_LOG_CHANNEL, fetch: mockFetchImpl,
    });
    svc._baseDelayMs = 0;

    const result = await svc.sendLeadToWorker(
      WORKER_CHAT_ID, LEAD_ID, WORKER_ID, SAMPLE_LEAD
    );

    assert.equal(result, null);
    assert.equal(callCount, 3);
  });

  test('_post honours 429 retry_after and retries the correct number of times', async () => {
    let callCount = 0;
    const RETRY_AFTER = 0;  // 0 sec for test speed
    const mockFetchImpl = async (_url, _opts) => {
      callCount++;
      if (callCount < 3) {
        return {
          json: async () => ({
            ok:          false,
            error_code:  429,
            description: 'Too Many Requests: retry after 0',
            parameters:  { retry_after: RETRY_AFTER },
          }),
        };
      }
      // Third attempt succeeds
      return {
        json: async () => ({ ok: true, result: { message_id: 77 } }),
      };
    };

    const svc = new TelegramService({
      token: FAKE_TOKEN, adminChatId: ADMIN_CHAT_ID,
      adminLogChannel: ADMIN_LOG_CHANNEL, fetch: mockFetchImpl,
    });
    svc._baseDelayMs = 0;
    svc._sleep = () => Promise.resolve();  // bypass real sleep for 429 retry_after

    const result = await svc._post('sendMessage', {
      chat_id: String(ADMIN_CHAT_ID),
      text:    'test',
    });

    assert.equal(result.message_id, 77,
      'should succeed on the third attempt after two 429s');
    assert.equal(callCount, 3,
      'should have called fetch exactly 3 times');
  });

  test('403 is NOT retried — exactly 1 fetch call', async () => {
    let callCount = 0;
    const mockFetchImpl = async () => {
      callCount++;
      return {
        json: async () => ({
          ok:          false,
          error_code:  403,
          description: 'Forbidden: bot was blocked by the user',
        }),
      };
    };

    const svc = new TelegramService({
      token: FAKE_TOKEN, adminChatId: ADMIN_CHAT_ID,
      adminLogChannel: ADMIN_LOG_CHANNEL, fetch: mockFetchImpl,
    });

    // _post should throw TelegramDeliveryError(403) immediately
    await assert.rejects(
      () => svc._post('sendMessage', { chat_id: '123', text: 'hi' }),
      (err) => {
        assert.ok(err instanceof TelegramDeliveryError);
        assert.equal(err.errorCode, 403);
        return true;
      }
    );

    assert.equal(callCount, 1, '403 must not be retried');
  });

});
