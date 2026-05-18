# Services.md — Internal Services Analysis

> **Basis:** BUSINESS_LOGIC.md specification + server.js entry point  
> **Status:** All services are SPECIFIED but NOT YET IMPLEMENTED. Analysis is based on documented design intent.

---

## 1. assignmentService.js

### Role
Core orchestrator for lead-to-worker assignment. Handles the full assignment state machine.

### Logic

#### `assignLead(lead_id)`
1. BEGIN TRANSACTION
2. SELECT lead WHERE id=lead_id FOR UPDATE (prevents concurrent assignment)
3. SELECT worker WHERE city matches, is_active=true, NOT IN already-tried workers  
   ORDER BY priority DESC, last_assigned_at ASC NULLS FIRST  
   LIMIT 1
4. If no worker found → UPDATE lead SET status='unassigned'
5. If worker found:
   - INSERT INTO lead_assignments (lead_id, worker_id, status='sent')
   - UPDATE lead SET status='assigned', worker_id=worker_id
   - UPDATE worker SET last_assigned_at=NOW()
   - CALL telegramService.sendLeadNotification(worker, lead)
6. COMMIT

#### `updateStatus(lead_id, worker_id, action)` [via Telegram webhook]
- Validates: lead exists, worker matches lead.worker_id, transition is legal
- Legal transitions:
  - `assigned` → `accepted` (action: 'accept')
  - `assigned` → `rejected` (action: 'reject') → triggers reassignment
- If rejected: calls `assignLead(lead_id)` with current worker excluded

#### `reassignLead(lead_id)` [via timeoutService]
- Same as assignLead but already-tried workers in lead_assignments are excluded
- If all workers exhausted: status='unassigned'

### Input
- lead_id (integer)
- worker_id (integer, for status updates)
- action (string: 'accept' | 'reject')

### Output
- Updated lead status in DB
- Telegram notification dispatched (side effect)

### Dependencies
- `db/pool.js` (PostgreSQL)
- `telegramService.js`

### Risks / Edge Cases
| Scenario | Handling |
|----------|----------|
| No available workers | Lead → 'unassigned', no notification |
| Worker deactivated mid-assignment | Skip in reassignment query |
| Concurrent duplicate callbacks | FOR UPDATE lock prevents double-processing |
| Worker at ACTIVE_LEAD_LIMIT | Filter out in assignment query |
| Lead already accepted when reject comes | Transition validation blocks it |
| DB transaction fails | Rollback, lead stays in previous state |

---

## 2. pricingService.js

### Role
Calculates total price for a lead based on service type, area, and city delivery.

### Logic

#### `calculatePrice(serviceType, area, outOfCity)`

Pricing constants (mirrored in main.js frontend):
```
OGOROD_RATE = 300 грн/сотка
CELINA_RATE = 600 грн/сотка, min 1800 грн
MOWING_RATE = 200 грн/сотка, min 200 грн
TREE_MIN = 500 грн (flat rate)
WASHING_MIN = 250 грн (flat rate)
OUT_OF_CITY_SURCHARGE = 800 грн
MIN_ORDER = 1000 грн
```

Calculation logic:
```
switch (serviceType):
  'ogorod':  price = area * 300
  'celina':  price = max(area * 600, 1800)
  'mowing':  price = max(area * 200, 200)
  'tree':    price = 500
  'washing': price = 250

if (outOfCity): price += 800
price = max(price, MIN_ORDER)
return price
```

### Input
- serviceType: 'ogorod' | 'celina' | 'mowing' | 'tree' | 'washing'
- area: float (сотки, 0.5 precision)
- outOfCity: boolean

### Output
- total_price: integer (Ukrainian Hryvnia)

### Dependencies
- None (pure function)

### Risks / Edge Cases
| Scenario | Handling |
|----------|----------|
| area=0 for flat-rate services | Minimums apply |
| Negative area | Input validation in middleware |
| Unknown serviceType | Should throw / return error |
| Out-of-city with minimum order | Both surcharge and minimum apply |
| Frontend/backend price mismatch | Constants duplicated — risk of drift |

**⚠️ Risk:** Pricing constants are duplicated in `main.js` (frontend) and `pricingService.js` (backend, planned). Any change to pricing requires updates in both places. Should be moved to a shared config or served via API.

---

## 3. telegramService.js

