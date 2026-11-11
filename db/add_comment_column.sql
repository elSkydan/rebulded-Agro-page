-- ============================================================
--  DEPRECATED — kept for manual upgrades of pre-v2 databases.
--  Prefer: npm run db:migrate  (applies db/schema.sql)
--
--  Everything below is already included in schema.sql.
--  Safe to re-run (idempotent).
-- ============================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS comment TEXT;
