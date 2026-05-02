-- ============================================================
--  lead_assignments.sql  —  Additive migration
--  Run AFTER schema.sql (table already exists).
--  Safe to re-run: IF NOT EXISTS / IF EXISTS guards everywhere.
--
--  Changes:
--    1. Add message_id  — Telegram message_id for later editing
--    2. Add responded_at — timestamp when worker pressed a button
--    3. Add partial unique index — only ONE accepted per lead
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
--    violation and roll back.
--
--    NOTE: assignment_status_enum uses 'sent' (≡ 'pending') and
--    'accepted'. The constraint guards the 'accepted' state only.
CREATE UNIQUE INDEX IF NOT EXISTS uq_la_lead_accepted
  ON lead_assignments (lead_id)
  WHERE (status = 'accepted');
