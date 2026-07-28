-- Double-booking guard: at most ONE active appointment per doctor/slot/tenant.
-- Partial unique index — CANCELLED / NO_SHOW rows don't block rebooking the slot.
--
-- Prisma can't express partial indexes in schema.prisma, so this lives here and
-- is applied manually (npx prisma db execute --file ... or the Supabase SQL editor).
-- ⚠ If you ever run `prisma db push`, re-check this index survived.
--
-- Applied to production 2026-07-28 (after cancelling 3 stale duplicate rows
-- from a 2026-05-29 double-submit; kept the earliest of the 4).

CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_uniq
  ON appointments (tenant_id, doctor_id, appointment_date, appointment_time)
  WHERE status NOT IN ('CANCELLED', 'NO_SHOW');
