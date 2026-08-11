-- Indexes for the audit trail.
--
-- org_audit_logs and patient_access_logs shipped with NO index beyond their
-- primary key. That was harmless while AuditService.log() had zero call sites
-- and both tables stayed empty. As of commit f5c17c5 a global interceptor
-- writes a row for every successful mutating request, so they now grow with
-- traffic, and /app/admin/audit reads them with `WHERE tenant_id = ?
-- ORDER BY created_at DESC` — a sequential scan on every page load.
--
-- These are declared as @@index in schema.prisma, but `render-build` runs only
-- `prisma generate` (no migrate, no push), so nothing applies them on deploy.
-- Hence this file, matching the existing manual-SQL convention.
--
-- Index names deliberately match Prisma's own naming (<table>_<cols>_idx), so a
-- future `prisma db push` sees them as already satisfied and will not create
-- duplicates.
--
-- IF NOT EXISTS makes this safe to re-run. Non-destructive and reversible
-- (DROP INDEX). Cheap now while the tables are near-empty; expensive later.
--
-- Apply: npx prisma db execute --file prisma/manual/2026-08-11-audit-indexes.sql --schema prisma/schema.prisma

CREATE INDEX IF NOT EXISTS org_audit_logs_tenant_id_created_at_idx
  ON org_audit_logs (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS org_audit_logs_tenant_id_event_type_idx
  ON org_audit_logs (tenant_id, event_type);

CREATE INDEX IF NOT EXISTS patient_access_logs_tenant_id_patient_id_created_at_idx
  ON patient_access_logs (tenant_id, patient_id, created_at);
