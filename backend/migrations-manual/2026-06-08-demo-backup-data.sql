-- Seeds the data needed for the four "backup demo" flows on the
-- ayphen-general-hospital tenant. Idempotent: ON CONFLICT clauses or
-- existence guards on every insert so re-running is safe.

DO $$
DECLARE
  v_tenant       TEXT := 'd53585d2-37a3-414a-b70a-1e965e4ad136';
  v_location     TEXT := '9ae2b441-a640-4863-9f86-17f1d08d563f';
  v_patient_1    TEXT := 'b4b59f86-e305-44fe-b4b5-e5b88f635f37';
  v_patient_2    TEXT := 'f023fa6b-f56a-4b67-b9ee-746ba148189b';
  v_patient_3    TEXT := 'f6a442dc-059f-4574-90fe-ac8f1a4fbe39';
  v_surgeon      TEXT := 'f562d033-b2cf-4892-9a4d-c1bd98fe9cd2';
  v_nurse        TEXT := '4bc2fed2-cb98-4363-9d06-0b7f40739838';
  v_blood_bag_id TEXT := 'e0ef7426-4e4e-4528-9621-fadc1aa89e2a';
  v_policy       TEXT := '30046c43-1dbf-4c35-bf05-1503be7cb981';
  v_invoice      TEXT := '0a5bd9ad-84ac-4790-8f14-ec36ad372d54';
  v_ot_room_id   TEXT;
