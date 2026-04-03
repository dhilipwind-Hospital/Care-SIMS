-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "platform_role" TEXT NOT NULL DEFAULT 'SUPPORT',
    "mfa_secret" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "org_type" TEXT NOT NULL,
    "reg_number" TEXT,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "nabh_number" TEXT,
    "nabl_number" TEXT,
    "primary_email" TEXT NOT NULL,
    "primary_phone" TEXT NOT NULL,
    "website" TEXT,
    "logo_url" TEXT,
    "subscription_plan" TEXT NOT NULL DEFAULT 'STARTER',
    "subscription_status" TEXT NOT NULL DEFAULT 'TRIAL',
    "trial_ends_at" TIMESTAMP(3),
    "billing_email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "country" TEXT NOT NULL DEFAULT 'IN',
    "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "allow_self_registration" BOOLEAN NOT NULL DEFAULT false,
    "allow_patient_portal" BOOLEAN NOT NULL DEFAULT false,
    "max_locations" INTEGER NOT NULL DEFAULT 1,
    "max_users" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "suspended_reason" TEXT,
    "suspended_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BRANCH',
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pin_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "phone" TEXT,
    "email" TEXT,
    "pharmacy_license_no" TEXT,
    "lab_license_no" TEXT,
    "gstin" TEXT,
    "operating_hours" JSONB,
    "emergency_available" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_modules" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "applicable_types" TEXT[],
    "min_plan" TEXT NOT NULL DEFAULT 'STARTER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_features" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "enabled_by" TEXT,
    "enabled_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_registry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "mfa_secret" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "photo_url" TEXT,
    "aadhaar_number" TEXT,
    "aadhaar_verified" BOOLEAN NOT NULL DEFAULT false,
    "primary_degree" TEXT NOT NULL,
    "pg_degree" TEXT,
    "pg_specialization" TEXT,
    "university" TEXT,
    "year_of_passing" INTEGER,
    "experience_years" INTEGER,
    "specialties" TEXT[],
    "subspecialties" TEXT[],
    "languages" TEXT[],
    "certifications" JSONB,
    "medical_council" TEXT NOT NULL,
    "registration_no" TEXT NOT NULL,
    "registration_date" TIMESTAMP(3) NOT NULL,
    "registration_expiry" TIMESTAMP(3),
    "reg_certificate_url" TEXT,
    "nmc_id" TEXT,
    "additional_registrations" JSONB,
    "bio" TEXT,
    "linkedin_url" TEXT,
    "ayphen_status" TEXT NOT NULL DEFAULT 'PENDING',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "suspension_reason" TEXT,
    "suspended_at" TIMESTAMP(3),
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_org_affiliations" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "designation" TEXT,
    "employment_type" TEXT NOT NULL,
    "department_name" TEXT,
    "available_days" TEXT[],
    "available_slots" JSONB,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "max_patients_per_day" INTEGER,
    "consultation_fee" DECIMAL(10,2),
    "location_scope" TEXT NOT NULL DEFAULT 'SINGLE',
    "allowed_locations" TEXT[],
    "cross_location_access" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "invited_by" TEXT,
    "invitation_sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "removal_reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_org_affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_email" TEXT,
    "target_type" TEXT,
    "target_id" TEXT,
    "target_name" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "mfa_secret" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "gender" TEXT,
    "photo_url" TEXT,
    "employee_id" TEXT,
    "role_id" TEXT NOT NULL,
    "primary_location_id" TEXT NOT NULL,
    "location_scope" TEXT NOT NULL DEFAULT 'SINGLE',
    "allowed_locations" TEXT[],
    "doctor_registry_id" TEXT,
    "last_login" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3),
    "force_password_change" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "registration_source" TEXT NOT NULL DEFAULT 'ADMIN_INVITE',
    "self_reg_approved_by" TEXT,
    "self_reg_approved_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system_role_id" TEXT,
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "tenant_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_role_special_flags" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tenant_role_special_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT,
    "head_user_id" TEXT,
    "phone_extension" TEXT,
    "color_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "registration_type" TEXT NOT NULL DEFAULT 'WALKIN',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "age_years" INTEGER,
    "gender" TEXT NOT NULL,
    "blood_group" TEXT,
    "national_id" TEXT,
    "photo_url" TEXT,
    "mobile" TEXT NOT NULL,
    "alternate_phone" TEXT,
    "email" TEXT,
    "address" JSONB,
    "emergency_contact" JSONB,
    "allergies" TEXT[],
    "allergy_details" JSONB,
    "existing_conditions" TEXT[],
    "current_medications" JSONB,
    "past_surgeries" TEXT,
    "family_history" TEXT,
    "insurance" JSONB,
    "registered_by" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "token_number" INTEGER NOT NULL,
    "location_id" TEXT NOT NULL,
    "queue_date" DATE NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "doctor_id" TEXT,
    "department_id" TEXT,
    "visit_type" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "check_in_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "called_time" TIMESTAMP(3),
    "consult_start" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "estimated_wait_minutes" INTEGER,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "department_id" TEXT,
    "appointment_date" DATE NOT NULL,
    "appointment_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "type" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'RECEPTION',
    "chief_complaint" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "cancelled_by" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "rescheduled_from" TEXT,
    "reminder_sent_24h" BOOLEAN NOT NULL DEFAULT false,
    "reminder_sent_1h" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "queue_token_id" TEXT,
    "appointment_id" TEXT,
    "chief_complaint" TEXT NOT NULL,
    "history_subjective" TEXT,
    "history_objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "examination_findings" JSONB,
    "vitals_snapshot" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "is_cross_location" BOOLEAN NOT NULL DEFAULT false,
    "original_location_id" TEXT,
    "access_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_diagnoses" (
    "id" TEXT NOT NULL,
    "consultation_id" TEXT NOT NULL,
    "icd_code" TEXT,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PRIMARY',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "consultation_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rx_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "consultation_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "validity_date" DATE NOT NULL,
    "notes" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_to_pharmacy_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "drug_id" TEXT,
    "drug_name" TEXT NOT NULL,
    "generic_name" TEXT,
    "dosage_form" TEXT,
    "strength" TEXT,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration_days" INTEGER,
    "route" TEXT,
    "instructions" TEXT,
    "quantity" DECIMAL(10,2),
    "refills_allowed" INTEGER NOT NULL DEFAULT 0,
    "is_controlled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "consultation_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "fasting_required" BOOLEAN NOT NULL DEFAULT false,
    "clinical_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_order_items" (
    "id" TEXT NOT NULL,
    "lab_order_id" TEXT NOT NULL,
    "test_code" TEXT,
    "test_name" TEXT NOT NULL,
    "category" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "lab_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lab_order_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "critical_notified_at" TIMESTAMP(3),
    "critical_ack_by" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VALIDATION',
    "amended_from" TEXT,
    "amendment_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_result_items" (
    "id" TEXT NOT NULL,
    "lab_result_id" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "result_value" TEXT,
    "result_unit" TEXT,
    "ref_range_low" DECIMAL(10,3),
    "ref_range_high" DECIMAL(10,3),
    "ref_range_text" TEXT,
    "flag" TEXT,
    "method" TEXT,
    "analyzer" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lab_result_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "queue_token_id" TEXT,
    "chief_complaint" TEXT NOT NULL,
    "symptoms" TEXT[],
    "triage_level" TEXT NOT NULL,
    "vitals_on_arrival" JSONB,
    "pain_score" INTEGER,
    "gcs" INTEGER,
    "assigned_doctor_id" TEXT,
    "assigned_dept_id" TEXT,
    "triaged_by" TEXT NOT NULL,
    "triage_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "triage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vitals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "consultation_id" TEXT,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "heart_rate" INTEGER,
    "respiratory_rate" INTEGER,
    "temperature_c" DECIMAL(4,1),
    "spo2" DECIMAL(4,1),
    "weight_kg" DECIMAL(5,1),
    "height_cm" DECIMAL(5,1),
    "blood_glucose_mg" DECIMAL(5,1),
    "pain_score" INTEGER,
    "gcs" INTEGER,
    "has_abnormal" BOOLEAN NOT NULL DEFAULT false,
    "abnormal_fields" TEXT[],
    "recorded_by" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "total_beds" INTEGER NOT NULL,
    "floor" INTEGER,
    "phone_extension" TEXT,
    "charge_nurse_id" TEXT,
    "is_isolation" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ward_id" TEXT NOT NULL,
    "bed_number" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "last_cleaned_at" TIMESTAMP(3),

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "admission_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "bed_id" TEXT,
    "ward_id" TEXT,
    "admitting_doctor_id" TEXT NOT NULL,
    "department_id" TEXT,
    "admission_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admission_type" TEXT NOT NULL DEFAULT 'PLANNED',
    "diagnosis_on_admission" TEXT NOT NULL,
    "expected_discharge_date" DATE,
    "discharge_date" TIMESTAMP(3),
    "discharge_type" TEXT,
    "discharge_diagnosis" TEXT,
    "discharge_summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "billing_cleared" BOOLEAN NOT NULL DEFAULT false,
    "pharmacy_cleared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "queue_token_id" TEXT,
    "doctor_id" TEXT,
    "department_id" TEXT,
    "invoice_type" TEXT NOT NULL DEFAULT 'OPD',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_reason" TEXT,
    "discount_approved_by" TEXT,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "insurance_provider" TEXT,
    "policy_number" TEXT,
    "tpa_name" TEXT,
    "pre_auth_code" TEXT,
    "insurance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "copay_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "claim_status" TEXT,
    "due_date" DATE,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "quantity" DECIMAL(8,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "reference_number" TEXT,
    "bank_name" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drugs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "generic_name" TEXT,
    "category" TEXT,
    "dosage_form" TEXT,
    "strength" TEXT,
    "manufacturer" TEXT,
    "hsn_code" TEXT,
    "gst_pct" DECIMAL(4,2) NOT NULL DEFAULT 12.00,
    "unit_of_measure" TEXT,
    "reorder_level" INTEGER NOT NULL DEFAULT 50,
    "max_stock_level" INTEGER NOT NULL DEFAULT 500,
    "storage_condition" TEXT NOT NULL DEFAULT 'ROOM_TEMPERATURE',
    "is_controlled" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_batches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "expiry_date" DATE NOT NULL,
    "quantity_in_stock" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(10,2),
    "shelf_location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "received_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_rooms" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "capacity_class" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ot_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_bookings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "ot_room_id" TEXT NOT NULL,
    "primary_surgeon_id" TEXT NOT NULL,
    "assisting_surgeons" TEXT[],
    "anesthetist_id" TEXT,
    "scrub_nurse_id" TEXT,
    "department_id" TEXT,
    "procedure_name" TEXT NOT NULL,
    "procedure_code" TEXT,
    "surgery_type" TEXT NOT NULL DEFAULT 'ELECTIVE',
    "anesthesia_type" TEXT,
    "scheduled_date" DATE NOT NULL,
    "scheduled_start" TEXT NOT NULL,
    "expected_duration_mins" INTEGER NOT NULL,
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "pre_op_checklist" JSONB,
    "intra_op_notes" TEXT,
    "post_op_notes" TEXT,
    "blood_units_reserved" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ot_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "target_name" TEXT,
    "location_id" TEXT,
    "description" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "session_id" TEXT,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_access_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "patient_name" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "actor_location_id" TEXT,
    "access_location_id" TEXT,
    "is_cross_location" BOOLEAN NOT NULL DEFAULT false,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "access_reason" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "session_id" TEXT,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_locations_tenant_id_location_code_key" ON "tenant_locations"("tenant_id", "location_code");

-- CreateIndex
CREATE UNIQUE INDEX "feature_modules_module_id_key" ON "feature_modules"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_features_tenant_id_module_id_key" ON "organization_features"("tenant_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_registry_email_key" ON "doctor_registry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_registry_phone_key" ON "doctor_registry"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_registry_medical_council_registration_no_key" ON "doctor_registry"("medical_council", "registration_no");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenant_id_email_key" ON "tenant_users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_roles_tenant_id_name_key" ON "tenant_roles"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_role_permissions_role_id_module_id_resource_action_key" ON "tenant_role_permissions"("role_id", "module_id", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_role_special_flags_role_id_flag_key" ON "tenant_role_special_flags"("role_id", "flag");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_location_id_code_key" ON "departments"("tenant_id", "location_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "patients_patient_id_key" ON "patients"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_rx_number_key" ON "prescriptions"("rx_number");

-- CreateIndex
CREATE UNIQUE INDEX "lab_orders_order_number_key" ON "lab_orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "wards_tenant_id_location_id_code_key" ON "wards"("tenant_id", "location_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "beds_ward_id_bed_number_key" ON "beds"("ward_id", "bed_number");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_admission_number_key" ON "admissions"("admission_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "drug_batches_tenant_id_drug_id_batch_number_key" ON "drug_batches"("tenant_id", "drug_id", "batch_number");

-- CreateIndex
CREATE UNIQUE INDEX "ot_rooms_tenant_id_location_id_name_key" ON "ot_rooms"("tenant_id", "location_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ot_bookings_booking_number_key" ON "ot_bookings"("booking_number");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_locations" ADD CONSTRAINT "tenant_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_features" ADD CONSTRAINT "organization_features_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_features" ADD CONSTRAINT "organization_features_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "feature_modules"("module_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_org_affiliations" ADD CONSTRAINT "doctor_org_affiliations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctor_registry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_org_affiliations" ADD CONSTRAINT "doctor_org_affiliations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_org_affiliations" ADD CONSTRAINT "doctor_org_affiliations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "tenant_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "tenant_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_role_permissions" ADD CONSTRAINT "tenant_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "tenant_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_role_special_flags" ADD CONSTRAINT "tenant_role_special_flags_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "tenant_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tokens" ADD CONSTRAINT "queue_tokens_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_diagnoses" ADD CONSTRAINT "consultation_diagnoses_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_lab_order_id_fkey" FOREIGN KEY ("lab_order_id") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_lab_order_id_fkey" FOREIGN KEY ("lab_order_id") REFERENCES "lab_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_result_items" ADD CONSTRAINT "lab_result_items_lab_result_id_fkey" FOREIGN KEY ("lab_result_id") REFERENCES "lab_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_batches" ADD CONSTRAINT "drug_batches_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_bookings" ADD CONSTRAINT "ot_bookings_ot_room_id_fkey" FOREIGN KEY ("ot_room_id") REFERENCES "ot_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_access_logs" ADD CONSTRAINT "patient_access_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
