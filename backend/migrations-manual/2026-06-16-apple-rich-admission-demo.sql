-- One rich admission on the Apple tenant with full clinical workflow
-- recorded so the AI Discharge Summary draft has real material to
-- summarize instead of falling back to "To be reviewed" placeholders.
--
-- Story: 52F admitted with community-acquired pneumonia + sepsis, IV
-- antibiotics + supportive care, 4-day stay, discharged stable.
--
-- Includes:
--   1 admission (ADM-2026-DEMO-001) with admission + discharge diagnoses
--   2 consultations (admission day + pre-discharge day)
--   4 consultation diagnoses (CAP, sepsis, AKI, anaemia)
--   1 prescription with 5 items issued during the stay
--   1 lab order (CBC + CRP + ABG + blood culture) with results
--
-- Idempotent: all inserts guarded with NOT EXISTS.

DO $$
DECLARE
  v_tenant     TEXT := '129a7a75-325e-4027-889f-2e87bdc7b5ab';
  v_location   TEXT := '0d7fc73e-855f-4786-917d-bdedf2e54878';
  v_patient    TEXT := '9766efd3-e974-47a4-8fbd-1187f171f514';
  v_doctor     TEXT := 'd48e0d6b-9694-411f-9f4c-5eb6ead8e8da';
  v_nurse      TEXT := '02d0934e-2ec0-42ec-b6f6-898f46c10717';
  v_adm_id     TEXT;
  v_consult1   TEXT;
  v_consult2   TEXT;
  v_rx_id      TEXT;
  v_lab_id     TEXT;
  v_result_id  TEXT;
  v_adm_date   TIMESTAMP := (now() - INTERVAL '4 days');
  v_dis_date   TIMESTAMP := (now() - INTERVAL '0 days');
