# Architecture.md — Агро Сервіс System Architecture

> **Analysis date:** 2026-05-03  
> **Basis:** Existing code (server.js, main.js, index.html, package.json, .env, BUSINESS_LOGIC.md, PROJECT_STRUCTURE.md)  
> **Status note:** Frontend = COMPLETE. Backend routes/services/DB = DOCUMENTED but NOT YET IMPLEMENTED.

---

## 1. System Type

**Modular Monolith** (planned architecture).  
- Single Node.js/Express process serves both static frontend and API.  
- Services are logically separated (assignmentService, pricingService, etc.) but run in the same process.  
- No microservices, no separate frontend server — static files served from root via Express.

---

## 2. Product Role

Lead Aggregator / Marketplace (B2C → B2B):
- **Clients (consumers):** Submit service requests (plowing, mowing, etc.) via landing page form.
- **Workers (operators):** Receive leads via Telegram, accept or reject.
- **Admin:** Manages workers, cities, lead statuses via protected API.

Domain: Ukrainian agricultural machinery services (Вспашка/Ogorod, Целина/Celina, Покос/Mowing, Свердління/Tree holes, Мийка/Washing).

---

## 3. Folder Structure (Planned vs Actual)

```
agroagriggator_v2/
│
├── index.html          ✅ IMPLEMENTED — Full landing page & lead form
├── main.js             ✅ IMPLEMENTED — Frontend JS (calculator, form, UI)
├── style.css           ✅ IMPLEMENTED — Custom CSS (Tailwind + overrides)
├── server.js           ✅ IMPLEMENTED — Express entry point (routes imported, cron started)
├── package.json        ✅ IMPLEMENTED
├── .env                ✅ EXISTS (credentials present, placeholders for bot token)
├── README.md           ✅ EXISTS
├── BUSINESS_LOGIC.md   ✅ EXISTS — Full behavioral specification
├── PROJECT_STRUCTURE.md ✅ EXISTS — File layout decisions
│
├── db/
│   ├── pool.js         ❌ NOT CREATED — pg Pool singleton
│   ├── schema.sql      ❌ NOT CREATED — Table definitions
│   ├── seed.sql        ❌ NOT CREATED — Test data
│   └── migrations/     ❌ NOT CREATED
│
├── server/
│   ├── routes/
│   │   ├── leads.js    ❌ NOT CREATED
│   │   ├── workers.js  ❌ NOT CREATED
│   │   ├── cities.js   ❌ NOT CREATED
│   │   └── telegram.js ❌ NOT CREATED
│   │
│   ├── services/
│   │   ├── assignmentService.js  ❌ NOT CREATED
│   │   ├── pricingService.js     ❌ NOT CREATED
│   │   ├── telegramService.js    ❌ NOT CREATED
│   │   └── timeoutService.js     ❌ NOT CREATED
│   │
│   └── middlewares/
│       ├── auth.js         ❌ NOT CREATED
│       ├── validateLead.js ❌ NOT CREATED
│       └── rateLimiter.js  ❌ NOT CREATED
│
└── docs/               ✅ CREATED (this analysis output)
```

**Critical Gap:** `server.js` imports routes and services that do not yet exist. Running `npm start` will throw `MODULE_NOT_FOUND` errors.

---

## 4. Module Boundaries

| Module | Responsibility | Status |
|--------|---------------|--------|
| Frontend (index.html + main.js) | UI, calculator, form submission | ✅ Complete |
| Express server (server.js) | HTTP routing, CORS, static files, cron init | ✅ Complete (import stubs broken) |
| Routes | HTTP endpoint handlers | ❌ Not built |
| Services | Business logic (assignment, pricing, timeout, telegram) | ❌ Not built |
| DB layer (db/pool.js) | PostgreSQL connection pool | ❌ Not built |
| Middlewares | Auth, validation, rate limiting | ❌ Not built |

---

## 5. Data Flow — Request Lifecycle

### Lead Submission (Client → System)
```
Browser Form Submit
    └─► POST /api/leads
            └─► rateLimiter middleware (5 req/min/IP)
            └─► validateLead middleware (phone, city, service)
            └─► leads.js route handler
                    └─► pricingService.calculatePrice(service, area, outOfCity)
                    └─► [DB] Phone normalization & spam check
                    └─► [DB] INSERT lead (status='new')
                    └─► assignmentService.assignLead(lead_id)
                            └─► [DB] SELECT worker (priority DESC, last_assigned ASC, FOR UPDATE)
                            └─► [DB] INSERT lead_assignment
                            └─► [DB] UPDATE lead status='assigned', worker_id=X
                            └─► telegramService.sendLeadNotification(worker, lead)
                                    └─► Telegram Bot API (sendMessage + inline buttons)
            └─► HTTP 201 {lead_id, status, estimated_price}
```

### Worker Response (Telegram → System)
```
Worker taps button in Telegram
    └─► Telegram sends callback_query to webhook
    └─► POST /api/telegram/webhook
            └─► Parse callback data {l: lead_id, w: worker_id, a: action}
            └─► Verify worker telegram_chat_id matches
            └─► assignmentService.updateStatus(lead_id, worker_id, action)
            └─► telegramService.answerCallbackQuery(...)
```

### Timeout (Cron → System)
```
Every 60 seconds (node-cron):
    └─► timeoutService.checkTimeouts()
            └─► [DB] SELECT assigned leads > 3 min old (FOR UPDATE SKIP LOCKED)
            └─► For each: assignmentService.reassignLead(lead_id)
                    └─► If next worker exists: notify via Telegram
                    └─► Else: UPDATE lead status='unassigned'
            └─► [DB] SELECT accepted leads > 30 min old
            └─► UPDATE status='failed_contact'
```

---

## 6. Integration Points

| System | Protocol | Direction | Status |
|--------|----------|-----------|--------|
| PostgreSQL | TCP (pg driver) | Backend ↔ DB | DB not created |
| Telegram Bot API | HTTPS (webhook) | Bidirectional | Token placeholder in .env |
| Browser (frontend) | HTTP/HTTPS | Client → Backend | Working (static served) |
| Admin API | HTTP Bearer Token | Admin → Backend | Not implemented |

---

## 7. Configuration Model

All config via `.env`:

| Variable | Purpose | Current Value |
|----------|---------|---------------|
| `DATABASE_URL` | PostgreSQL connection | `postgres://postgres:SkydG1488!@localhost:5432/lead_distribution` |
| `TELEGRAM_BOT_TOKEN` | Bot API key | Placeholder |
| `ADMIN_CHAT_ID` | Admin Telegram ID | Placeholder |
| `ADMIN_TOKEN` | Bearer auth for admin API | Placeholder |
| `PORT` | HTTP port | 3000 |
| `TIMEOUT_MINUTES` | Lead assignment timeout | 3 |
| `ACCEPTED_TTL_MINUTES` | Accepted lead expiry | 30 |
| `SPAM_WINDOW_MINUTES` | Duplicate phone window | 10 |
| `ACTIVE_LEAD_LIMIT` | Max leads per worker | 3 |
| `RATE_LIMIT_MAX` | Max requests per window | 5 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 60000 (1 min) |
