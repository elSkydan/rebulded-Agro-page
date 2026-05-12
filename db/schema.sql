-- ============================================================
--  schema.sql  —  Lead Distribution System
--  PostgreSQL 14+
--
--  IDEMPOTENT: safe to re-run on an existing database.
--    • CREATE TYPE  wrapped in DO blocks (no IF NOT EXISTS in PG)
--    • CREATE TABLE uses IF NOT EXISTS
--    • CREATE INDEX uses IF NOT EXISTS
--    • Trigger uses CREATE OR REPLACE (PG14+)
--
--  Run order:
--    1. schema.sql         (base tables + columns)
--    2. lead_assignments.sql  (extra columns + unique index — idempotent)
--    3. migrate_service_types.sql  (only needed for existing pre-v2 DBs)
--    4. add_comment_column.sql     (adds leads.comment)
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
  CREATE TYPE service_type_enum AS ENUM ('ogorod', 'celina', 'mowing', 'tree', 'washing');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- Used by assignmentService: pick next eligible worker
CREATE INDEX IF NOT EXISTS idx_workers_city_active ON workers (city_id, is_active)
  WHERE is_active = TRUE;

-- Used by timeoutService + telegramService
CREATE INDEX IF NOT EXISTS idx_workers_telegram ON workers (telegram_chat_id);

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
                          CHECK (total_price >= 1000),
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

-- Timeout cron: find assigned leads past their deadline
CREATE INDEX IF NOT EXISTS idx_leads_status_updated ON leads (status, updated_at)
  WHERE status IN ('assigned', 'accepted');

-- Admin dashboard: filter by city or worker
CREATE INDEX IF NOT EXISTS idx_leads_city   ON leads (city_id);
CREATE INDEX IF NOT EXISTS idx_leads_worker ON leads (worker_id);

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

-- Used to skip already-tried workers during reassignment
CREATE INDEX IF NOT EXISTS idx_la_lead ON lead_assignments (lead_id);

-- Prevent sending the same lead to the same worker twice
CREATE UNIQUE INDEX IF NOT EXISTS uq_la_lead_worker ON lead_assignments (lead_id, worker_id);

-- DB-level guarantee: at most ONE accepted assignment per lead.
-- Concurrent transactions that both try to mark 'accepted' will serialize;
-- the second one gets a unique violation (PG code 23505) and rolls back.
-- acceptLead() in assignmentService catches 23505 and returns { result: 'already_taken' }.
CREATE UNIQUE INDEX IF NOT EXISTS uq_la_lead_accepted
  ON lead_assignments (lead_id)
  WHERE (status = 'accepted');

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
