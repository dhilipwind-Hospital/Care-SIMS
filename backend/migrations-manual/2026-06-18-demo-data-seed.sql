-- ============================================================================
-- AYPHEN HMS — DEMO DATA SEED (paste & run in Supabase SQL Editor)
-- ----------------------------------------------------------------------------
-- Idempotent. Re-running is safe — existing rows are detected & skipped.
-- Resets Ravi Kumar's admission to ACTIVE and creates one of every artefact
-- the demo flow expects to see in a queue: an in-progress consultation, a
-- STAT lab order, an issued prescription with stock, an unpaid OPD invoice
-- with full line items, an itemised IPD invoice, and 5 scheduled MAR doses.
-- ============================================================================
DO $$
DECLARE
  v_tenant   TEXT := '129a7a75-325e-4027-889f-2e87bdc7b5ab';
  v_loc      TEXT := '0d7fc73e-855f-4786-917d-bdedf2e54878';
  v_patient  TEXT := '9766efd3-e974-47a4-8fbd-1187f171f514';   -- Ravi Kumar
  v_doctor   TEXT := 'de0dfcf6-bc45-4403-acb7-a3d037b51972';   -- Dr Rahul Sharma
  v_admin    TEXT := 'f42e30a9-4db6-4d8b-a2e6-22bd4c41e3ab';   -- admin@apple.local
  v_adm      TEXT := 'ca9958f7-ced6-4e10-94de-d585950a76d1';   -- Ravi's admission
  v_bed      TEXT := '9fc72398-8ee1-49ae-9697-fd0b57158b7a';   -- ICU-02
  v_consult       TEXT;
  v_rx            TEXT;
  v_lab           TEXT;
  v_inv_opd       TEXT;
  v_inv_ipd       TEXT;
  v_drug_aspirin  TEXT;
  v_drug_atorva   TEXT;
  v_item_aspirin  TEXT;
  v_item_atorva   TEXT;
