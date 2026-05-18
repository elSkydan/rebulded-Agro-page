# TelegramBot.md — Telegram Bot Deep Analysis

> **Basis:** BUSINESS_LOGIC.md specification + .env config  
> **Status:** Bot integration is SPECIFIED but NOT YET IMPLEMENTED. TELEGRAM_BOT_TOKEN is placeholder.

---

## 1. Bot Architecture

### Integration Pattern
**Webhook-based** (not polling):
- Telegram pushes updates to `POST /api/telegram/webhook`
- Bot runs inside the main Express process (no separate bot process)
- No library like `node-telegram-bot-api` or `grammy` is mentioned — raw Telegram Bot API via HTTP calls (assumed)

### Components
```
[Telegram Servers]
        │
        │  POST updates (messages, callback_queries)
        ▼
[Express: /api/telegram/webhook]
        │
        ├── Message handler (commands)
        └── Callback query handler (button presses)
                │
                └── assignmentService.updateStatus()
                        │
                        └── telegramService.answerCallbackQuery()
```

---

## 2. Message Flow

### Flow 1: New Lead → Worker Notification
```
1. Client submits form on website
2. Backend creates lead (status='new')
3. assignmentService selects worker
4. telegramService.sendLeadNotification(worker, lead)
   └── Telegram API: sendMessage
       ├── chat_id: worker.telegram_chat_id
       ├── text: formatted lead info (Ukrainian)
       └── reply_markup: InlineKeyboardMarkup
           ├── [✅ Прийняти]  callback_data: {"l":42,"w":7,"a":"accept"}
           └── [❌ Відхилити] callback_data: {"l":42,"w":7,"a":"reject"}
5. Message delivered to worker's Telegram app
```

### Flow 2: Worker Accepts Lead
```
1. Worker taps [✅ Прийняти] button
2. Telegram sends callback_query to POST /api/telegram/webhook
3. Backend parses: {l: lead_id, w: worker_id, a: 'accept'}
4. Validates: worker.telegram_chat_id == callback_query.from.id
5. assignmentService.updateStatus(lead_id, worker_id, 'accept')
   └── DB: UPDATE leads SET status='accepted'
6. telegramService.answerCallbackQuery(id, "✅ Замовлення прийнято!")
7. Optional: edit original message to show "Accepted" state
```

### Flow 3: Worker Rejects Lead
```
1. Worker taps [❌ Відхилити] button
2. Telegram sends callback_query
3. Backend parses: {l: lead_id, w: worker_id, a: 'reject'}
4. Validates worker ownership
5. assignmentService.updateStatus(lead_id, worker_id, 'reject')
   └── DB: UPDATE lead_assignments SET status='rejected'
   └── assignmentService.assignLead(lead_id) — find next worker
       ├── If found: send notification to next worker
       └── If none: UPDATE lead status='unassigned'
6. telegramService.answerCallbackQuery(id, "❌ Замовлення відхилено")
```

### Flow 4: Timeout Reassignment
```
1. node-cron fires every 60 seconds
2. timeoutService finds leads where status='assigned' AND age > 3 min
3. assignmentService.reassignLead(lead_id)
4. New worker notified via telegramService (same as Flow 1)
5. Previous worker's message becomes stale (buttons still visible — risk!)
```

---

## 3. Commands / Handlers

**Planned commands** (inferred from business logic — not explicitly listed):

| Command | Expected Behavior |
|---------|------------------|
| `/start` | Welcome message, register worker or show status |
| `/status` | Show worker's current active leads |
| `/help` | Show available commands |

**Callback handlers:**
| Action | Trigger | Logic |
|--------|---------|-------|
| `accept` | Button tap | Status → accepted |
| `reject` | Button tap | Status → rejected, reassign |

**⚠️ Missing:** No command list exists in any file. Commands must be inferred or defined during implementation.

---

## 4. Telegram Callback Data Format

Per BUSINESS_LOGIC.md, callback data is compact JSON:
```json
{"l": 42, "w": 7, "a": "accept"}
```
- `l` = lead_id (integer)
- `w` = worker_id (integer)
- `a` = action ('accept' | 'reject')

**Telegram limit:** callback_data ≤ 64 bytes  
**Current format size:** ~30-35 bytes — safely within limit

**Security validation:**
```
callback_query.from.id (Telegram user ID)
    MUST EQUAL
worker.telegram_chat_id (from DB)
```
Prevents: replay attacks, forged callbacks, worker impersonation.

---

## 5. Error Handling

| Error | Expected Handling |
|-------|------------------|
| Worker blocked bot | Telegram returns 403 — catch, log, mark worker |
| Telegram API timeout | Should retry with exponential backoff (not specified) |
| Invalid JSON in callback_data | Try/catch, ignore malformed |
| Lead already processed when button tapped | Status transition validation blocks it |
| Webhook verification failed | Return 200 anyway (Telegram retries on non-200) |
| Worker not found by chat_id | Return error, answerCallbackQuery with error text |

**⚠️ Risk:** If telegramService throws during lead assignment and it's not caught, the lead may be assigned in DB but worker never notified. Need try/catch around Telegram calls with status rollback or manual recovery.

---

## 6. Rate Limits & Telegram Constraints

