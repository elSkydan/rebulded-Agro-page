# Telegram bot — testing with a real user

The site creates leads in PostgreSQL, assigns a worker, then **sends a Telegram message** to that worker (`telegramService.sendLeadToWorker`). Workers tap **Accept / Reject**; the app records the choice via **`POST /api/telegram/webhook`**.

## 1. Prerequisites

- `.env` has a valid **`TELEGRAM_BOT_TOKEN`** from [@BotFather](https://t.me/BotFather).
- **`ADMIN_CHAT_ID`** is set if you want admin alerts (no workers, timeouts, etc.).
- Each **worker** row has a real **`telegram_chat_id`** (see below).

Check the token without starting the full app:

```bash
node scripts/check-telegram.js
```

You should see `Bot OK: your_bot_name`.

## 2. Get a user’s `telegram_chat_id`

Telegram only sends messages if you know the **numeric chat id** for that user (private chat with your bot).

Typical flow:

1. User opens your bot in Telegram and taps **Start** (`/start`).
2. You read updates:
   - Temporary: open  
     `https://api.telegram.org/bot<TOKEN>/getUpdates`  
     and find `"chat":{"id": 123456789, ...}` for that user.
   - Or forward any message from the user to **@userinfobot** / **@getidsbot** (third-party; use at your own discretion).

3. Put that number into **`workers.telegram_chat_id`** (must match the worker you assign in that city).

**Important:** The id used in `sendMessage` must be the same id used when the worker taps the inline button; the webhook checks `workers.telegram_chat_id` against the callback chat id.

## 3. Webhook URL (production)

Telegram must reach your server:

```text
https://<your-public-domain>/api/telegram/webhook
```

Set it with:

```text
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<host>/api/telegram/webhook
```

Use **HTTPS**. For local development, expose **localhost** with **ngrok** (or similar) and set the webhook to the ngrok HTTPS URL.

## 4. End-to-end test (real user)

1. **Database:** at least one **city** and one **active worker** in that city with a valid **`telegram_chat_id`**.
2. Start the app: `npm start`.
3. Open the site, submit the lead form (same city as the worker).
4. Worker should receive: “New lead #…” with **Accept** / **Reject**.
5. Tap a button — lead status in DB should update (`accepted` / reassignment on reject).

If messages never arrive: run `node scripts/check-telegram.js`, verify token, worker chat id, and that assignment picked that worker (logs / `leads` + `lead_assignments`).

## 5. Relation to the public form

The **form only talks to** `POST /api/leads`. Telegram is **not** required for the form to return **201** — but without a valid bot token + worker chat id, the worker simply won’t get a message; the lead should still be stored if Postgres accepts it.

Run **`node scripts/smoke-post-lead.js`** while `npm start` is running to verify the HTTP + DB path for **mowing** (and other service types need matching DB enums — see `db/migrate_service_types.sql` for older databases).