BEGIN
  -- ─── 1. Restore Ravi's admission to ACTIVE ──────────────────────────────
  UPDATE admissions
     SET status='ACTIVE', discharge_date=NULL, discharge_diagnosis=NULL
   WHERE id = v_adm;
  UPDATE beds SET status='OCCUPIED' WHERE id = v_bed;
  UPDATE housekeeping_tasks SET status='COMPLETED'
   WHERE bed_id = v_bed AND status='PENDING';
  DELETE FROM discharge_summaries WHERE admission_id = v_adm;

  -- ─── 2. IN_PROGRESS consultation for the doctor's queue ─────────────────
  SELECT id INTO v_consult
    FROM consultations
   WHERE tenant_id = v_tenant AND patient_id = v_patient AND status = 'IN_PROGRESS'
   LIMIT 1;
  IF v_consult IS NULL THEN
    v_consult := gen_random_uuid()::text;
    INSERT INTO consultations (id, tenant_id, location_id, patient_id, doctor_id, chief_complaint, status, started_at, created_at, updated_at)
    VALUES (v_consult, v_tenant, v_loc, v_patient, v_doctor,
      'Chest discomfort, mild breathlessness on exertion x 2 days',
      'IN_PROGRESS', now() - INTERVAL '15 minutes', now(), now());
  END IF;

  -- ─── 3. Drugs + batches (pharmacy stock for Rx items) ───────────────────
  SELECT id INTO v_drug_aspirin FROM drugs
   WHERE tenant_id = v_tenant AND brand_name = 'Aspirin 75' LIMIT 1;
  IF v_drug_aspirin IS NULL THEN
    v_drug_aspirin := gen_random_uuid()::text;
    INSERT INTO drugs (id, tenant_id, brand_name, generic_name, category, dosage_form, strength, manufacturer, hsn_code, gst_pct, unit_of_measure, reorder_level, max_stock_level, storage_condition, is_active, created_at)
    VALUES (v_drug_aspirin, v_tenant, 'Aspirin 75', 'Aspirin', 'CARDIOLOGY', 'TABLET', '75 mg', 'GenericCo', '3004', 12.00, 'TAB', 100, 1000, 'ROOM_TEMPERATURE', true, now());
    INSERT INTO drug_batches (id, tenant_id, drug_id, location_id, batch_number, expiry_date, quantity_in_stock, unit_cost, status, received_date, created_at) VALUES
      (gen_random_uuid()::text, v_tenant, v_drug_aspirin, v_loc, 'ASP-2026-A', (now() + INTERVAL '8 months')::date,  240, 0.85, 'ACTIVE', (now() - INTERVAL '60 days')::date, now()),
      (gen_random_uuid()::text, v_tenant, v_drug_aspirin, v_loc, 'ASP-2026-B', (now() + INTERVAL '14 months')::date, 500, 0.80, 'ACTIVE', (now() - INTERVAL '15 days')::date, now());
  END IF;

  SELECT id INTO v_drug_atorva FROM drugs
   WHERE tenant_id = v_tenant AND brand_name = 'Atorvastatin 40' LIMIT 1;
  IF v_drug_atorva IS NULL THEN
    v_drug_atorva := gen_random_uuid()::text;
    INSERT INTO drugs (id, tenant_id, brand_name, generic_name, category, dosage_form, strength, manufacturer, hsn_code, gst_pct, unit_of_measure, reorder_level, max_stock_level, storage_condition, is_active, created_at)
    VALUES (v_drug_atorva, v_tenant, 'Atorvastatin 40', 'Atorvastatin', 'CARDIOLOGY', 'TABLET', '40 mg', 'GenericCo', '3004', 12.00, 'TAB', 100, 1000, 'ROOM_TEMPERATURE', true, now());
    INSERT INTO drug_batches (id, tenant_id, drug_id, location_id, batch_number, expiry_date, quantity_in_stock, unit_cost, status, received_date, created_at) VALUES
      (gen_random_uuid()::text, v_tenant, v_drug_atorva, v_loc, 'ATR-2026-A', (now() + INTERVAL '10 months')::date, 180, 3.20, 'ACTIVE', (now() - INTERVAL '40 days')::date, now());
  END IF;

  -- ─── 4. ISSUED prescription for the pharmacy queue ─────────────────────
  SELECT id INTO v_rx FROM prescriptions
   WHERE tenant_id = v_tenant AND rx_number = 'RX-DEMO-OPD-001';
  IF v_rx IS NULL THEN
    v_rx := gen_random_uuid()::text;
    INSERT INTO prescriptions (id, tenant_id, rx_number, location_id, consultation_id, patient_id, doctor_id, status, validity_date, notes, issued_at, created_at)
    VALUES (v_rx, v_tenant, 'RX-DEMO-OPD-001', v_loc, v_consult, v_patient, v_doctor,
      'ISSUED', (now() + INTERVAL '30 days')::date,
      'Cardiac protective therapy — Aspirin + statin',
      now() - INTERVAL '10 minutes', now());
    v_item_aspirin := gen_random_uuid()::text;
    v_item_atorva  := gen_random_uuid()::text;
    INSERT INTO prescription_items (id, prescription_id, drug_id, drug_name, generic_name, dosage_form, strength, dosage, frequency, duration_days, route, instructions, quantity, status, sort_order) VALUES
      (v_item_aspirin, v_rx, v_drug_aspirin, 'Aspirin 75',      'Aspirin',      'TABLET', '75 mg', '75 mg',  'OD',  30, 'PO', 'After food',  30, 'ISSUED', 0),
      (v_item_atorva,  v_rx, v_drug_atorva,  'Atorvastatin 40', 'Atorvastatin', 'TABLET', '40 mg', '40 mg',  'HS',  30, 'PO', 'At bedtime',  30, 'ISSUED', 1);
  ELSE
    SELECT id INTO v_item_aspirin FROM prescription_items WHERE prescription_id = v_rx AND drug_name='Aspirin 75' LIMIT 1;
    SELECT id INTO v_item_atorva  FROM prescription_items WHERE prescription_id = v_rx AND drug_name='Atorvastatin 40' LIMIT 1;
  END IF;

  -- ─── 5. STAT lab order with 3 tests for the lab queue ──────────────────
  SELECT id INTO v_lab FROM lab_orders
   WHERE tenant_id = v_tenant AND order_number = 'LAB-DEMO-OPD-001';
  IF v_lab IS NULL THEN
    v_lab := gen_random_uuid()::text;
    INSERT INTO lab_orders (id, tenant_id, order_number, location_id, consultation_id, patient_id, doctor_id, priority, fasting_required, clinical_notes, status, ordered_at)
    VALUES (v_lab, v_tenant, 'LAB-DEMO-OPD-001', v_loc, v_consult, v_patient, v_doctor,
      'STAT', false, 'Rule out ACS / cardiac workup', 'ORDERED', now() - INTERVAL '10 minutes');
    INSERT INTO lab_order_items (id, lab_order_id, test_code, test_name, category, urgency, status) VALUES
      (gen_random_uuid()::text, v_lab, 'CBC',    'Complete Blood Count',  'HEMATOLOGY',   'STAT', 'ORDERED'),
      (gen_random_uuid()::text, v_lab, 'TROP-I', 'Troponin I',            'BIOCHEMISTRY', 'STAT', 'ORDERED'),
      (gen_random_uuid()::text, v_lab, 'ECG',    '12-lead ECG',           'CARDIOLOGY',   'STAT', 'ORDERED');
  END IF;

  -- ─── 6. Unpaid OPD invoice for Ravi (consult + lab + Rx assembled) ─────
  SELECT id INTO v_inv_opd FROM invoices
   WHERE tenant_id = v_tenant AND invoice_number = 'INV-DEMO-OPD-001';
  IF v_inv_opd IS NULL THEN
    v_inv_opd := gen_random_uuid()::text;
    INSERT INTO invoices (id, tenant_id, invoice_number, location_id, patient_id, queue_token_id, doctor_id, invoice_type, subtotal, discount_amount, tax_amount, net_total, paid_amount, status, due_date, notes, created_by, created_at, updated_at)
    VALUES (v_inv_opd, v_tenant, 'INV-DEMO-OPD-001', v_loc, v_patient, NULL, v_doctor,
      'OPD', 3061.50, 0, 0, 3061.50, 0,
      'PENDING', (now() + INTERVAL '7 days')::date,
      'OPD demo invoice (auto-assembled from consult + lab + Rx)', v_admin, now(), now());
    INSERT INTO invoice_line_items (id, invoice_id, description, category, quantity, unit_price, discount_pct, tax_pct, amount, source_type, source_id) VALUES
      (gen_random_uuid()::text, v_inv_opd, 'OPD Consultation — Dr Rahul Sharma', 'CONSULTATION', 1,  500.00, 0, 0,  500.00, 'CONSULTATION', v_consult),
      (gen_random_uuid()::text, v_inv_opd, 'Complete Blood Count',                'LAB',           1,  280.00, 0, 0,  280.00, 'LAB',          v_lab),
      (gen_random_uuid()::text, v_inv_opd, 'Troponin I (STAT)',                   'LAB',           1, 1800.00, 0, 0, 1800.00, 'LAB',          v_lab),
      (gen_random_uuid()::text, v_inv_opd, '12-lead ECG',                          'LAB',           1,  360.00, 0, 0,  360.00, 'LAB',          v_lab),
      (gen_random_uuid()::text, v_inv_opd, 'Aspirin 75 (30 tab)',                  'PHARMACY',     30,    0.85, 0, 0,   25.50, 'PHARMACY',     v_rx),
      (gen_random_uuid()::text, v_inv_opd, 'Atorvastatin 40 (30 tab)',             'PHARMACY',     30,    3.20, 0, 0,   96.00, 'PHARMACY',     v_rx);
  END IF;

  -- ─── 7. IPD invoice with manual itemised stay charges ──────────────────
  SELECT id INTO v_inv_ipd FROM invoices
   WHERE tenant_id = v_tenant AND invoice_number = 'INV-DEMO-IPD-001';
  IF v_inv_ipd IS NULL THEN
    v_inv_ipd := gen_random_uuid()::text;
    INSERT INTO invoices (id, tenant_id, invoice_number, location_id, patient_id, admission_id, doctor_id, invoice_type, subtotal, discount_amount, tax_amount, net_total, paid_amount, status, due_date, notes, created_by, created_at, updated_at)
    VALUES (v_inv_ipd, v_tenant, 'INV-DEMO-IPD-001', v_loc, v_patient, v_adm, v_doctor,
      'IPD', 27300.00, 0, 0, 27300.00, 0,
      'PENDING', (now() + INTERVAL '15 days')::date,
      'IPD demo invoice — itemised 5-day ICU stay', v_admin, now(), now());
    INSERT INTO invoice_line_items (id, invoice_id, description, category, quantity, unit_price, discount_pct, tax_pct, amount, source_type, source_id) VALUES
      (gen_random_uuid()::text, v_inv_ipd, 'ICU Bed Charge × 5 days',           'ADMISSION',    5, 2500.00, 0, 0, 12500.00, 'OTHER',        v_adm),
      (gen_random_uuid()::text, v_inv_ipd, 'Doctor Round Charges × 5',           'CONSULTATION', 5,  800.00, 0, 0,  4000.00, 'CONSULTATION', v_adm),
      (gen_random_uuid()::text, v_inv_ipd, 'Nursing Care × 5 days',              'ADMISSION',    5,  600.00, 0, 0,  3000.00, 'OTHER',        v_adm),
      (gen_random_uuid()::text, v_inv_ipd, 'IV Antibiotics — Ceftriaxone',       'PHARMACY',     5,  350.00, 0, 0,  1750.00, 'PHARMACY',     v_adm),
      (gen_random_uuid()::text, v_inv_ipd, 'IV Fluids & Supportive',             'PHARMACY',    12,   80.00, 0, 0,   960.00, 'PHARMACY',     v_adm),
      (gen_random_uuid()::text, v_inv_ipd, 'Lab Investigations Bundle',          'LAB',          1, 5800.00, 0, 0,  5800.00, 'LAB',          v_adm),
      (gen_random_uuid()::text, v_inv_ipd, 'Radiology — Chest X-ray AP',         'LAB',          1,  800.00, 0, 0,   800.00, 'LAB',          v_adm),
      (gen_random_uuid()::text, v_inv_ipd, 'Package Discount — IPD General',     'ADMISSION',    1,-2500.00, 0, 0, -2500.00, 'OTHER',        v_adm),
      (gen_random_uuid()::text, v_inv_ipd, 'Consumables — Cannulas, Dressings',  'OTHER',        1,  990.00, 0, 0,   990.00, 'OTHER',        v_adm);
  END IF;

  -- ─── 8. SCHEDULED MAR doses for the nursing demo ───────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM medication_administrations
     WHERE tenant_id = v_tenant AND admission_id = v_adm AND status = 'SCHEDULED'
  ) THEN
    INSERT INTO medication_administrations (id, tenant_id, location_id, admission_id, patient_id, prescription_item_id, drug_name, dosage, route, frequency, scheduled_time, status, created_at) VALUES
      (gen_random_uuid()::text, v_tenant, v_loc, v_adm, v_patient, v_item_aspirin, 'Aspirin 75',         '75 mg', 'PO', 'OD',      now() + INTERVAL '30 minutes', 'SCHEDULED', now()),
      (gen_random_uuid()::text, v_tenant, v_loc, v_adm, v_patient, v_item_atorva,  'Atorvastatin 40',    '40 mg', 'PO', 'HS',      now() + INTERVAL '4 hours',    'SCHEDULED', now()),
      (gen_random_uuid()::text, v_tenant, v_loc, v_adm, v_patient, NULL,           'Ceftriaxone 2g',     '2 g',   'IV', 'OD',      now() + INTERVAL '2 hours',    'SCHEDULED', now()),
      (gen_random_uuid()::text, v_tenant, v_loc, v_adm, v_patient, NULL,           'Pantoprazole 40mg',  '40 mg', 'IV', 'OD',      now() + INTERVAL '1 hour',     'SCHEDULED', now()),
      (gen_random_uuid()::text, v_tenant, v_loc, v_adm, v_patient, NULL,           'Paracetamol 1g',     '1 g',   'IV', 'TDS PRN', now() + INTERVAL '6 hours',    'SCHEDULED', now());
  END IF;

