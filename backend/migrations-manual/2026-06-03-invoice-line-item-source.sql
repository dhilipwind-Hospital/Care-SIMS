-- Adds sourceType + sourceId to invoice_line_items so unbilled-item queries
-- and revenue-by-source reports use an indexed join instead of a
-- string-prefix scan over reference_id.
--
-- Run order in Supabase SQL Editor:
--   1) ALTER TABLE add nullable columns
--   2) backfill from existing reference_id + category
--   3) create the composite index
--
-- Safe to re-run: each step is guarded.

-- 1) Columns
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id   TEXT;

-- 2) Backfill
--
-- Pharmacy referenceIds use one of two prefix schemes:
--   '{rxId}:item:{itemId}' (current)
--   '{rxId}:{batchId}'     (legacy, pre-Plan-B)
-- Both share '{rxId}:' so split on the first ':' to recover rxId.
UPDATE invoice_line_items
   SET source_type = 'PHARMACY',
       source_id   = split_part(reference_id, ':', 1)
 WHERE source_type IS NULL
   AND category    = 'PHARMACY'
   AND reference_id IS NOT NULL
   AND position(':' IN reference_id) > 0;

-- Lab referenceIds are the bare LabOrderItem id (no prefix).
UPDATE invoice_line_items
   SET source_type = 'LAB',
       source_id   = reference_id
 WHERE source_type IS NULL
   AND category    = 'LAB'
   AND reference_id IS NOT NULL;

-- OT referenceIds are the bare OT booking id (no prefix).
UPDATE invoice_line_items
   SET source_type = 'OT',
       source_id   = reference_id
 WHERE source_type IS NULL
   AND category    = 'PROCEDURE'
   AND reference_id IS NOT NULL;

-- Consultation line items currently have no auto-bill path; leave them null.

-- 3) Composite index for the dedup query
CREATE INDEX IF NOT EXISTS invoice_line_items_source_type_source_id_idx
  ON invoice_line_items (source_type, source_id);
