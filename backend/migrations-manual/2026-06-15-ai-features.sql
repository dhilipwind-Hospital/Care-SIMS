-- Adds the AI feature scaffolding:
--   * tenants.ai_enabled  - master switch per tenant, default true
--   * ai_audit_logs       - every LLM call gets a row for audit + cost
--                           tracking
--
-- Safe to re-run.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  feature         TEXT NOT NULL,
  user_id         TEXT,
  patient_id      TEXT,
  reference_type  TEXT,
  reference_id    TEXT,
  model           TEXT NOT NULL,
  prompt_chars    INTEGER NOT NULL,
  response_chars  INTEGER NOT NULL,
  duration_ms     INTEGER,
  status          TEXT NOT NULL,
  error_message   TEXT,
  prompt_head     TEXT,
  response_head   TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_audit_logs_tenant_feature_created_idx
  ON ai_audit_logs (tenant_id, feature, created_at);

CREATE INDEX IF NOT EXISTS ai_audit_logs_tenant_patient_idx
  ON ai_audit_logs (tenant_id, patient_id);