| Constraint | Limit | Impact |
|-----------|-------|--------|
| Bot messages per second (global) | 30 msg/sec | Safe for MVP |
| Messages to same chat per second | 1 msg/sec | Safe (1 worker at a time) |
| Inline keyboard rows | Max 8 rows | Only 2 buttons — fine |
| callback_data length | 64 bytes | Handled with short keys |
| Message text length | 4096 chars | Well within limits |
| Webhook requests timeout | 60 seconds | Must respond within 60s |
| Webhook must return 2xx | Required | Telegram retries on failure |

---

## 7. Weak Points

1. **Stale buttons:** When a lead is reassigned (timeout or reject), the previous worker's message still has active Accept/Reject buttons. If tapped, validation catches it — but UX is poor.  
   **Fix (without rewriting):** Call `editMessageReplyMarkup` to remove buttons after reassignment.

2. **No retry logic:** If Telegram API is down during lead assignment, the notification is lost and the lead stays 'assigned' indefinitely until timeout.  
   **Fix:** Wrap in try/catch; if Telegram fails, set lead back to 'new' or schedule retry.

3. **Bot token is placeholder:** `.env` has `123456:ABC-your-token-here` — system cannot function until real token is set.

4. **Admin chat ID is placeholder:** `123456789` — admin alerts won't work.

5. **No webhook URL registration:** The bot must be registered with Telegram to use webhook mode. This requires calling `setWebhook` with the public URL. Not documented in setup.

6. **No signature verification:** Telegram sends an optional `X-Telegram-Bot-Api-Secret-Token` header. Not mentioned in the design. Risk: Anyone who discovers the webhook URL can send fake updates.

7. **Worker registration flow missing:** How does a worker get their `telegram_chat_id` registered in the DB? No `/start` command handler or onboarding flow is specified.

---

## 8. Missing Features

| Feature | Priority |
|---------|----------|
| Worker `/start` onboarding (register chat_id) | CRITICAL |
| Webhook signature verification | HIGH |
| Edit message after action (remove stale buttons) | MEDIUM |
| Admin Telegram alerts (unassigned leads, errors) | MEDIUM |
| Retry logic for failed Telegram sends | MEDIUM |
| Worker `/status` command | LOW |
| Lead completion confirmation flow | LOW |
| Multi-language support (currently Ukrainian only) | LOW |

---

## 9. Scaling Limitations

- **Single bot token = single bot process:** All workers share one bot. At high volume, consider separate bots per city.
- **Webhook bottleneck:** All Telegram traffic goes through one endpoint in the main Express process. Heavy load could block other requests.
- **30 msg/sec global:** Fine for <10 concurrent leads/minute. Above 1800 leads/hour, rate limit becomes a concern.
- **Solution path:** BullMQ queue for Telegram sends, separate worker process.

---

## 10. How to Test on a Real Telegram Account

### Step 1: Create a Bot
1. Open Telegram, search `@BotFather`
2. Send `/newbot`
3. Name: `AgroServiceBot` (or any name)
4. Username: `agro_service_test_bot` (must end in `bot`)
5. Copy the token: `1234567890:ABCdef...`

### Step 2: Configure .env
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
ADMIN_CHAT_ID=YOUR_TELEGRAM_USER_ID
```
To find your Telegram user ID: message `@userinfobot`

### Step 3: Register Webhook
Once backend is running on a public URL (e.g., via ngrok for local testing):
```bash
curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -d "url=https://YOUR_NGROK_URL/api/telegram/webhook"
```
Verify: `https://api.telegram.org/bot{TOKEN}/getWebhookInfo`

### Step 4: Add a Test Worker
```sql
INSERT INTO workers (name, phone, telegram_chat_id, city_id, priority, is_active)
VALUES ('Test Worker', '+380671234567', YOUR_TELEGRAM_ID, 1, 10, true);
```

### Step 5: Submit a Test Lead
1. Open the landing page
2. Fill in the form with a test phone number
3. Select the city matching the worker's city_id
4. Submit
5. Your Telegram should receive the notification message with buttons

### Step 6: Test Accept Flow
1. Tap [✅ Прийняти]
2. Check DB: `SELECT status FROM leads WHERE id=X` should be `accepted`

### Step 7: Test Reject + Reassignment
1. Add a second worker for the same city
2. Submit a new lead
3. First worker taps [❌ Відхилити]
4. Second worker should receive the notification

### Step 8: Test Timeout
1. Set `TIMEOUT_MINUTES=1` in .env
2. Submit a lead
3. Do NOT tap any button
4. Wait 60+ seconds for cron to fire
5. Check DB: lead should be reassigned or `unassigned`

### Step 9: Test Edge Cases
- Submit same phone within 10 minutes → duplicate handling
- Disable all workers → lead should be `unassigned`
- Tap buttons on already-completed lead → should get error response

### ngrok Setup (local testing)
```bash
# Install ngrok: https://ngrok.com
ngrok http 3000
# Copy the https URL (e.g., https://abc123.ngrok.io)
# Use as webhook URL
```

### Verification Checklist
- [ ] Bot created in BotFather
- [ ] Token set in .env
- [ ] Webhook registered and verified
- [ ] Worker added to DB with real telegram_chat_id
- [ ] Lead submitted successfully
- [ ] Notification received in Telegram
- [ ] Accept button works
- [ ] Reject button works and reassigns
- [ ] Timeout cron fires and reassigns/unassigns
