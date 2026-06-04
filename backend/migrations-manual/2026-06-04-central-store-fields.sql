-- Adds three fields the existing Central Store implementation was already
-- pretending to support:
--   store_items.unit_price       — to compute on-hand inventory value
--   store_transactions.unit_price — captured per receipt for cost trail
--   store_transactions.issued_to  — frontend already sends this, BE was
--                                   silently dropping it (no column)
--
-- Safe to re-run.

ALTER TABLE store_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2);

ALTER TABLE store_transactions
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS issued_to  TEXT;
