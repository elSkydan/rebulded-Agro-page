-- ============================================================
--  lead_assignments.sql  —  Additive migration
--  Run AFTER schema.sql (table already exists).
--  IDEMPOTENT: IF NOT EXISTS / IF EXISTS guards on every statement.
--
--  New installs using the updated schema.sql already include all
--  columns and indexes defined here — this file is safe to re-run
--  and serves as an upgrade path for pre-migration databases.
--
--  Adds:
--    1. message_id    — Telegram message_id for later editing
--    2. responded_at  — timestamp when worker pressed a button
--    3. uq_la_lead_accepted — partial unique index: only ONE accepted per lead
--
--  Dependencies:
--    • lead_assignments table must exist (schema.sql step 1)
--    • assignment_status_enum must include 'accepted' (schema.sql step 1)
-- ============================================================

-- 1. Track the Telegram message sent to each worker so we can
--    edit it after accept/reject/timeout.
ALTER TABLE lead_assignments
  ADD COLUMN IF NOT EXISTS message_id BIGINT;

-- 2. Record when a worker responded (NULL = not yet responded).
ALTER TABLE lead_assignments
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- 3. Database-level guarantee: at most one accepted assignment
--    per lead.  Concurrent transactions that both try to mark
--    'accepted' will serialize; the second will get a unique
--    violation (PG error code 23505) and roll back.
--    acceptLead() in assignmentService catches 23505 gracefully.
--
--    NOTE: assignment_status_enum uses 'sent' (≡ 'pending') and
--    'accepted'. The constraint guards the 'accepted' state only.
CREATE UNIQUE INDEX IF NOT EXISTS uq_la_lead_accepted
  ON lead_assignments (lead_id)
  WHERE (status = 'accepted');
