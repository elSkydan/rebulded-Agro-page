# BusinessLogic.md — Full Business Logic Documentation

> **Basis:** BUSINESS_LOGIC.md + main.js (pricing) + .env (config values)  
> **Domain:** Ukrainian agricultural services marketplace (Агро Сервіс)

---

## 1. Lead Lifecycle

### State Machine

```
                    ┌──────────────────────────────────────────────────────┐
                    │                                                      │
         [Client submits form]                                             │
                    │                                                      │
                    ▼                                                      │
                  'new'                                                    │
                    │                                                      │
         [assignmentService]                                               │
                    │                                                      │
         ┌──────────┴──────────┐                                          │
         │                     │                                          │
         ▼                     ▼                                          │
    'assigned'           'unassigned' ◄─── all workers rejected/inactive  │
         │                                                                │
    ┌────┼────────────────────────┐                                       │
    │    │                        │                                       │
    │    ▼                        ▼                                       │
    │ [Worker accepts]    [No response in 3 min]                          │
    │    │                        │                                       │
    │    │                 [reassign to next]                             │
    │    │                        │                                       │
    │    │                ┌───────┴──────────┐                            │
    │    │                │                  │                            │
    │    │           'assigned'        'unassigned'                       │
    │    │           (next worker)                                        │
    │    │                                                                │
    │    ▼                                                                │
    │ 'accepted'                                                          │
    │    │                                                                │
    │    ├──── [Work completed] ──────────────────────────► 'completed'  │
    │    │                                                                │
    │    └──── [No contact in 30 min] ──────────────────► 'failed_contact'│
    │                                                                     │
    ├── [Worker rejects] → reassign loop (same as timeout)               │
    │                                                                     │
    └── [Admin cancels] ────────────────────────────────────► 'canceled' ┘
```

### Status Definitions

| Status | Meaning | Next States |
|--------|---------|-------------|
| `new` | Just submitted, pending assignment | `assigned`, `unassigned` |
| `assigned` | Sent to a worker via Telegram | `accepted`, `rejected`, `timeout`, `canceled` |
| `accepted` | Worker confirmed they'll go | `completed`, `failed_contact`, `canceled` |
| `completed` | Job done, payment received | Terminal |
| `rejected` | Worker declined | → reassignment → `assigned` or `unassigned` |
| `unassigned` | No workers available | `assigned` (manual), Terminal |
| `timeout` | Worker didn't respond in time | → reassignment |
| `failed_contact` | Accepted but no contact in 30 min | Terminal |
| `canceled` | Admin cancelled | Terminal |

---

## 2. Assignment Flow

### Worker Selection Algorithm
```
SELECT workers
WHERE city_id = lead.city_id
  AND is_active = true
  AND id NOT IN (
      SELECT worker_id FROM lead_assignments WHERE lead_id = ?
  )
  AND (
      SELECT COUNT(*) FROM leads
      WHERE worker_id = workers.id AND status IN ('assigned','accepted')
  ) < ACTIVE_LEAD_LIMIT  -- default: 3
ORDER BY
    priority DESC,         -- higher priority workers get leads first
    last_assigned_at ASC   -- among equal priority, least recently used first
LIMIT 1
FOR UPDATE                 -- prevents race condition with concurrent assignments
```

**Priority system (1-10):**
- Higher value = assigned first
- Allows manual business preference (e.g., more reliable worker gets priority 10)
- Among same priority: round-robin via `last_assigned_at`

**ACTIVE_LEAD_LIMIT (default: 3):**
- A worker is skipped if they already have 3+ active (assigned or accepted) leads
- Prevents overloading a single worker

### Race Condition Protection
- `BEGIN TRANSACTION` + `SELECT ... FOR UPDATE` on the lead row
- Ensures only one process assigns a lead at a time
- `FOR UPDATE SKIP LOCKED` in timeout cron: avoids blocking assignment service

---

## 3. Pricing Model

### Service Types & Rates (UAH — Ukrainian Hryvnia)

| Service | Ukrainian Name | Rate | Minimum |
|---------|---------------|------|---------|
| `ogorod` | Вспашка городу | 300 грн/сотка | 1000 грн (global min) |
| `celina` | Цілина | 600 грн/сотка | 1800 грн |
| `mowing` | Покос | 200 грн/сотка | 200 грн |
| `tree` | Свердління лунок | 500 грн flat | — |
| `washing` | Мийка техніки | 250 грн flat | — |

**Out-of-city surcharge:** +800 грн  
**Global minimum order:** 1000 грн

### Formula
```
base_price = service_rate(type, area)
if out_of_city: base_price += 800
final_price = max(base_price, 1000)
```

**⚠️ Critical:** Pricing constants exist in TWO places:
1. `main.js` (frontend calculator — shown to user before submit)
2. `pricingService.js` (backend — stored in DB)

If they diverge, user sees one price but DB stores another. **Both must be updated together.**

---

