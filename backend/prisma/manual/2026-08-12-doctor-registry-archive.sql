-- Archive flag for the global doctor registry.
--
-- Registry entries are shared across every organization and are referenced by
-- prescriptions, lab orders, referrals and OT bookings via bare doctor_id
-- strings with no foreign key. Deleting a row would leave all of those
-- resolving to nothing, so removal is an archive rather than a delete.
--
-- Both columns are defaulted/nullable, so Postgres adds them without rewriting
-- the table. IF NOT EXISTS makes this safe to re-run.
--
-- Apply: npx prisma db execute --file prisma/manual/2026-08-12-doctor-registry-archive.sql --schema prisma/schema.prisma

ALTER TABLE doctor_registry ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE doctor_registry ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP(3);
