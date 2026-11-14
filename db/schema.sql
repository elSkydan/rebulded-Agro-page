-- ============================================================
--  schema.sql  —  Lead Distribution System
--  PostgreSQL 14+
--
--  Single source of truth for new installs AND existing DBs.
--  Applied by: npm run db:migrate  (scripts/migrate.js)
--
--  IDEMPOTENT: safe to re-run on an existing database.
--    • CREATE TYPE  wrapped in DO blocks (no IF NOT EXISTS in PG)
--    • ENUM catch-up via ALTER TYPE ... ADD VALUE IF NOT EXISTS
--    • CREATE TABLE / INDEX uses IF NOT EXISTS
--    • Missing columns via ADD COLUMN IF NOT EXISTS
--    • Trigger uses CREATE OR REPLACE (PG14+)
--
--  Legacy upgrade scripts under db/ (lead_assignments.sql,
--  migrate_service_types.sql, add_comment_column.sql) are no
--  longer part of the deploy path — their changes live here.
-- ============================================================

-- ── ENUMS ────────────────────────────────────────────────────
-- CREATE TYPE does not support IF NOT EXISTS; use DO blocks instead.

DO $$ BEGIN
  CREATE TYPE delivery_type_enum AS ENUM ('fixed', 'per_km');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE equipment_type_enum AS ENUM ('motoblock', 'tractor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_type_enum AS ENUM ('ogorod', 'celina', 'mowing', 'tree', 'washing', 'drilling');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Catch up pre-v2 DBs whose service_type_enum was created with fewer values.
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'mowing';
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'tree';
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'washing';
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'drilling';

DO $$ BEGIN
  CREATE TYPE lead_status_enum AS ENUM (
    'new',
    'assigned',
    'accepted',
    'rejected',
    'timeout',
    'completed',
    'canceled',
    'unassigned',
    'failed_contact'   -- accepted but no action within accepted_ttl
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status_enum AS ENUM (
    'sent',
    'accepted',
    'rejected',
    'timeout'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── CITIES ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cities (
  id                    SERIAL          PRIMARY KEY,
  name                  VARCHAR(100)    NOT NULL,
  delivery_type         delivery_type_enum  NOT NULL DEFAULT 'fixed',
  delivery_price        NUMERIC(10, 2)  NOT NULL DEFAULT 0
                          CHECK (delivery_price >= 0),
  base_radius           NUMERIC(6, 2)   CHECK (base_radius > 0),
  -- removed current_worker_index: replaced by last_assigned_at ordering
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cities_name ON cities (LOWER(name));

-- ── WORKERS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workers (
  id                    SERIAL              PRIMARY KEY,
  name                  VARCHAR(100)        NOT NULL,
  phone                 VARCHAR(20),
  telegram_chat_id      BIGINT              UNIQUE NOT NULL,
  city_id               INT                 NOT NULL
                          REFERENCES cities (id) ON DELETE RESTRICT,
  equipment_type        equipment_type_enum NOT NULL DEFAULT 'motoblock',
  is_active             BOOLEAN             NOT NULL DEFAULT TRUE,
  last_assigned_at      TIMESTAMPTZ,        -- NULL = never assigned (highest priority in queue)
  priority              INT                 NOT NULL DEFAULT 0
                          CHECK (priority >= 0),
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- pickWorker: city + active filter, then priority / round-robin order
DROP INDEX IF EXISTS idx_workers_city_active;
CREATE INDEX IF NOT EXISTS idx_workers_city_priority
  ON workers (city_id, priority DESC, last_assigned_at ASC NULLS FIRST)
  WHERE is_active = TRUE;

-- telegram_chat_id already has a UNIQUE btree index — no separate idx needed.
DROP INDEX IF EXISTS idx_workers_telegram;

-- ── LEADS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id                    SERIAL              PRIMARY KEY,
  name                  VARCHAR(100),
  phone_normalized      VARCHAR(15)         NOT NULL,  -- always +380XXXXXXXXX
  phone_raw             VARCHAR(30)         NOT NULL,
  service_type          service_type_enum   NOT NULL,
  area                  NUMERIC(5, 1)       NOT NULL
                          CHECK (area >= 0.5 AND area <= 50),
  total_price           NUMERIC(10, 2)      NOT NULL
                          CHECK (total_price >= 1500),
  city_id               INT                 NOT NULL
                          REFERENCES cities (id) ON DELETE RESTRICT,
  worker_id             INT
                          REFERENCES workers (id) ON DELETE SET NULL,
  status                lead_status_enum    NOT NULL DEFAULT 'new',
  last_sent_worker_id   INT
                          REFERENCES workers (id) ON DELETE SET NULL,
  out_of_city           BOOLEAN             NOT NULL DEFAULT FALSE,
  comment               TEXT,                          -- optional client note
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Anti-spam: find duplicate by phone in last N minutes
CREATE INDEX IF NOT EXISTS idx_leads_phone_created ON leads (phone_normalized, created_at DESC);

-- Timeout cron: find assigned/accepted leads past their deadline
CREATE INDEX IF NOT EXISTS idx_leads_status_updated ON leads (status, updated_at)
  WHERE status IN ('assigned', 'accepted');

-- pickWorker active-lead count: worker_id + status IN ('assigned','accepted')
DROP INDEX IF EXISTS idx_leads_worker;
CREATE INDEX IF NOT EXISTS idx_leads_worker_active
  ON leads (worker_id)
  WHERE status IN ('assigned', 'accepted');

-- No current query filters leads by city_id alone (FK covers integrity).
DROP INDEX IF EXISTS idx_leads_city;

-- ── LEAD_ASSIGNMENTS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_assignments (
  id                    SERIAL                  PRIMARY KEY,
  lead_id               INT                     NOT NULL
                          REFERENCES leads (id) ON DELETE CASCADE,
  worker_id             INT                     NOT NULL
                          REFERENCES workers (id) ON DELETE CASCADE,
  status                assignment_status_enum  NOT NULL DEFAULT 'sent',
  -- Telegram message_id for later editing (populated after send)
  message_id            BIGINT,
  -- Timestamp when worker pressed Accept or Reject
  responded_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- Prevent sending the same lead to the same worker twice.
-- Also covers lookups by lead_id (replaces former idx_la_lead).
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_assignments_lead_worker
  ON lead_assignments (lead_id, worker_id);

-- DB-level guarantee: at most ONE accepted assignment per lead.
-- Concurrent transactions that both try to mark 'accepted' will serialize;
-- the second one gets a unique violation (PG code 23505) and rolls back.
-- acceptLead() in assignmentService catches 23505 and returns { result: 'already_taken' }.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_assignments_lead_accepted
  ON lead_assignments (lead_id)
  WHERE (status = 'accepted');

-- Drop superseded short names / redundant lead_id-only index.
DROP INDEX IF EXISTS idx_la_lead;
DROP INDEX IF EXISTS uq_la_lead_worker;
DROP INDEX IF EXISTS uq_la_lead_accepted;

-- ── TRIGGER: auto-update leads.updated_at ────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- CREATE OR REPLACE TRIGGER requires PostgreSQL 14+
CREATE OR REPLACE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── EXISTING-DB COLUMN CATCH-UP ──────────────────────────────
-- CREATE TABLE IF NOT EXISTS does not add columns to old tables.
-- These statements are no-ops when the column already exists.

ALTER TABLE lead_assignments
  ADD COLUMN IF NOT EXISTS message_id BIGINT;

ALTER TABLE lead_assignments
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS comment TEXT;

-- Raise global min-order floor (existing DBs keep the old inline CHECK name)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_total_price_check;
ALTER TABLE leads ADD CONSTRAINT leads_total_price_check CHECK (total_price >= 1500);

-- Integrity: «unassigned» / «new» means no current worker (stale worker_id confused admin UI).
UPDATE leads SET worker_id = NULL WHERE status IN ('unassigned', 'new') AND worker_id IS NOT NULL;
