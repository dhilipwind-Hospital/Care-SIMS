-- Two additive DB changes for features that had frontend + backend code but no
-- schema, so their buttons 404'd (surfaced by the frontend<->backend route audit):
--
--   1. Pharmacy "Manual Entry" (walk-in / prescription-less dispense) — needs a
--      table to record the free-text dispense. POST /pharmacy/manual-dispense.
--   2. CSSD Instrument Set Issue/Return — needs an issue-state on instrument_sets.
--      PATCH /cssd/instrument-sets/:id/issue|return.
--
-- Additive only (new table + new nullable/defaulted columns); does not alter or
-- drop anything existing, so it cannot break current functionality. Safe to re-run.

-- 1. Pharmacy manual dispense --------------------------------------------------
CREATE TABLE IF NOT EXISTS manual_dispenses (
  id            TEXT NOT NULL,
  tenant_id     TEXT NOT NULL,
  patient_name  TEXT NOT NULL,
  drug_name     TEXT NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 0,
  dosage        TEXT,
  instructions  TEXT,
  notes         TEXT,
  dispensed_by  TEXT,
  created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT manual_dispenses_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS manual_dispenses_tenant_id_idx ON manual_dispenses (tenant_id);

-- 2. CSSD instrument-set issue/return state ------------------------------------
-- status defaults to AVAILABLE, which backfills all existing rows correctly.
ALTER TABLE instrument_sets
  ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS issued_to_dept TEXT,
  ADD COLUMN IF NOT EXISTS issued_at      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS returned_at    TIMESTAMP(3);
