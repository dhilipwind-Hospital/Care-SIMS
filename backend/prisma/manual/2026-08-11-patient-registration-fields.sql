-- Registration fields that were collected but had nowhere to go.
--
-- The registration form collected Middle Name, Marital Status, ID Type and
-- Payment Mode, and CreatePatientDto accepted all four — so they passed
-- validation with no error and were then silently discarded, because the
-- patients table had no columns for them. Staff were typing data that vanished.
--
-- All four are nullable, so Postgres adds them without rewriting the table and
-- every existing row stays valid. IF NOT EXISTS makes this safe to re-run.
--
-- Apply: npx prisma db execute --file prisma/manual/2026-08-11-patient-registration-fields.sql --schema prisma/schema.prisma

ALTER TABLE patients ADD COLUMN IF NOT EXISTS middle_name    TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS id_type        TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS payment_mode   TEXT;
