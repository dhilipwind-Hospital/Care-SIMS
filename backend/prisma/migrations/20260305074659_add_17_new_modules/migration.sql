-- CreateTable
CREATE TABLE "blood_donors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "rh_factor" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" JSONB,
    "national_id" TEXT,
    "last_donation_date" TIMESTAMP(3),
    "total_donations" INTEGER NOT NULL DEFAULT 0,
    "is_eligible" BOOLEAN NOT NULL DEFAULT true,
    "deferral_reason" TEXT,
    "deferral_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_donations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "donation_number" TEXT NOT NULL,
    "donation_type" TEXT NOT NULL DEFAULT 'VOLUNTARY',
    "bag_number" TEXT NOT NULL,
    "collection_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "volume_ml" INTEGER NOT NULL DEFAULT 450,
    "blood_group" TEXT NOT NULL,
    "rh_factor" TEXT NOT NULL,
    "hemoglobin_gdl" DECIMAL(4,1),
    "screening_result" TEXT,
    "hiv_status" TEXT,
    "hbs_ag_status" TEXT,
    "hcv_status" TEXT,
    "vdrl_status" TEXT,
    "malaria_status" TEXT,
    "components_separated" BOOLEAN NOT NULL DEFAULT false,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COLLECTED',
    "collected_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_inventory" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "bag_number" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "rh_factor" TEXT NOT NULL,
    "volume_ml" INTEGER NOT NULL,
    "collection_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "storage_temp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "reserved_for" TEXT,
    "issued_to" TEXT,
    "issued_at" TIMESTAMP(3),
    "issued_by" TEXT,
    "cross_match_result" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_transfusions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "bag_number" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "rh_factor" TEXT NOT NULL,
    "volume_ml" INTEGER NOT NULL,
    "cross_match_verified" BOOLEAN NOT NULL DEFAULT false,
    "cross_match_by" TEXT,
    "ordered_by" TEXT NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "reaction" TEXT,
    "reaction_details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "administered_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_transfusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "consultation_id" TEXT,
    "admission_id" TEXT,
    "modality" TEXT NOT NULL,
    "exam_type" TEXT NOT NULL,
    "body_part" TEXT NOT NULL,
    "laterality" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "clinical_history" TEXT,
    "contrast" BOOLEAN NOT NULL DEFAULT false,
    "contrast_allergy" BOOLEAN NOT NULL DEFAULT false,
    "pregnancy_status" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "performed_at" TIMESTAMP(3),
    "performed_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radiology_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_results" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "findings" TEXT,
    "impression" TEXT,
    "recommendation" TEXT,
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "critical_notified_at" TIMESTAMP(3),
    "image_urls" TEXT[],
    "report_url" TEXT,
    "reported_by" TEXT,
    "reported_at" TIMESTAMP(3),
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radiology_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "policy_number" TEXT NOT NULL,
    "group_number" TEXT,
    "tpa_name" TEXT,
    "plan_type" TEXT NOT NULL,
    "coverage_amount" DECIMAL(12,2) NOT NULL,
    "used_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "copay_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "deductible" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "primary_insured" TEXT,
    "relationship" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claims" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "claim_number" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "invoice_id" TEXT,
    "claim_type" TEXT NOT NULL,
    "pre_auth_code" TEXT,
    "pre_auth_amount" DECIMAL(12,2),
    "pre_auth_status" TEXT,
    "pre_auth_date" TIMESTAMP(3),
    "claim_amount" DECIMAL(12,2) NOT NULL,
    "approved_amount" DECIMAL(12,2),
    "settled_amount" DECIMAL(12,2),
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "documents" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "processed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "referral_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "referring_doctor_id" TEXT NOT NULL,
    "referring_doctor_name" TEXT NOT NULL,
    "referred_to_doctor_id" TEXT,
    "referred_to_doctor_name" TEXT,
    "referred_to_dept_id" TEXT,
    "referred_to_dept_name" TEXT,
    "referred_to_location_id" TEXT,
    "referral_type" TEXT NOT NULL DEFAULT 'INTERNAL',
    "urgency" TEXT NOT NULL DEFAULT 'ROUTINE',
    "reason" TEXT NOT NULL,
    "clinical_summary" TEXT,
    "diagnosis" TEXT,
    "appointment_id" TEXT,
    "consultation_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "declined_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_beds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "ward_id" TEXT NOT NULL,
    "bed_number" TEXT NOT NULL,
    "icu_type" TEXT NOT NULL,
    "has_ventilator" BOOLEAN NOT NULL DEFAULT false,
    "has_monitor" BOOLEAN NOT NULL DEFAULT true,
    "has_dialysis" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "current_patient_id" TEXT,
    "admitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_monitoring" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "icu_bed_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "heart_rate" INTEGER,
    "respiratory_rate" INTEGER,
    "spo2" DECIMAL(4,1),
    "temperature_c" DECIMAL(4,1),
    "gcs" INTEGER,
    "pupil_reaction" TEXT,
    "ventilator_mode" TEXT,
    "fio2" DECIMAL(4,1),
    "peep" DECIMAL(4,1),
    "tidal_volume" INTEGER,
    "cvp" INTEGER,
    "urine_output_ml" INTEGER,
    "io_balance" INTEGER,
    "blood_sugar_mg" DECIMAL(5,1),
    "infusions" JSONB,
    "sedation_score" INTEGER,
    "pain_score" INTEGER,
    "nurses_notes" TEXT,
    "recorded_by" TEXT NOT NULL,

    CONSTRAINT "icu_monitoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teleconsult_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_code" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "consultation_id" TEXT,
    "session_type" TEXT NOT NULL DEFAULT 'VIDEO',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "room_url" TEXT,
    "recording_url" TEXT,
    "patient_joined" BOOLEAN NOT NULL DEFAULT false,
    "doctor_joined" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "cancelled_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teleconsult_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialysis_machines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "machine_number" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "last_service_date" TIMESTAMP(3),
    "next_service_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dialysis_machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialysis_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "dialysis_type" TEXT NOT NULL DEFAULT 'HEMODIALYSIS',
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 240,
    "access_type" TEXT,
    "dialyzer_type" TEXT,
    "blood_flow_rate" INTEGER,
    "dialysate_flow_rate" INTEGER,
    "dry_weight_kg" DECIMAL(5,1),
    "pre_weight_kg" DECIMAL(5,1),
    "post_weight_kg" DECIMAL(5,1),
    "uf_goal_ml" INTEGER,
    "uf_achieved_ml" INTEGER,
    "pre_bp" TEXT,
    "post_bp" TEXT,
    "complications" TEXT[],
    "heparin_dose" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "nurse_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dialysis_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physiotherapy_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "diagnosis" TEXT NOT NULL,
    "treatment_plan" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "total_sessions" INTEGER NOT NULL,
    "completed_sessions" INTEGER NOT NULL DEFAULT 0,
    "precautions" TEXT,
    "goals" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "therapist_id" TEXT,
    "therapist_name" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physiotherapy_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physiotherapy_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "session_number" INTEGER NOT NULL,
    "session_date" DATE NOT NULL,
    "treatment_given" TEXT NOT NULL,
    "pain_before" INTEGER,
    "pain_after" INTEGER,
    "rom_before" TEXT,
    "rom_after" TEXT,
    "patient_response" TEXT,
    "home_exercises" TEXT,
    "therapist_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physiotherapy_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "vehicle_number" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "equipment_level" TEXT NOT NULL DEFAULT 'BLS',
    "driver_name" TEXT,
    "driver_phone" TEXT,
    "paramedic_name" TEXT,
    "paramedic_phone" TEXT,
    "insurance_expiry" DATE,
    "fitness_expiry" DATE,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ambulances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulance_trips" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "trip_number" TEXT NOT NULL,
    "ambulance_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "patient_name" TEXT,
    "patient_phone" TEXT,
    "trip_type" TEXT NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "drop_address" TEXT NOT NULL,
    "dispatch_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrival_time" TIMESTAMP(3),
    "departure_time" TIMESTAMP(3),
    "completed_time" TIMESTAMP(3),
    "distance_km" DECIMAL(6,1),
    "odometer_start" INTEGER,
    "odometer_end" INTEGER,
    "condition" TEXT,
    "vitals_en_route" JSONB,
    "treatment_given" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISPATCHED',
    "dispatched_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ambulance_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_attendance" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "department_id" TEXT,
    "attendance_date" DATE NOT NULL,
    "shift_type" TEXT NOT NULL,
    "clock_in" TIMESTAMP(3),
    "clock_out" TIMESTAMP(3),
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "leave_type" TEXT,
    "leave_reason" TEXT,
    "approved_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "item_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "unit_of_measure" TEXT NOT NULL,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "reorder_level" INTEGER NOT NULL DEFAULT 10,
    "max_stock_level" INTEGER NOT NULL DEFAULT 100,
    "unit_cost" DECIMAL(10,2),
    "supplier" TEXT,
    "storage_location" TEXT,
    "is_consumable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_restocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "department_id" TEXT,
    "remarks" TEXT,
    "performed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "asset_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "purchase_date" DATE,
    "purchase_cost" DECIMAL(12,2),
    "warranty_expiry" DATE,
    "department_id" TEXT,
    "assigned_to" TEXT,
    "assigned_to_name" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "last_maintenance_date" TIMESTAMP(3),
    "next_maintenance_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "disposal_date" TIMESTAMP(3),
    "disposal_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenance" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performed_by" TEXT,
    "performed_by_name" TEXT,
    "vendor" TEXT,
    "cost" DECIMAL(10,2),
    "scheduled_date" DATE,
    "completed_date" DATE,
    "next_due_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grievances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "complainant_type" TEXT NOT NULL,
    "complainant_name" TEXT NOT NULL,
    "complainant_phone" TEXT,
    "complainant_email" TEXT,
    "patient_id" TEXT,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department_id" TEXT,
    "assigned_to" TEXT,
    "assigned_to_name" TEXT,
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "satisfaction_score" INTEGER,
    "escalated_to" TEXT,
    "escalated_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grievances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "infection_control_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "patient_id" TEXT,
    "admission_id" TEXT,
    "ward_id" TEXT,
    "organism" TEXT,
    "infection_site" TEXT,
    "infection_type" TEXT,
    "isolation_type" TEXT,
    "onset_date" TIMESTAMP(3),
    "culture_date" TIMESTAMP(3),
    "antibiotic_sensitivity" JSONB,
    "is_hai" BOOLEAN NOT NULL DEFAULT false,
    "reported_by" TEXT NOT NULL,
    "reported_by_name" TEXT NOT NULL,
    "actions_taken" TEXT,
    "outcome" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "resolved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infection_control_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_forms" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "consent_type" TEXT NOT NULL,
    "procedure_name" TEXT,
    "description" TEXT NOT NULL,
    "risks" TEXT,
    "alternatives" TEXT,
    "consent_given_by" TEXT NOT NULL,
    "relationship" TEXT,
    "witness_name" TEXT,
    "witness_id" TEXT,
    "doctor_id" TEXT NOT NULL,
    "doctor_name" TEXT NOT NULL,
    "signature_url" TEXT,
    "consent_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SIGNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "ward_id" TEXT,
    "bed_id" TEXT,
    "doctor_id" TEXT NOT NULL,
    "diet_type" TEXT NOT NULL,
    "caloric_target" INTEGER,
    "protein_target" INTEGER,
    "restrictions" TEXT[],
    "allergies" TEXT[],
    "preferences" TEXT,
    "special_instructions" TEXT,
    "npo_status" BOOLEAN NOT NULL DEFAULT false,
    "npo_reason" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diet_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_meals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "meal_type" TEXT NOT NULL,
    "meal_date" DATE NOT NULL,
    "items" JSONB NOT NULL,
    "served_at" TIMESTAMP(3),
    "served_by" TEXT,
    "consumed_percent" INTEGER,
    "refusal_reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diet_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mortuary_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "record_number" TEXT NOT NULL,
    "patient_id" TEXT,
    "admission_id" TEXT,
    "deceased_name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT NOT NULL,
    "date_of_death" TIMESTAMP(3) NOT NULL,
    "time_of_death" TEXT,
    "cause_of_death" TEXT,
    "attending_doctor_id" TEXT,
    "pronounced_by" TEXT,
    "death_certificate_no" TEXT,
    "unit_number" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "released_to" TEXT,
    "released_to_relation" TEXT,
    "released_to_id" TEXT,
    "police_notified" BOOLEAN NOT NULL DEFAULT false,
    "autopsy_required" BOOLEAN NOT NULL DEFAULT false,
    "autopsy_status" TEXT,
    "embalmed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'IN_CUSTODY',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mortuary_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blood_donors_donor_id_key" ON "blood_donors"("donor_id");

