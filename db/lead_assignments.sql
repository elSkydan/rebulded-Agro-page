-- ============================================================
--  DEPRECATED — kept for manual upgrades of pre-v2 databases.
--  Prefer: npm run db:migrate  (applies db/schema.sql)
--
--  Everything below is already included in schema.sql.
--  Safe to re-run (idempotent).
-- ============================================================

ALTER TABLE lead_assignments
  ADD COLUMN IF NOT EXISTS message_id BIGINT;

ALTER TABLE lead_assignments
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_assignments_lead_accepted
  ON lead_assignments (lead_id)
  WHERE (status = 'accepted');

DROP INDEX IF EXISTS uq_la_lead_accepted;
