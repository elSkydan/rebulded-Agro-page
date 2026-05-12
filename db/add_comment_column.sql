-- ============================================================
--  add_comment_column.sql  —  Additive migration
--  Run AFTER schema.sql.
--  IDEMPOTENT: ADD COLUMN IF NOT EXISTS guard.
--
--  Adds: leads.comment — optional free-text note from the client.
--
--  New installs using the updated schema.sql already include this
--  column — this file is safe to re-run and serves as an upgrade
--  path for existing databases created before this change.
-- ============================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS comment TEXT;
