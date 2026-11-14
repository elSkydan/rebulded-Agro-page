-- ============================================================
--  DEPRECATED — kept for manual upgrades of pre-v2 databases.
--  Prefer: npm run db:migrate  (applies db/schema.sql)
--
--  Everything below is already included in schema.sql.
--  Safe to re-run (idempotent) — IF NOT EXISTS (PostgreSQL 9.1+ / 14+).
-- ============================================================

ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'mowing';
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'tree';
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'washing';
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'drilling';
