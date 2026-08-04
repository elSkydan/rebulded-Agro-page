# Project Structure — Production-Ready MVP

```
/
├── server.js                        # Entry point: Express app factory + app.listen + CORS +
│                                     # Swagger UI mount + error handlers + graceful shutdown + cron start
│
├── server/
│   ├── routes/
│   │   ├── leads.js                 # POST /leads (public), GET /leads, GET /leads/:id,
│   │   │                            # GET /leads/debug/stats, PATCH /leads/:id/cancel (admin)
│   │   ├── workers.js               # CRUD workers (admin)
│   │   ├── cities.js                # CRUD cities + delivery config (admin)
│   │   └── telegram.js              # POST /webhook (Telegram callback_query handler)
│   │
│   ├── services/
│   │   ├── assignmentService.js     # Worker selection + state machine + assign/reassign/
│   │   │                            # accept/reject transactions
│   │   ├── distributionService.js   # Fan-out (multi-worker) distribution — implemented but
│   │   │                            # NOT wired into any route; kept intentionally inactive
│   │   ├── pricingService.js        # calcPrice() — server is single source of truth
│   │   ├── telegramService.js       # Class-based outbound Telegram delivery: retries,
│   │   │                            # per-error-code handling, BigInt chat_id safety
│   │   └── timeoutService.js        # node-cron: reassign timed-out / stale leads
│   │
│   ├── middlewares/
│   │   ├── auth.js                  # Admin Bearer token check (timing-safe compare)
│   │   ├── rateLimiter.js           # 5 req/min/IP on POST /leads
│   │   └── validateLead.js          # Input validation + phone normalization
│   │
│   ├── repositories/
│   │   └── leadAssignmentRepository.js  # Query helpers used by distributionService
│   │
│   ├── utils/
│   │   └── pgLeadError.js           # Maps PG error codes (enum mismatch, check violation) to HTTP
│   │
│   └── swagger.js                   # Full OpenAPI 3.0 spec, served at GET /api-docs
│
├── db/
│   ├── schema.sql                   # Full CREATE TABLE — idempotent, source of truth for new installs
│   ├── pool.js                      # pg Pool singleton (SSL in production)
│   ├── lead_assignments.sql         # Legacy additive migration (pre-v2 DBs only — schema.sql
│   │                                # already includes these columns/indexes on fresh installs)
│   ├── migrate_service_types.sql    # Legacy additive migration (pre-v2 DBs only)
│   └── add_comment_column.sql       # Legacy additive migration (pre-v2 DBs only)
│
├── config/
│   ├── config.js                    # All tunable constants, exported (not raw .env access elsewhere)
│   └── validateEnv.js               # Fail-fast startup validation — process.exit(1) on bad config
│
├── scripts/
│   ├── migrate.js                   # Applies db/schema.sql — run before server start on every deploy
│   ├── telegram-setup.js            # Registers the Telegram webhook (needs PUBLIC_BASE_URL)
│   └── telegram-webhook-info.js     # Inspects current webhook registration
│
├── test/                            # node --test — services, validation, Telegram delivery, env
│
├── frontend/                        # Next.js 16 / React 19 / Tailwind 4 — separate app, own package.json
│   ├── src/
│   │   ├── app/                     # App Router — multi-page site, one folder per route
│   │   │   ├── page.tsx             # Home (hub): Hero + HowWeWork + ExploreMore teaser cards
│   │   │   ├── services/page.tsx    # /services — Services grid + ServicesFaq (FAQPage JSON-LD)
│   │   │   ├── works/page.tsx       # /works — before/after gallery
│   │   │   ├── pricing/page.tsx     # /pricing — Calculator + LeadForm
│   │   │   ├── contacts/page.tsx    # /contacts — phone, hours, service area
│   │   │   ├── layout.tsx           # Root layout: fonts, metadata, LocalBusiness JSON-LD
│   │   │   ├── opengraph-image.tsx  # Generated OG/Twitter share image (next/og)
│   │   │   ├── robots.ts, sitemap.ts
│   │   ├── components/
│   │   │   ├── layout/              # Navbar, Footer, Breadcrumbs (visible + BreadcrumbList JSON-LD)
│   │   │   └── sections/            # Hero, Services, ServicesFaq, HowWeWork, ExploreMore, Contacts,
│   │   │       └ works/, pricing/   # Works/BeforeAfterCard, pricing/(Calculator, LeadForm, PricingSection)
│   │   └── lib/
│   │       ├── api.ts               # createLead() — calls /api/leads via same-origin proxy
│   │       ├── pricing.ts           # Client-side price preview — mirrors pricingService.js for UX only
│   │       ├── config.ts            # Site config (default city id, contact info)
│   │       └── content.ts           # Static copy: SERVICE_CARDS, FAQ_ITEMS, NAV_LINKS (routes, not anchors), etc.
│   └── next.config.ts               # output: 'standalone'; rewrites /api/:path* → BACKEND_URL; images.remotePatterns
│
├── .env / .env.example              # DB_URL, TELEGRAM_TOKEN, ADMIN_TOKEN (git-ignored)
├── render.yaml                      # Render Blueprint: managed Postgres + Node web service
├── package.json
└── .gitignore
```

## Key decisions

- `server.js` is a single file that both builds and starts the Express app (no separate `main.js`/`server.js` split) — kept simple for this scale; integration tests currently exercise services directly rather than through a bound HTTP server.
- `admin.js`-style merging: workers and cities are still split into their own route files (`workers.js`, `cities.js`) rather than one combined admin router — each stays small enough on its own.
- `config/config.js` centralises all magic numbers: `TIMEOUT_MINUTES`, `SPAM_WINDOW_MINUTES`, `RATE_LIMIT_MAX`, `ACCEPTED_TTL_MINUTES`, `ACTIVE_LEAD_LIMIT`. No hardcoded values inside services.
- No repository/DAO layer except `leadAssignmentRepository.js` (used only by the inactive `distributionService.js`) — direct `pool.query()` inside services/routes is acceptable for this scale.
- `db/lead_assignments.sql`, `db/migrate_service_types.sql`, `db/add_comment_column.sql` are **not** part of the fresh-install path (`scripts/migrate.js` only runs `schema.sql`, which already contains everything). They exist solely as an upgrade path for databases created before these columns/enum values were added to `schema.sql`.
- The old vanilla-JS landing page (`index.html` / `main.js` / `style.css` at repo root) has been removed — it predated and was superseded by the Next.js app in `frontend/`, and was never served by `server.js`.
- `frontend/` and the backend are independently deployable; they communicate only over HTTP (`/api/*` proxy in dev, `BACKEND_URL` env var in production).
- The frontend was split from a single-page landing into a multi-page site (Home, `/services`, `/works`, `/pricing`, `/contacts`) for SEO — each page targets its own keyword cluster and gets its own `metadata`/canonical/`BreadcrumbList` JSON-LD instead of one page trying to rank for everything. Home stays a lightweight hub (`ExploreMore` teaser cards) rather than duplicating the full content of each page, to avoid duplicate-content signals.
