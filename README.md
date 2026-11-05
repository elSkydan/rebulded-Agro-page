# Agro Aggregator — Setup & Run

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Create the database

```bash
createdb lead_distribution
psql lead_distribution < db/schema.sql
```

---

## 3. Configure environment

```bash
cp .env .env
```

Edit `.env` and set at minimum:

```
DATABASE_URL=postgres://user:password@localhost:5432/lead_distribution
TELEGRAM_BOT_TOKEN=your-token
ADMIN_CHAT_ID=your-chat-id
ADMIN_TOKEN=any-secret-string
```

---

## 4. Seed a test city and worker (optional)

```sql
INSERT INTO cities (name, delivery_type, delivery_price)
VALUES ('Kyiv', 'fixed', 200);

INSERT INTO workers (name, phone, telegram_chat_id, city_id, equipment_type)
VALUES ('Ivan Testov', '+380671234567', 123456789, 1, 'motoblock');
```

---

## 5. Start the server

```bash
npm start
# or with auto-restart on file changes (Node 18+):
npm run dev
```

Server starts at: http://localhost:3000

Health check: `GET /health`

---

## 6. Test POST /api/leads

### Minimal valid request

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Taras Shevchenko",
    "phone": "0671234567",
    "service_type": "ogorod",
    "area": 2,
    "city_id": 1,
    "out_of_city": false
  }'
```

### Expected response (201)

```json
{
  "lead_id": 1,
  "total_price": 1700,
  "status": "assigned",
  "assigned": true,
  "message": "Lead received. A specialist will contact you shortly."
}
```

### Celina, out of city

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0671234568",
    "service_type": "celina",
    "area": 5,
    "city_id": 1,
    "out_of_city": true
  }'
```

Expected price: `5 * 600 + 200 (delivery) = 3200`

### Validation error (missing phone)

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"service_type": "ogorod", "area": 2, "city_id": 1}'
```

### Get lead (admin)

```bash
curl http://localhost:3000/api/leads/1 \
  -H "Authorization: Bearer your-admin-token"
```

### Cancel lead (admin)

```bash
curl -X PATCH http://localhost:3000/api/leads/1/cancel \
  -H "Authorization: Bearer your-admin-token"
```

---

## File layout

```
/
├── server.js                       # Entry point: Express app, CORS, Swagger UI, boot, cron start
├── package.json
├── .env.example
├── render.yaml                     # Render Blueprint (API + managed Postgres)
│
├── config/
│   ├── config.js                   # All tunable constants (reads .env)
│   └── validateEnv.js              # Fail-fast startup env validation
│
├── db/
│   ├── schema.sql                  # Full CREATE TABLE — idempotent, source of truth
│   ├── pool.js                     # pg Pool singleton
│   ├── lead_assignments.sql        # Legacy upgrade path (pre-v2 DBs only)
│   ├── migrate_service_types.sql   # Legacy upgrade path (pre-v2 DBs only)
│   └── add_comment_column.sql      # Legacy upgrade path (pre-v2 DBs only)
│
├── server/
│   ├── routes/
│   │   ├── leads.js                # POST /leads, GET /leads, GET /leads/:id, PATCH /leads/:id/cancel
│   │   ├── workers.js              # Admin CRUD for workers
│   │   ├── cities.js               # Admin CRUD for cities
│   │   └── telegram.js             # POST /webhook (Telegram callback_query handler)
│   ├── services/
│   │   ├── assignmentService.js    # Worker selection, state machine, accept/reject/reassign
│   │   ├── distributionService.js  # Fan-out multi-worker distribution — NOT wired in, kept for future use
│   │   ├── pricingService.js       # calcPrice() — server is single source of truth
│   │   ├── telegramService.js      # Outbound Telegram delivery layer (class-based, retries)
│   │   └── timeoutService.js       # node-cron: reassign timed-out / stale leads
│   ├── middlewares/
│   │   ├── auth.js                 # Admin Bearer token check (timing-safe compare)
│   │   ├── rateLimiter.js          # 5 req/min/IP on POST /leads
│   │   └── validateLead.js         # Input validation + phone normalization
│   ├── repositories/
│   │   └── leadAssignmentRepository.js
│   ├── utils/
│   │   └── pgLeadError.js          # Maps PG error codes to HTTP responses
│   └── swagger.js                  # OpenAPI 3.0 spec, served at /api-docs
│
├── scripts/
│   ├── migrate.js                  # Applies db/schema.sql (idempotent)
│   ├── telegram-setup.js           # Registers the Telegram webhook
│   └── telegram-webhook-info.js
│
├── test/                           # node --test suite (services + validation)
│
└── frontend/                       # Next.js 16 app — multi-page site (Home, Services, Works, Pricing, Contacts)
    └── src/
        ├── app/                    # App Router: page.tsx (home hub) + services/, works/, pricing/, contacts/
        ├── components/             # sections/, layout/ (incl. Breadcrumbs)
        └── lib/                    # api.ts, pricing.ts (client-side price preview), config.ts, content.ts
```

Note: `frontend/` is a separate Next.js app with its own `package.json`; it proxies `/api/*` to this backend (see `frontend/next.config.ts`) and is deployed independently.