END $$;

-- ─── Verification (paste in a separate query after the seed runs) ──────
-- SELECT
--   (SELECT status FROM admissions WHERE id='ca9958f7-ced6-4e10-94de-d585950a76d1') AS admission,
--   (SELECT COUNT(*) FROM consultations WHERE tenant_id='129a7a75-325e-4027-889f-2e87bdc7b5ab' AND status='IN_PROGRESS') AS consult_inprogress,
--   (SELECT COUNT(*) FROM lab_orders WHERE order_number='LAB-DEMO-OPD-001') AS lab,
--   (SELECT COUNT(*) FROM prescriptions WHERE rx_number='RX-DEMO-OPD-001') AS rx,
--   (SELECT COUNT(*) FROM invoices WHERE invoice_number='INV-DEMO-OPD-001') AS opd_inv,
--   (SELECT COUNT(*) FROM invoices WHERE invoice_number='INV-DEMO-IPD-001') AS ipd_inv,
--   (SELECT COUNT(*) FROM medication_administrations WHERE admission_id='ca9958f7-ced6-4e10-94de-d585950a76d1' AND status='SCHEDULED') AS mar_pending,
--   (SELECT COUNT(*) FROM drug_batches WHERE tenant_id='129a7a75-325e-4027-889f-2e87bdc7b5ab') AS stock_rows;
-- Expected: ACTIVE | 1 | 1 | 1 | 1 | 1 | 5 | 3
