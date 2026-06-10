-- Seeds the four modules that were empty on the Apple tenant so all
-- demo flows + backup demos work without any prep:
--   * Central Store items (4 items, mix of normal/low/out stock for filter demo)
--   * Blood Bank inventory + transfusions (cross-match demo target)
--   * Insurance policy + claims (one submitted, one settled)
--   * Discharge Summary (one for an existing admission)
--
-- Idempotent: every insert guarded with NOT EXISTS so safe to re-run.

DO $$
DECLARE
  v_tenant         TEXT := '129a7a75-325e-4027-889f-2e87bdc7b5ab';
  v_location       TEXT := '0d7fc73e-855f-4786-917d-bdedf2e54878';
  v_patient_1      TEXT := '9766efd3-e974-47a4-8fbd-1187f171f514';
  v_patient_2      TEXT := '70b7c688-cfc1-4f26-ab46-4c10e9d27ce3';
  v_patient_3      TEXT := '5f6dd2c4-4455-48d5-978b-e8629f1b439a';
  v_doctor_user    TEXT := 'd48e0d6b-9694-411f-9f4c-5eb6ead8e8da';
  v_nurse          TEXT := '02d0934e-2ec0-42ec-b6f6-898f46c10717';
  v_invoice_paid   TEXT := '631a20d3-3e57-4c3d-8199-44fc93a82b34';
  v_invoice_draft  TEXT := '27498cf2-820d-4ba8-bf34-2c90f9f92dea';
  v_admission_1    TEXT := '95d38df8-629f-4473-9707-bc8594779a12';
  v_policy_id      TEXT;