### Role
All Telegram Bot API interactions: sending lead notifications to workers, handling inline button callbacks.

### Logic

#### `sendLeadNotification(worker, lead)`
Composes and sends a Telegram message to worker.telegram_chat_id:
```
Message text (Ukrainian):
"📋 Новий замовлення!
Послуга: {service_type_label}
Площа: {area} сотки
Місто: {city_name}
Виїзд: {yes/no}
Ціна: {total_price} грн
Клієнт: {phone}
📞 Зателефонуйте та підтвердіть!"

Inline keyboard:
[✅ Прийняти] [❌ Відхилити]
```

Callback data format (≤64 bytes, JSON):
```json
{"l": 42, "w": 7, "a": "accept"}
{"l": 42, "w": 7, "a": "reject"}
```

#### `answerCallbackQuery(callback_query_id, text)`
Responds to Telegram to clear the "loading" spinner on button press.

#### `sendAdminAlert(message)` [assumption — likely needed]
Sends operational alerts (unassigned lead, system error) to ADMIN_CHAT_ID.

### Input
- worker: {telegram_chat_id, name}
- lead: {id, service_type, area, city_name, out_of_city, total_price, phone_normalized}
- callback_query_id: string (from Telegram)

### Output
- Telegram API response (HTTP)
- No return value (fire-and-forget or awaited for error handling)

### Dependencies
- `TELEGRAM_BOT_TOKEN` (env)
- `ADMIN_CHAT_ID` (env)
- node-fetch or https module (for API calls)

### Risks / Edge Cases
| Scenario | Handling |
|----------|----------|
| Worker has no telegram_chat_id | Skip notification, log warning |
| Telegram API timeout | Retry logic needed (not specified) |
| Message too long | Truncate fields |
| Callback data >64 bytes | Payload uses short keys (l,w,a) |
| Worker blocks the bot | Telegram returns 403 — must catch |
| Rate limit (30 msg/sec global) | Fine for low volume MVP |

---

## 4. timeoutService.js

### Role
Background cron job — polls DB every 60 seconds for stale leads and triggers reassignment or failure marking.

### Logic

#### `checkTimeouts()` — runs every 1 minute via node-cron

**Check 1: Assignment timeouts**
```sql
SELECT * FROM leads
WHERE status = 'assigned'
  AND updated_at < NOW() - INTERVAL '{TIMEOUT_MINUTES} minutes'
FOR UPDATE SKIP LOCKED
```
For each: call `assignmentService.reassignLead(lead_id)`

**Check 2: Accepted lead expiry**
```sql
SELECT * FROM leads
WHERE status = 'accepted'
  AND updated_at < NOW() - INTERVAL '{ACCEPTED_TTL_MINUTES} minutes'
FOR UPDATE SKIP LOCKED
```
For each: UPDATE status = 'failed_contact'

### Input
- None (reads from env: TIMEOUT_MINUTES, ACCEPTED_TTL_MINUTES)

### Output
- DB updates (side effects)
- Telegram notifications dispatched via assignmentService

### Dependencies
- `db/pool.js`
- `assignmentService.js`
- `node-cron`

### Risks / Edge Cases
| Scenario | Handling |
|----------|----------|
| Cron fires while DB is slow | SKIP LOCKED prevents blocking |
| Multiple cron instances (scaled) | SKIP LOCKED + FOR UPDATE prevent double processing |
| assignmentService throws in loop | Must catch per-lead to not abort full batch |
| Server restart during timeout window | Leads remain in 'assigned' — will be caught next cron |
| TIMEOUT_MINUTES=0 (misconfigured) | All assigned leads immediately timeout — dangerous |

---

## 5. Middleware (Planned)

### auth.js
- Validates `Authorization: Bearer {ADMIN_TOKEN}` header
- Rejects with 401 if missing or invalid
- Applied to all `/api/workers` and `/api/cities` (write operations)

### validateLead.js
- Required: phone (min 10 digits), city_id (integer), service_type (enum)
- Optional: name, area (float ≥ 0), comment, out_of_city (boolean)
- Phone normalization: strips non-digits, prepends +380 if needed
- Returns 400 with field-level errors if invalid

### rateLimiter.js
- Uses `express-rate-limit`
- Window: 60,000ms (1 min)
- Max: 5 requests per IP
- Applied to POST /api/leads
- Returns 429 Too Many Requests when exceeded