BEGIN

  -- 1) One OT Room (so bookings have something to schedule against)
  INSERT INTO ot_rooms (id, tenant_id, location_id, name, type, capacity_class, is_active, created_at)
  VALUES (gen_random_uuid()::text, v_tenant, v_location, 'OT-1', 'MAJOR', 'GENERAL', true, now())
  ON CONFLICT (tenant_id, location_id, name) DO NOTHING;
  SELECT id INTO v_ot_room_id FROM ot_rooms WHERE tenant_id = v_tenant AND name = 'OT-1' LIMIT 1;

  -- 2) Three OT bookings: one COMPLETED (yesterday), one IN_PROGRESS (now),
  --    one SCHEDULED (tomorrow) — gives a realistic mix in OT Live Monitor.
  IF NOT EXISTS (SELECT 1 FROM ot_bookings WHERE tenant_id = v_tenant AND booking_number = 'OT-DEMO-001') THEN
    INSERT INTO ot_bookings (
      id, tenant_id, booking_number, location_id, patient_id, ot_room_id,
      primary_surgeon_id, assisting_surgeons,
      procedure_name, procedure_code, surgery_type, anesthesia_type,
      scheduled_date, scheduled_start, expected_duration_mins,
      actual_start, actual_end, status,
      blood_units_reserved, estimated_blood_loss, blood_units_used,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid()::text, v_tenant, 'OT-DEMO-001', v_location, v_patient_1, v_ot_room_id,
      v_surgeon, ARRAY[]::text[],
      'Laparoscopic Appendectomy', 'AP-LAP', 'EMERGENCY', 'GENERAL',
      (CURRENT_DATE - INTERVAL '1 day')::date, '09:00', 60,
      (CURRENT_DATE - INTERVAL '1 day') + TIME '09:05',
      (CURRENT_DATE - INTERVAL '1 day') + TIME '10:10',
      'COMPLETED', 0, 50, 0, now(), now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ot_bookings WHERE tenant_id = v_tenant AND booking_number = 'OT-DEMO-002') THEN
    INSERT INTO ot_bookings (
      id, tenant_id, booking_number, location_id, patient_id, ot_room_id,
      primary_surgeon_id, assisting_surgeons,
      procedure_name, procedure_code, surgery_type, anesthesia_type,
      scheduled_date, scheduled_start, expected_duration_mins,
      actual_start, status,
      blood_units_reserved, created_at, updated_at
    ) VALUES (
      gen_random_uuid()::text, v_tenant, 'OT-DEMO-002', v_location, v_patient_2, v_ot_room_id,
      v_surgeon, ARRAY[]::text[],
      'Cholecystectomy (Open)', 'CH-OP', 'ELECTIVE', 'GENERAL',
      CURRENT_DATE, to_char(now(), 'HH24:MI'), 90,
      now() - INTERVAL '20 minutes',
      'IN_PROGRESS', 2, now(), now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ot_bookings WHERE tenant_id = v_tenant AND booking_number = 'OT-DEMO-003') THEN
    INSERT INTO ot_bookings (
      id, tenant_id, booking_number, location_id, patient_id, ot_room_id,
      primary_surgeon_id, assisting_surgeons,
      procedure_name, procedure_code, surgery_type, anesthesia_type,
      scheduled_date, scheduled_start, expected_duration_mins,
      status, blood_units_reserved, created_at, updated_at
    ) VALUES (
      gen_random_uuid()::text, v_tenant, 'OT-DEMO-003', v_location, v_patient_3, v_ot_room_id,
      v_surgeon, ARRAY[]::text[],
      'Total Knee Replacement (Right)', 'TKR-R', 'ELECTIVE', 'SPINAL',
      (CURRENT_DATE + INTERVAL '1 day')::date, '08:30', 180,
      'SCHEDULED', 2, now(), now()
    );
  END IF;

  -- 3) Two blood transfusions: one ORDERED awaiting cross-match (the demo
  --    target), one COMPLETED for history.
  IF NOT EXISTS (SELECT 1 FROM blood_transfusions WHERE tenant_id = v_tenant AND bag_number = 'BAG-DEMO-A+') THEN
    INSERT INTO blood_transfusions (
      id, tenant_id, location_id, patient_id, bag_number, component,
      blood_group, rh_factor, volume_ml,
      cross_match_verified, ordered_by, status, notes, created_at
    ) VALUES (
      gen_random_uuid()::text, v_tenant, v_location, v_patient_1, 'BAG-DEMO-A+', 'PACKED_RED_CELLS',
      'A', 'POSITIVE', 350,
      false, v_surgeon, 'ORDERED',
      'Pre-op transfusion for laparoscopy. Awaiting cross-match verification.', now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM blood_transfusions WHERE tenant_id = v_tenant AND bag_number = 'BAG-DEMO-O+') THEN
    INSERT INTO blood_transfusions (
      id, tenant_id, location_id, patient_id, bag_number, component,
      blood_group, rh_factor, volume_ml,
      cross_match_verified, cross_match_by, ordered_by,
      start_time, end_time, status, administered_by, notes, created_at
    ) VALUES (
      gen_random_uuid()::text, v_tenant, v_location, v_patient_2, 'BAG-DEMO-O+', 'WHOLE_BLOOD',
      'O', 'POSITIVE', 450,
      true, v_nurse, v_surgeon,
      now() - INTERVAL '2 days', now() - INTERVAL '2 days' + INTERVAL '2 hours',
      'COMPLETED', v_nurse,
      'Intra-op transfusion, no reaction.', now() - INTERVAL '2 days'
    );
  END IF;

  -- 4) One insurance claim against an existing policy + invoice — gives the
  --    Insurance module a row to show.
  IF NOT EXISTS (SELECT 1 FROM insurance_claims WHERE tenant_id = v_tenant AND claim_number = 'CLM-DEMO-001') THEN
    INSERT INTO insurance_claims (
      id, tenant_id, claim_number, policy_id, patient_id, invoice_id,
      claim_type, claim_amount, submitted_at, status, created_at, updated_at
    ) VALUES (
      gen_random_uuid()::text, v_tenant, 'CLM-DEMO-001', v_policy, v_patient_1, v_invoice,
      'OPD', 4500.00, now() - INTERVAL '1 day', 'SUBMITTED', now(), now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM insurance_claims WHERE tenant_id = v_tenant AND claim_number = 'CLM-DEMO-002') THEN
    INSERT INTO insurance_claims (
      id, tenant_id, claim_number, policy_id, patient_id, invoice_id,
      claim_type, pre_auth_code, pre_auth_amount, pre_auth_status, pre_auth_date,
      claim_amount, approved_amount, settled_amount,
      submitted_at, approved_at, settled_at,
      status, created_at, updated_at
    ) VALUES (
      gen_random_uuid()::text, v_tenant, 'CLM-DEMO-002', v_policy, v_patient_2, v_invoice,
      'IPD', 'PA-2026-DEMO', 25000.00, 'APPROVED', now() - INTERVAL '5 days',
      28500.00, 26800.00, 26800.00,
      now() - INTERVAL '4 days', now() - INTERVAL '2 days', now() - INTERVAL '1 day',
      'SETTLED', now() - INTERVAL '5 days', now()
    );
  END IF;

END $$;