## 4. Timeout Logic

### Timeout 1: Assignment Timeout (TIMEOUT_MINUTES = 3)
- **Trigger:** Lead is `assigned` AND `updated_at < NOW() - 3 minutes`
- **Action:** Reassign to next available worker
- **If no worker:** Mark as `unassigned`
- **Cron frequency:** Every 60 seconds (may be up to 60s late)
- **Effective timeout:** 3–4 minutes (3 min config + up to 60s cron delay)

### Timeout 2: Accepted Lead Expiry (ACCEPTED_TTL_MINUTES = 30)
- **Trigger:** Lead is `accepted` AND `updated_at < NOW() - 30 minutes`
- **Action:** Mark as `failed_contact`
- **Meaning:** Worker accepted but never actually contacted or completed

### Cron Schedule
```javascript
// node-cron: every minute
cron.schedule('* * * * *', () => timeoutService.checkTimeouts());
```

---

## 5. Worker Lifecycle

### States
- **Active (`is_active = true`):** Eligible to receive leads
- **Inactive (`is_active = false`):** Skipped in assignment queries; existing leads unaffected

### Activation Events
- Admin creates worker → active by default
- Admin sets `is_active = false` → deactivated immediately
- In-progress leads (assigned/accepted) remain with deactivated worker until resolved

### Worker Registration (Missing Feature)
- Workers must have `telegram_chat_id` set in DB to receive notifications
- **Currently:** No self-registration flow exists
- **Required:** Admin adds worker via API OR worker sends `/start` to bot to auto-register

---

## 6. Anti-Spam Logic

### Phone Normalization
```
Input:  "0679020326"           → "+380679020326"
Input:  "+38(067)902-03-26"    → "+380679020326"
Input:  "380679020326"         → "+380679020326"
Input:  "+380679020326"        → "+380679020326"

Steps:
1. Strip all non-digit characters
2. If starts with '380': prepend '+'
3. If starts with '0': replace with '+380'
4. Validate: must be +380XXXXXXXXX (13 digits total)
```

### Duplicate Detection (SPAM_WINDOW_MINUTES = 10)
```sql
SELECT * FROM leads
WHERE phone_normalized = $1
  AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 1
```

**If duplicate found:**
- Status `new` or `assigned` → UPDATE existing lead (don't create new)
- Status is terminal (completed, canceled, etc.) → INSERT new lead
- Returns existing lead info to frontend

---

## 7. Telegram Interaction Inside Business Flow

```
Lead Submission ──► pricingService.calculatePrice()
                 ──► DB INSERT lead (status='new')
                 ──► assignmentService.assignLead()
                         ──► DB SELECT worker (FOR UPDATE)
                         ──► DB INSERT lead_assignment
                         ──► DB UPDATE lead (status='assigned')
                         ──► telegramService.sendLeadNotification()
                                 ──► Telegram API: sendMessage + InlineKeyboard
                                 ──► Worker receives notification

Worker taps Accept ──► POST /api/telegram/webhook
                    ──► Validate chat_id ownership
                    ──► DB UPDATE lead (status='accepted')
                    ──► Telegram API: answerCallbackQuery

Worker taps Reject ──► POST /api/telegram/webhook
                    ──► DB UPDATE lead_assignment (status='rejected')
                    ──► assignmentService.assignLead() [next worker]
                    ──► telegramService.sendLeadNotification() [next worker]
                    ──► Telegram API: answerCallbackQuery

Timeout fires      ──► timeoutService.checkTimeouts()
                    ──► DB SELECT stale assigned leads (SKIP LOCKED)
                    ──► assignmentService.reassignLead()
                    ──► telegramService.sendLeadNotification() [next worker]
                    [Previous worker's message still shows buttons — stale]
```

---

## 8. Edge Cases

| Scenario | System Behavior |
|----------|----------------|
| Client submits, no workers in that city | Lead created → status=`unassigned`; no Telegram sent |
| All workers for city are at ACTIVE_LEAD_LIMIT | Lead → `unassigned` |
| Worker deactivated while lead is assigned to them | Cron: reassignment skips deactivated; lead → `unassigned` if all inactive |
| Same phone submits twice within 10 min | Second submission updates existing lead (no new row) |
| Worker taps buttons on expired/reassigned lead | Status transition validation rejects; `answerCallbackQuery` with error |
| Admin cancels an `accepted` lead | DB: status=`canceled`; worker not notified (currently) |
| Telegram API down during assignment | Assignment succeeds in DB, notification lost; lead stays `assigned` until timeout |
| Two admins concurrently reassign same lead | `FOR UPDATE` lock prevents double assignment |
| Worker has no `telegram_chat_id` | Assignment proceeds but notification silently skipped |
| TIMEOUT_MINUTES=0 | All assigned leads immediately expire on next cron — **DANGEROUS** |
| Lead is `accepted` and worker manually marks complete | No completion endpoint specified in current design; admin must do via API |
