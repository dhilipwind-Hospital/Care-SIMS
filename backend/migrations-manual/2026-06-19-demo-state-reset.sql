-- ============================================================================
-- AYPHEN HMS — DEMO STATE RESET (paste & run in Supabase SQL Editor)
-- ----------------------------------------------------------------------------
-- Restores the demo to a "fresh from seed" state for every queue:
--   * Ravi's admission     -> ACTIVE     (was DISCHARGED after a test run)
--   * Bed ICU-02           -> OCCUPIED
--   * Demo Rx              -> ISSUED    (so it appears in pharmacy queue)
--   * Demo Lab order       -> ORDERED   (so it appears at top of lab queue)
--   * Demo OPD/IPD invoices -> PENDING  (so payments can be re-collected)
--   * Demo Lab results     -> deleted   (so Enter Results modal can be re-shown)
--
-- Use this BEFORE the seed SQL or independently between demo runs.
-- Idempotent — safe to re-run.
-- ============================================================================

-- 1. Admission -> ACTIVE
UPDATE admissions
   SET status='ACTIVE', discharge_date=NULL, discharge_diagnosis=NULL
 WHERE id = 'ca9958f7-ced6-4e10-94de-d585950a76d1';

-- 2. Bed ICU-02 -> OCCUPIED  +  any housekeeping task on it -> COMPLETED
UPDATE beds SET status='OCCUPIED'
 WHERE id = '9fc72398-8ee1-49ae-9697-fd0b57158b7a';
UPDATE housekeeping_tasks SET status='COMPLETED'
 WHERE bed_id = '9fc72398-8ee1-49ae-9697-fd0b57158b7a' AND status='PENDING';

-- 3. Drop any existing discharge summary for the admission (so the form is empty)
DELETE FROM discharge_summaries
 WHERE admission_id = 'ca9958f7-ced6-4e10-94de-d585950a76d1';

-- 4. Demo Rx -> ISSUED  (so it shows in the pharmacy queue)
UPDATE prescriptions
   SET status='ISSUED'
 WHERE tenant_id = '129a7a75-325e-4027-889f-2e87bdc7b5ab'
   AND rx_number  = 'RX-DEMO-OPD-001';
UPDATE prescription_items
   SET status='ISSUED'
 WHERE prescription_id IN
   (SELECT id FROM prescriptions WHERE rx_number = 'RX-DEMO-OPD-001');

-- 5. Demo Lab order -> ORDERED  +  wipe any results so Enter Results re-shows
UPDATE lab_orders
   SET status='ORDERED'
 WHERE tenant_id   = '129a7a75-325e-4027-889f-2e87bdc7b5ab'
   AND order_number = 'LAB-DEMO-OPD-001';
UPDATE lab_order_items
   SET status='ORDERED'
 WHERE lab_order_id IN
   (SELECT id FROM lab_orders WHERE order_number = 'LAB-DEMO-OPD-001');

DELETE FROM lab_result_items
 WHERE lab_result_id IN
   (SELECT id FROM lab_results
     WHERE lab_order_id IN
       (SELECT id FROM lab_orders WHERE order_number = 'LAB-DEMO-OPD-001'));
DELETE FROM lab_results
 WHERE lab_order_id IN
   (SELECT id FROM lab_orders WHERE order_number = 'LAB-DEMO-OPD-001');

-- 6. Demo invoices -> PENDING + clear payments  (so Collect Payment is re-demoable)
DELETE FROM invoice_payments
 WHERE invoice_id IN
   (SELECT id FROM invoices
     WHERE invoice_number IN ('INV-DEMO-OPD-001','INV-DEMO-IPD-001'));
UPDATE invoices
   SET status='PENDING', paid_amount=0
 WHERE invoice_number IN ('INV-DEMO-OPD-001','INV-DEMO-IPD-001');

-- ─── Verification ─────────────────────────────────────────────────────
SELECT
  (SELECT status FROM admissions WHERE id='ca9958f7-ced6-4e10-94de-d585950a76d1') AS admission,
  (SELECT status FROM beds WHERE id='9fc72398-8ee1-49ae-9697-fd0b57158b7a')      AS bed,
  (SELECT status FROM prescriptions WHERE rx_number='RX-DEMO-OPD-001')           AS rx,
  (SELECT status FROM lab_orders   WHERE order_number='LAB-DEMO-OPD-001')         AS lab,
  (SELECT status FROM invoices     WHERE invoice_number='INV-DEMO-OPD-001')       AS opd_inv,
  (SELECT status FROM invoices     WHERE invoice_number='INV-DEMO-IPD-001')       AS ipd_inv,
  (SELECT COUNT(*) FROM medication_administrations
    WHERE admission_id='ca9958f7-ced6-4e10-94de-d585950a76d1' AND status='SCHEDULED') AS mar_scheduled;
-- Expected: ACTIVE | OCCUPIED | ISSUED | ORDERED | PENDING | PENDING | 5