BEGIN

  -- 1) ADMISSION
  SELECT id INTO v_adm_id FROM admissions
   WHERE tenant_id = v_tenant AND admission_number = 'ADM-2026-DEMO-001';
  IF v_adm_id IS NULL THEN
    v_adm_id := gen_random_uuid()::text;
    INSERT INTO admissions (
      id, tenant_id, admission_number, location_id, patient_id,
      admitting_doctor_id, admission_date, admission_type,
      diagnosis_on_admission, expected_discharge_date,
      discharge_date, discharge_type, discharge_diagnosis,
      status, billing_cleared, pharmacy_cleared,
      package_name, daily_bed_charge, created_at, updated_at
    ) VALUES (
      v_adm_id, v_tenant, 'ADM-2026-DEMO-001', v_location, v_patient,
      v_doctor, v_adm_date, 'EMERGENCY',
      'Community-acquired pneumonia (right lower lobe) with sepsis and acute kidney injury',
      (v_dis_date::date),
      v_dis_date, 'ROUTINE',
      'Resolved community-acquired pneumonia; sepsis resolved; AKI improving',
      'DISCHARGED', false, false,
      'IPD General Ward Package', 2500.00, now(), now()
    );
  END IF;

  -- 2) CONSULTATION 1 — Admission day
  SELECT id INTO v_consult1 FROM consultations
   WHERE tenant_id = v_tenant AND patient_id = v_patient
     AND started_at = v_adm_date + INTERVAL '1 hour';
  IF v_consult1 IS NULL THEN
    v_consult1 := gen_random_uuid()::text;
    INSERT INTO consultations (
      id, tenant_id, location_id, patient_id, doctor_id,
      chief_complaint, history_subjective, history_objective,
      assessment, plan, status, started_at, completed_at,
      created_at, updated_at
    ) VALUES (
      v_consult1, v_tenant, v_location, v_patient, v_doctor,
      'Fever, productive cough, right-sided chest pain x 4 days, worsening breathlessness today',
      'Productive cough with yellow-green sputum, high-grade fever with chills, pleuritic chest pain right side, increasing dyspnoea on exertion. No haemoptysis, no recent travel.',
      'Vitals: BP 92/56, HR 112, Temp 39.4°C, SpO2 89% on room air, RR 28. Chest: bronchial breath sounds + crepitations right base. Mildly drowsy.',
      'Community-acquired pneumonia (right lower lobe) complicated by sepsis. AKI likely pre-renal. Risk score CURB-65 = 2 (urea pending). Mild normocytic anaemia.',
      '1) Admit to general ward with continuous SpO2 monitoring. 2) IV fluid resuscitation — 1L NS bolus then maintenance. 3) IV Ceftriaxone 2g OD + IV Azithromycin 500mg OD x 5 days. 4) Paracetamol PRN. 5) Pantoprazole IV for stress ulcer prophylaxis. 6) Investigations: CBC, CRP, ABG, blood culture, RFT, chest X-ray. 7) Oxygen via NP to keep SpO2 > 94%.',
      'COMPLETED', v_adm_date + INTERVAL '1 hour', v_adm_date + INTERVAL '90 minutes',
      now(), now()
    );

    INSERT INTO consultation_diagnoses (id, consultation_id, icd_code, description, type, sort_order) VALUES
      (gen_random_uuid()::text, v_consult1, 'J18.1', 'Community-acquired pneumonia, right lower lobe',           'PRIMARY',   0),
      (gen_random_uuid()::text, v_consult1, 'A41.9', 'Sepsis (unspecified organism)',                            'SECONDARY', 1),
      (gen_random_uuid()::text, v_consult1, 'N17.9', 'Acute kidney injury, unspecified',                         'SECONDARY', 2),
      (gen_random_uuid()::text, v_consult1, 'D64.9', 'Anaemia, unspecified (mild normocytic)',                   'SECONDARY', 3);
  END IF;

  -- 3) CONSULTATION 2 — Pre-discharge day
  SELECT id INTO v_consult2 FROM consultations
   WHERE tenant_id = v_tenant AND patient_id = v_patient
     AND started_at = v_dis_date - INTERVAL '4 hours';
  IF v_consult2 IS NULL THEN
    v_consult2 := gen_random_uuid()::text;
    INSERT INTO consultations (
      id, tenant_id, location_id, patient_id, doctor_id,
      chief_complaint, history_subjective, history_objective,
      assessment, plan, status, started_at, completed_at,
      created_at, updated_at
    ) VALUES (
      v_consult2, v_tenant, v_location, v_patient, v_doctor,
      'Pre-discharge review',
      'Patient reports symptoms much improved. Afebrile for 36 hours, cough less productive, breathlessness resolved on room air. Appetite returning. Mobilising independently.',
      'Vitals: BP 118/74, HR 84, Temp 37.0°C, SpO2 96% room air, RR 16. Chest: residual right basal crackles, no bronchial breathing. Hydration adequate, urine output normal.',
      'Recovering well from community-acquired pneumonia and sepsis. Clinically fit for discharge with oral antibiotic completion at home. AKI resolved (creatinine normalised). Anaemia mild and chronic — outpatient workup.',
      '1) Complete oral antibiotic course at home: Cefpodoxime 200mg BD x 5 days + Azithromycin 500mg OD x 2 more days. 2) Salbutamol inhaler PRN for any residual wheeze. 3) Adequate hydration, soft diet, gradual return to activity. 4) Follow-up OPD in 1 week with repeat chest X-ray. 5) Return precautions: high-grade fever, breathlessness, chest pain, haemoptysis. 6) Outpatient anaemia workup (iron studies, B12/folate).',
      'COMPLETED', v_dis_date - INTERVAL '4 hours', v_dis_date - INTERVAL '3 hours',
      now(), now()
    );

    INSERT INTO consultation_diagnoses (id, consultation_id, icd_code, description, type, sort_order) VALUES
      (gen_random_uuid()::text, v_consult2, 'J18.1', 'Resolving community-acquired pneumonia, right lower lobe', 'PRIMARY',   0),
      (gen_random_uuid()::text, v_consult2, 'A41.9', 'Resolved sepsis',                                          'SECONDARY', 1),
      (gen_random_uuid()::text, v_consult2, 'D64.9', 'Mild normocytic anaemia (chronic — outpatient workup)',    'SECONDARY', 2);
  END IF;

  -- 4) PRESCRIPTION issued during the stay
  SELECT id INTO v_rx_id FROM prescriptions
   WHERE tenant_id = v_tenant AND rx_number = 'RX-DEMO-ADM-001';
  IF v_rx_id IS NULL THEN
    v_rx_id := gen_random_uuid()::text;
    INSERT INTO prescriptions (
      id, tenant_id, rx_number, location_id, consultation_id,
      patient_id, doctor_id, status, validity_date, notes,
      issued_at, created_at
    ) VALUES (
      v_rx_id, v_tenant, 'RX-DEMO-ADM-001', v_location, v_consult1,
      v_patient, v_doctor, 'DISPENSED', (v_dis_date + INTERVAL '30 days')::date,
      'Inpatient antibiotic + supportive therapy for CAP with sepsis',
      v_adm_date + INTERVAL '2 hours', now()
    );

    INSERT INTO prescription_items (id, prescription_id, drug_name, generic_name, strength, dosage, frequency, duration_days, route, instructions, quantity, status, sort_order) VALUES
      (gen_random_uuid()::text, v_rx_id, 'Ceftriaxone',   'Ceftriaxone sodium', '2 g',     '2 g',    'OD',  5, 'IV',   'Slow IV over 30 min in 100 ml NS',           5, 'DISPENSED', 0),
      (gen_random_uuid()::text, v_rx_id, 'Azithromycin',  'Azithromycin',       '500 mg',  '500 mg', 'OD',  5, 'IV',   'IV during admission; switch to PO at discharge', 5, 'DISPENSED', 1),
      (gen_random_uuid()::text, v_rx_id, 'Paracetamol',   'Paracetamol',        '1 g',     '1 g',    'TDS PRN', 4, 'IV', 'For fever > 38.5°C or pain',              12, 'DISPENSED', 2),
      (gen_random_uuid()::text, v_rx_id, 'Pantoprazole',  'Pantoprazole',       '40 mg',   '40 mg',  'OD',  4, 'IV',   'Stress ulcer prophylaxis',                   4, 'DISPENSED', 3),
      (gen_random_uuid()::text, v_rx_id, 'Normal Saline', 'Sodium chloride 0.9%','500 ml', '500 ml', 'TDS', 2, 'IV',   'Maintenance fluids until oral intake adequate', 6, 'DISPENSED', 4);
  END IF;

  -- 5) LAB ORDER + RESULTS
  SELECT id INTO v_lab_id FROM lab_orders
   WHERE tenant_id = v_tenant AND order_number = 'LAB-DEMO-ADM-001';
  IF v_lab_id IS NULL THEN
    v_lab_id := gen_random_uuid()::text;
    INSERT INTO lab_orders (
      id, tenant_id, order_number, location_id, consultation_id,
      patient_id, doctor_id, priority, fasting_required, clinical_notes,
      status, ordered_at
    ) VALUES (
      v_lab_id, v_tenant, 'LAB-DEMO-ADM-001', v_location, v_consult1,
      v_patient, v_doctor, 'STAT', false,
      'Admission workup: CAP with sepsis; rule out organ dysfunction',
      'RESULTED', v_adm_date + INTERVAL '90 minutes'
    );

    INSERT INTO lab_order_items (id, lab_order_id, test_code, test_name, category, urgency, status) VALUES
      (gen_random_uuid()::text, v_lab_id, 'CBC',  'Complete Blood Count', 'HEMATOLOGY',   'STAT', 'COMPLETED'),
      (gen_random_uuid()::text, v_lab_id, 'CRP',  'C-Reactive Protein',   'BIOCHEMISTRY', 'STAT', 'COMPLETED'),
      (gen_random_uuid()::text, v_lab_id, 'RFT',  'Renal Function Test',  'BIOCHEMISTRY', 'STAT', 'COMPLETED'),
      (gen_random_uuid()::text, v_lab_id, 'BC',   'Blood Culture',        'MICROBIOLOGY', 'STAT', 'COMPLETED');

    v_result_id := gen_random_uuid()::text;
    -- NB: the Prisma field is validatedById but the actual column is
    -- `validated_by` (per `@map("validated_by")` in the schema).
    INSERT INTO lab_results (
      id, tenant_id, lab_order_id, location_id, validated_by, validated_at,
      is_critical, notes, status, created_at
    ) VALUES (
      v_result_id, v_tenant, v_lab_id, v_location, v_doctor, v_adm_date + INTERVAL '4 hours',
      true, 'Leucocytosis with neutrophilia; CRP markedly raised; AKI; blood culture positive for S. pneumoniae',
      'VALIDATED', v_adm_date + INTERVAL '4 hours'
    );

    INSERT INTO lab_result_items (id, lab_result_id, test_name, result_value, result_unit, ref_range_low, ref_range_high, ref_range_text, flag, sort_order) VALUES
      (gen_random_uuid()::text, v_result_id, 'Hemoglobin',     '10.2', 'g/dL',  12.0, 16.0, '12.0 - 16.0',  'L',  0),
      (gen_random_uuid()::text, v_result_id, 'Total WBC',      '21.4', '10^3/uL', 4.0, 11.0, '4.0 - 11.0',  'H',  1),
      (gen_random_uuid()::text, v_result_id, 'Neutrophils',    '88',   '%',     40,   75,   '40 - 75',     'H',  2),
      (gen_random_uuid()::text, v_result_id, 'Platelets',      '178',  '10^3/uL', 150, 450, '150 - 450',   'NORMAL', 3),
      (gen_random_uuid()::text, v_result_id, 'CRP',            '198',  'mg/L',  0,    5,    '< 5',          'H',  4),
      (gen_random_uuid()::text, v_result_id, 'Creatinine',     '1.9',  'mg/dL', 0.6,  1.1,  '0.6 - 1.1',    'H',  5),
      (gen_random_uuid()::text, v_result_id, 'Urea',           '64',   'mg/dL', 15,   40,   '15 - 40',      'H',  6),
      (gen_random_uuid()::text, v_result_id, 'Sodium',         '138',  'mmol/L', 135, 145, '135 - 145',    'NORMAL', 7),
      (gen_random_uuid()::text, v_result_id, 'Potassium',      '4.2',  'mmol/L', 3.5, 5.0, '3.5 - 5.0',    'NORMAL', 8),
      (gen_random_uuid()::text, v_result_id, 'Blood Culture',  'Streptococcus pneumoniae — sensitive to penicillin, ceftriaxone, azithromycin', NULL, NULL, NULL, 'No growth', 'CRITICAL', 9);
  END IF;

END $$;