-- CreateIndex
CREATE INDEX "blood_donors_tenant_id_blood_group_idx" ON "blood_donors"("tenant_id", "blood_group");

-- CreateIndex
CREATE UNIQUE INDEX "blood_donations_donation_number_key" ON "blood_donations"("donation_number");

-- CreateIndex
CREATE INDEX "blood_donations_tenant_id_blood_group_status_idx" ON "blood_donations"("tenant_id", "blood_group", "status");

-- CreateIndex
CREATE INDEX "blood_inventory_tenant_id_blood_group_status_idx" ON "blood_inventory"("tenant_id", "blood_group", "status");

-- CreateIndex
CREATE UNIQUE INDEX "blood_inventory_tenant_id_bag_number_component_key" ON "blood_inventory"("tenant_id", "bag_number", "component");

-- CreateIndex
CREATE INDEX "blood_transfusions_tenant_id_patient_id_idx" ON "blood_transfusions"("tenant_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_orders_order_number_key" ON "radiology_orders"("order_number");

-- CreateIndex
CREATE INDEX "radiology_orders_tenant_id_status_idx" ON "radiology_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "insurance_policies_tenant_id_patient_id_idx" ON "insurance_policies"("tenant_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_claims_claim_number_key" ON "insurance_claims"("claim_number");

-- CreateIndex
CREATE INDEX "insurance_claims_tenant_id_status_idx" ON "insurance_claims"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referral_number_key" ON "referrals"("referral_number");

-- CreateIndex
CREATE INDEX "referrals_tenant_id_status_idx" ON "referrals"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "icu_beds_tenant_id_ward_id_bed_number_key" ON "icu_beds"("tenant_id", "ward_id", "bed_number");

-- CreateIndex
CREATE INDEX "icu_monitoring_tenant_id_admission_id_idx" ON "icu_monitoring"("tenant_id", "admission_id");

-- CreateIndex
CREATE UNIQUE INDEX "teleconsult_sessions_session_code_key" ON "teleconsult_sessions"("session_code");

-- CreateIndex
CREATE INDEX "teleconsult_sessions_tenant_id_doctor_id_status_idx" ON "teleconsult_sessions"("tenant_id", "doctor_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dialysis_machines_tenant_id_location_id_machine_number_key" ON "dialysis_machines"("tenant_id", "location_id", "machine_number");

-- CreateIndex
CREATE UNIQUE INDEX "dialysis_sessions_session_number_key" ON "dialysis_sessions"("session_number");

-- CreateIndex
CREATE INDEX "dialysis_sessions_tenant_id_scheduled_date_idx" ON "dialysis_sessions"("tenant_id", "scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "physiotherapy_orders_order_number_key" ON "physiotherapy_orders"("order_number");

-- CreateIndex
CREATE INDEX "physiotherapy_orders_tenant_id_status_idx" ON "physiotherapy_orders"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_tenant_id_vehicle_number_key" ON "ambulances"("tenant_id", "vehicle_number");

-- CreateIndex
CREATE UNIQUE INDEX "ambulance_trips_trip_number_key" ON "ambulance_trips"("trip_number");

-- CreateIndex
CREATE INDEX "ambulance_trips_tenant_id_status_idx" ON "ambulance_trips"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "staff_attendance_tenant_id_attendance_date_idx" ON "staff_attendance"("tenant_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "staff_attendance_tenant_id_user_id_attendance_date_key" ON "staff_attendance"("tenant_id", "user_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_tenant_id_location_id_item_code_key" ON "inventory_items"("tenant_id", "location_id", "item_code");

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_id_item_id_idx" ON "inventory_transactions"("tenant_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_tenant_id_asset_code_key" ON "assets"("tenant_id", "asset_code");

-- CreateIndex
CREATE UNIQUE INDEX "grievances_ticket_number_key" ON "grievances"("ticket_number");

-- CreateIndex
CREATE INDEX "grievances_tenant_id_status_idx" ON "grievances"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "infection_control_records_tenant_id_status_idx" ON "infection_control_records"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "consent_forms_tenant_id_patient_id_idx" ON "consent_forms"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "diet_orders_tenant_id_admission_id_idx" ON "diet_orders"("tenant_id", "admission_id");

-- CreateIndex
CREATE UNIQUE INDEX "mortuary_records_record_number_key" ON "mortuary_records"("record_number");

-- CreateIndex
CREATE INDEX "mortuary_records_tenant_id_status_idx" ON "mortuary_records"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "blood_donations" ADD CONSTRAINT "blood_donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "blood_donors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_results" ADD CONSTRAINT "radiology_results_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "radiology_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "insurance_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dialysis_sessions" ADD CONSTRAINT "dialysis_sessions_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "dialysis_machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physiotherapy_sessions" ADD CONSTRAINT "physiotherapy_sessions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "physiotherapy_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_trips" ADD CONSTRAINT "ambulance_trips_ambulance_id_fkey" FOREIGN KEY ("ambulance_id") REFERENCES "ambulances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_meals" ADD CONSTRAINT "diet_meals_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "diet_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