BEGIN

  -- 1) CENTRAL STORE: 4 items spanning normal/low/out so the status filter
  --    pills (All / Low / Out) actually have something to show.
  INSERT INTO store_items (id, tenant_id, item_code, name, category, unit, reorder_level, current_stock, unit_price, location_id, is_active, created_at, updated_at)
  SELECT gen_random_uuid()::text, v_tenant, 'CS-GAUZE-001', 'Sterile Gauze 5x5cm', 'SURGICAL_CONSUMABLES', 'BOX', 20, 35, 250.00, v_location, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM store_items WHERE tenant_id = v_tenant AND item_code = 'CS-GAUZE-001');

  INSERT INTO store_items (id, tenant_id, item_code, name, category, unit, reorder_level, current_stock, unit_price, location_id, is_active, created_at, updated_at)
  SELECT gen_random_uuid()::text, v_tenant, 'CS-SYR-001', 'Disposable Syringe 5ml', 'SURGICAL_CONSUMABLES', 'PCS', 100, 45, 8.50, v_location, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM store_items WHERE tenant_id = v_tenant AND item_code = 'CS-SYR-001');

  INSERT INTO store_items (id, tenant_id, item_code, name, category, unit, reorder_level, current_stock, unit_price, location_id, is_active, created_at, updated_at)
  SELECT gen_random_uuid()::text, v_tenant, 'CS-GLOVES-001', 'Nitrile Gloves M', 'SURGICAL_CONSUMABLES', 'BOX', 30, 0, 380.00, v_location, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM store_items WHERE tenant_id = v_tenant AND item_code = 'CS-GLOVES-001');

  INSERT INTO store_items (id, tenant_id, item_code, name, category, unit, reorder_level, current_stock, unit_price, location_id, is_active, created_at, updated_at)
  SELECT gen_random_uuid()::text, v_tenant, 'CS-SOAP-001', 'Liquid Hand Soap 500ml', 'CLEANING', 'BTL', 15, 22, 95.00, v_location, true, now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM store_items WHERE tenant_id = v_tenant AND item_code = 'CS-SOAP-001');

  -- 2) BLOOD BANK: 3 bags in inventory, 2 transfusions (one ORDERED awaiting
  --    cross-match — the actual demo target).
  INSERT INTO blood_inventory (id, tenant_id, location_id, bag_number, component, blood_group, rh_factor, volume_ml, collection_date, expiry_date, storage_temp, status, created_at)
  SELECT gen_random_uuid()::text, v_tenant, v_location, 'APPL-BAG-A+-001', 'PACKED_RED_CELLS', 'A', 'POSITIVE', 350, now() - INTERVAL '7 days', now() + INTERVAL '28 days', '2-6C', 'AVAILABLE', now()
  WHERE NOT EXISTS (SELECT 1 FROM blood_inventory WHERE tenant_id = v_tenant AND bag_number = 'APPL-BAG-A+-001');

  INSERT INTO blood_inventory (id, tenant_id, location_id, bag_number, component, blood_group, rh_factor, volume_ml, collection_date, expiry_date, storage_temp, status, created_at)
  SELECT gen_random_uuid()::text, v_tenant, v_location, 'APPL-BAG-O+-001', 'WHOLE_BLOOD', 'O', 'POSITIVE', 450, now() - INTERVAL '5 days', now() + INTERVAL '30 days', '2-6C', 'AVAILABLE', now()
  WHERE NOT EXISTS (SELECT 1 FROM blood_inventory WHERE tenant_id = v_tenant AND bag_number = 'APPL-BAG-O+-001');

  INSERT INTO blood_inventory (id, tenant_id, location_id, bag_number, component, blood_group, rh_factor, volume_ml, collection_date, expiry_date, storage_temp, status, created_at)
  SELECT gen_random_uuid()::text, v_tenant, v_location, 'APPL-BAG-B+-001', 'FRESH_FROZEN_PLASMA', 'B', 'POSITIVE', 250, now() - INTERVAL '10 days', now() + INTERVAL '300 days', '-30C', 'AVAILABLE', now()
  WHERE NOT EXISTS (SELECT 1 FROM blood_inventory WHERE tenant_id = v_tenant AND bag_number = 'APPL-BAG-B+-001');

  INSERT INTO blood_transfusions (id, tenant_id, location_id, patient_id, bag_number, component, blood_group, rh_factor, volume_ml, cross_match_verified, ordered_by, status, notes, created_at)
  SELECT gen_random_uuid()::text, v_tenant, v_location, v_patient_1, 'APPL-BAG-A+-001', 'PACKED_RED_CELLS', 'A', 'POSITIVE', 350, false, v_doctor_user, 'ORDERED', 'Pre-op transfusion. Awaiting cross-match verification.', now()
  WHERE NOT EXISTS (SELECT 1 FROM blood_transfusions WHERE tenant_id = v_tenant AND bag_number = 'APPL-BAG-A+-001');

  INSERT INTO blood_transfusions (id, tenant_id, location_id, patient_id, bag_number, component, blood_group, rh_factor, volume_ml, cross_match_verified, cross_match_by, ordered_by, start_time, end_time, status, administered_by, notes, created_at)
  SELECT gen_random_uuid()::text, v_tenant, v_location, v_patient_2, 'APPL-BAG-O+-001', 'WHOLE_BLOOD', 'O', 'POSITIVE', 450, true, v_nurse, v_doctor_user, now() - INTERVAL '2 days', now() - INTERVAL '2 days' + INTERVAL '2 hours', 'COMPLETED', v_nurse, 'Intra-op transfusion. No reaction.', now() - INTERVAL '2 days'
  WHERE NOT EXISTS (SELECT 1 FROM blood_transfusions WHERE tenant_id = v_tenant AND bag_number = 'APPL-BAG-O+-001');

  -- 3) INSURANCE: one policy + two claims (SUBMITTED + SETTLED) so the
  --    Insurance module shows a realistic lifecycle.
  IF NOT EXISTS (SELECT 1 FROM insurance_policies WHERE tenant_id = v_tenant AND policy_number = 'STAR-OPD-2026-001') THEN
    v_policy_id := gen_random_uuid()::text;
    INSERT INTO insurance_policies (id, tenant_id, patient_id, provider_name, policy_number, tpa_name, plan_type, coverage_amount, used_amount, copay_percent, deductible, start_date, end_date, primary_insured, created_at, updated_at)
    VALUES (v_policy_id, v_tenant, v_patient_1, 'Star Health Insurance', 'STAR-OPD-2026-001', 'MediAssist', 'FAMILY_FLOATER', 500000.00, 0, 10.00, 0, (CURRENT_DATE - INTERVAL '120 days')::date, (CURRENT_DATE + INTERVAL '245 days')::date, 'SELF', now(), now());
  ELSE
    SELECT id INTO v_policy_id FROM insurance_policies WHERE tenant_id = v_tenant AND policy_number = 'STAR-OPD-2026-001';
  END IF;

  INSERT INTO insurance_claims (id, tenant_id, claim_number, policy_id, patient_id, invoice_id, claim_type, claim_amount, submitted_at, status, created_at, updated_at)
  SELECT gen_random_uuid()::text, v_tenant, 'APPL-CLM-001', v_policy_id, v_patient_1, v_invoice_draft, 'OPD', 4500.00, now() - INTERVAL '1 day', 'SUBMITTED', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM insurance_claims WHERE tenant_id = v_tenant AND claim_number = 'APPL-CLM-001');

  INSERT INTO insurance_claims (id, tenant_id, claim_number, policy_id, patient_id, invoice_id, claim_type, pre_auth_code, pre_auth_amount, pre_auth_status, pre_auth_date, claim_amount, approved_amount, settled_amount, submitted_at, approved_at, settled_at, status, created_at, updated_at)
  SELECT gen_random_uuid()::text, v_tenant, 'APPL-CLM-002', v_policy_id, v_patient_1, v_invoice_paid, 'IPD', 'PA-APPL-2026', 25000.00, 'APPROVED', now() - INTERVAL '5 days', 28500.00, 26800.00, 26800.00, now() - INTERVAL '4 days', now() - INTERVAL '2 days', now() - INTERVAL '1 day', 'SETTLED', now() - INTERVAL '5 days', now()
  WHERE NOT EXISTS (SELECT 1 FROM insurance_claims WHERE tenant_id = v_tenant AND claim_number = 'APPL-CLM-002');

  -- 4) DISCHARGE SUMMARY: one APPROVED summary against the first existing
  --    admission so the page has something to view.
  IF v_admission_1 IS NOT NULL THEN
    INSERT INTO discharge_summaries (
      id, tenant_id, location_id, admission_id, patient_id, doctor_id,
      admission_date, discharge_date,
      diagnosis_on_admission, diagnosis_on_discharge,
      procedures_performed, treatment_given, investigation_summary,
      condition_at_discharge, discharge_medications,
      follow_up_instructions, follow_up_date, dietary_advice, activity_restrictions,
      status, prepared_by, approved_by, approved_at, created_at, updated_at
    )
    SELECT
      gen_random_uuid()::text, v_tenant, v_location, v_admission_1, v_patient_1, v_doctor_user,
      now() - INTERVAL '4 days', now() - INTERVAL '1 day',
      'Acute gastroenteritis with dehydration', 'Resolved acute gastroenteritis',
      '[{"name":"IV rehydration","date":"2026-06-06"}]'::jsonb,
      'IV fluids 2L/day for 2 days, IV antibiotics, antiemetics. Gradually transitioned to oral intake.',
      'CBC normal, electrolytes corrected, stool culture negative for pathogens.',
      'STABLE',
      '[{"drug":"Pantoprazole 40mg","dosage":"OD","duration":"5 days"},{"drug":"ORS sachets","dosage":"as needed","duration":"PRN"}]'::jsonb,
      'Review in OPD after 1 week. Return immediately if vomiting, blood in stool, or high-grade fever.',
      (CURRENT_DATE + INTERVAL '7 days')::date,
      'Soft, bland diet for 3 days. Avoid spicy/oily food. Adequate hydration.',
      'Rest for 2 days. No heavy lifting for 1 week.',
      'APPROVED', v_doctor_user, v_doctor_user, now() - INTERVAL '1 day',
      now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM discharge_summaries WHERE tenant_id = v_tenant AND admission_id = v_admission_1);
  END IF;

END $$;
