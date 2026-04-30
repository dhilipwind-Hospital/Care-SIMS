-- AlterTable
ALTER TABLE "admissions" ADD COLUMN     "daily_bed_charge" DECIMAL(10,2),
ADD COLUMN     "package_amount" DECIMAL(12,2),
ADD COLUMN     "package_name" TEXT,
ADD COLUMN     "pre_admission_checklist" JSONB;

-- AlterTable
ALTER TABLE "drug_batches" ADD COLUMN     "barcode" TEXT;

-- AlterTable
ALTER TABLE "icu_monitoring" ADD COLUMN     "apache_ii_score" INTEGER,
ADD COLUMN     "arterial_ph" DECIMAL(3,2),
ADD COLUMN     "bilirubin_mg" DECIMAL(5,2),
ADD COLUMN     "hematocrit" DECIMAL(4,1),
ADD COLUMN     "lactate" DECIMAL(4,1),
ADD COLUMN     "pao2" DECIMAL(5,1),
ADD COLUMN     "platelet_count" DECIMAL(5,1),
ADD COLUMN     "serum_creatinine" DECIMAL(5,2),
ADD COLUMN     "serum_potassium" DECIMAL(4,2),
ADD COLUMN     "serum_sodium" DECIMAL(5,1),
ADD COLUMN     "sofa_score" INTEGER,
ADD COLUMN     "wbc" DECIMAL(5,1);

-- AlterTable
ALTER TABLE "medication_administrations" ADD COLUMN     "is_prn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prn_max_daily_doses" INTEGER,
ADD COLUMN     "prn_reason" TEXT;

-- AlterTable
ALTER TABLE "ot_bookings" ADD COLUMN     "blood_units_used" INTEGER DEFAULT 0,
ADD COLUMN     "complications" TEXT,
ADD COLUMN     "drain_inserted" BOOLEAN DEFAULT false,
ADD COLUMN     "drain_type" TEXT,
ADD COLUMN     "estimated_blood_loss" INTEGER,
ADD COLUMN     "implants" JSONB,
ADD COLUMN     "specimens" JSONB;

-- CreateTable
CREATE TABLE "medication_reconciliations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "reconc_type" TEXT NOT NULL DEFAULT 'ADMISSION',
    "home_medications" JSONB,
    "hospital_meds" JSONB,
    "discrepancies" JSONB,
    "reconciled_by_id" TEXT NOT NULL,
    "reconciled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "medication_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basic_pay" DECIMAL(10,2) NOT NULL,
    "da" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "allowances" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overtime" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gross_pay" DECIMAL(10,2) NOT NULL,
    "pf_deduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "esi_deduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tds_deduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(10,2) NOT NULL,
    "net_pay" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "processed_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_config" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pf_rate" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "esi_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.75,
    "pf_employer_rate" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "esi_employer_rate" DECIMAL(5,2) NOT NULL DEFAULT 3.25,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "work_order_number" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "department_id" TEXT,
    "location_id" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "assigned_to" TEXT,
    "assigned_to_name" TEXT,
    "estimated_cost" DECIMAL(10,2),
    "actual_cost" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "satisfaction_rating" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mlc_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "mlc_number" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "brought_by" TEXT NOT NULL,
    "police_station" TEXT,
    "fir_number" TEXT,
    "fir_date" TIMESTAMP(3),
    "fir_section" TEXT,
    "nature_of_injury" TEXT NOT NULL,
    "weapon_used" TEXT,
    "circumstance" TEXT,
    "attending_doctor_id" TEXT,
    "wound_certificate_id" TEXT,
    "informed_police" BOOLEAN NOT NULL DEFAULT false,
    "informed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mlc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_record_files" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "file_number" TEXT NOT NULL,
    "current_location" TEXT,
    "checked_out_by" TEXT,
    "checked_out_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "icd_codes" TEXT[],
    "coding_complete" BOOLEAN NOT NULL DEFAULT false,
    "coded_by" TEXT,
    "coded_at" TIMESTAMP(3),
    "incomplete_notes" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_record_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "bank_details" JSONB,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "address" TEXT,
    "rating" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_contracts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "contract_number" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "terms" TEXT,
    "value" DECIMAL(12,2),
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_indents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "indent_number" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "department_id" TEXT,
    "items" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_indents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "item_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "reorder_level" INTEGER NOT NULL DEFAULT 10,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "location_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "department_id" TEXT,
    "indent_id" TEXT,
    "requested_by" TEXT,
    "issued_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linen_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "total_stock" INTEGER NOT NULL DEFAULT 0,
    "in_circulation" INTEGER NOT NULL DEFAULT 0,
    "in_laundry" INTEGER NOT NULL DEFAULT 0,
    "damaged" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linen_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linen_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "ward_id" TEXT,
    "staff_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linen_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_collections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "waste_category" TEXT NOT NULL,
    "weight_kg" DECIMAL(8,2) NOT NULL,
    "collected_by" TEXT,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handed_to_vendor" BOOLEAN NOT NULL DEFAULT false,
    "vendor_name" TEXT,
    "manifest_number" TEXT,
    "disposal_method" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_indicators" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "indicator_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "target" DECIMAL(6,2),
    "period" TEXT NOT NULL DEFAULT 'MONTHLY',
    "value" DECIMAL(6,2),
    "numerator" INTEGER,
    "denominator" INTEGER,
    "calculated_at" TIMESTAMP(3),
    "reported_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_incidents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "incident_type" TEXT NOT NULL,
    "patient_id" TEXT,
    "reported_by" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MINOR',
    "root_cause_analysis" TEXT,
    "corrective_action" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_packages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target_gender" TEXT,
    "target_age_group" TEXT,
    "tests" JSONB,
    "consultations" JSONB,
    "price" DECIMAL(10,2) NOT NULL,
    "discounted_price" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_package_bookings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "booked_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "completed_tests" JSONB,
    "invoice_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_package_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nicu_admissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "mother_patient_id" TEXT,
    "admission_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestational_weeks" INTEGER,
    "birth_weight_grams" INTEGER,
    "current_weight_grams" INTEGER,
    "apgar_1min" INTEGER,
    "apgar_5min" INTEGER,
    "diagnosis" TEXT,
    "feed_type" TEXT,
    "feed_volume_ml" DECIMAL(6,1),
    "phototherapy" BOOLEAN NOT NULL DEFAULT false,
    "ventilator_support" TEXT,
    "icu_bed_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "discharge_date" TIMESTAMP(3),
    "discharge_weight_grams" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nicu_admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nicu_daily_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nicu_admission_id" TEXT NOT NULL,
    "record_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight_grams" INTEGER,
    "feed_type" TEXT,
    "feed_volume_ml" DECIMAL(6,1),
    "feed_frequency" TEXT,
    "urine_output" INTEGER,
    "stool_count" INTEGER,
    "bilirubin_level" DECIMAL(5,1),
    "phototherapy" BOOLEAN NOT NULL DEFAULT false,
    "oxygen_support" TEXT,
    "temperature" DECIMAL(4,1),
    "heart_rate" INTEGER,
    "spo2" INTEGER,
    "apnea_episodes" INTEGER,
    "notes" TEXT,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nicu_daily_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_protocols" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diagnosis" TEXT,
    "icd_code" TEXT,
    "department" TEXT,
    "duration_days" INTEGER NOT NULL,
    "steps" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_pathways" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "protocol_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_day" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "completed_steps" JSONB,
    "deviations" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wound_assessments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "wound_type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "stage" TEXT,
    "length_cm" DECIMAL(5,1),
    "width_cm" DECIMAL(5,1),
    "depth_cm" DECIMAL(5,1),
    "wound_bed" TEXT,
    "exudate" TEXT,
    "periwound_skin" TEXT,
    "treatment" TEXT,
    "dressing_type" TEXT,
    "photo_url" TEXT,
    "pain_score" INTEGER,
    "assessed_by" TEXT NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_assessment" DATE,
    "notes" TEXT,

    CONSTRAINT "wound_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antibiotic_usage" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "drug_name" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "indication" TEXT,
    "culture_ordered" BOOLEAN NOT NULL DEFAULT false,
    "culture_sensitivity" TEXT,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "duration_days" INTEGER,
    "de_escalated" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "antibiotic_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palliative_care_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "record_type" TEXT NOT NULL,
    "pain_score" INTEGER,
    "pain_type" TEXT,
    "symptoms" JSONB,
    "goals_of_care" TEXT,
    "advance_directive" TEXT,
    "family_meeting_notes" TEXT,
    "medications" JSONB,
    "assessed_by" TEXT NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_follow_up" DATE,
    "notes" TEXT,

    CONSTRAINT "palliative_care_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_visits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "visit_type" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "address" TEXT,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "vitals_recorded" JSONB,
    "services_provided" JSONB,
    "medications" TEXT,
    "follow_up_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duty_rosters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "department_id" TEXT,
    "location_id" TEXT,
    "shift_date" DATE NOT NULL,
    "shift_type" TEXT NOT NULL DEFAULT 'GENERAL',
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "swap_requested_with" TEXT,
    "swap_approved_by" TEXT,
    "swap_approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duty_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sterilization_batches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "location_id" TEXT,
    "load_type" TEXT NOT NULL,
    "machine_id" TEXT,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "temperature" DECIMAL(5,1),
    "pressure" DECIMAL(5,2),
    "duration_mins" INTEGER,
    "biological_indicator" TEXT,
    "chemical_indicator" TEXT,
    "operator_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sterilization_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sterilization_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "instrument_set_id" TEXT,
    "instrument_name" TEXT NOT NULL,
    "department_id" TEXT,
    "requested_by" TEXT,
    "issued_at" TIMESTAMP(3),
    "issued_to" TEXT,
    "returned_at" TIMESTAMP(3),
    "returned_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sterilization_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_sets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "set_name" TEXT NOT NULL,
    "department" TEXT,
    "items" JSONB,
    "total_sterilizations" INTEGER NOT NULL DEFAULT 0,
    "last_sterilized_at" TIMESTAMP(3),
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_visits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "visit_number" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "triage_category" TEXT NOT NULL DEFAULT 'GREEN',
    "chief_complaint" TEXT NOT NULL,
    "arrival_mode" TEXT NOT NULL DEFAULT 'WALK_IN',
    "arrival_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vitals_on_arrival" JSONB,
    "gcs_on_arrival" INTEGER,
    "assigned_doctor_id" TEXT,
    "assigned_bed_id" TEXT,
    "is_mlc" BOOLEAN NOT NULL DEFAULT false,
    "mlc_number" TEXT,
    "police_station" TEXT,
    "brought_by" TEXT,
    "brought_by_relation" TEXT,
    "brought_by_phone" TEXT,
    "disposition" TEXT,
    "disposition_time" TIMESTAMP(3),
    "admission_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "mother_patient_id" TEXT NOT NULL,
    "father_name" TEXT,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "time_of_birth" TEXT,
    "gender" TEXT NOT NULL,
    "weight_grams" INTEGER,
    "length_cm" DECIMAL(5,1),
    "apgar_1min" INTEGER,
    "apgar_5min" INTEGER,
    "delivery_type" TEXT NOT NULL DEFAULT 'NORMAL',
    "birth_order" TEXT NOT NULL DEFAULT 'SINGLE',
    "attending_doctor_id" TEXT,
    "registration_number" TEXT,
    "birth_cert_issued" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "birth_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "death_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "date_of_death" TIMESTAMP(3) NOT NULL,
    "time_of_death" TEXT,
    "cause_of_death" TEXT NOT NULL,
    "icd_code" TEXT,
    "manner_of_death" TEXT NOT NULL DEFAULT 'NATURAL',
    "attending_doctor_id" TEXT,
    "registration_number" TEXT,
    "death_cert_issued" BOOLEAN NOT NULL DEFAULT false,
    "post_mortem_required" BOOLEAN NOT NULL DEFAULT false,
    "post_mortem_done" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "death_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_certificates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "certificate_type" TEXT NOT NULL,
    "issued_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "findings" TEXT,
    "recommendations" TEXT,
    "restrictions" TEXT,
    "custom_body" TEXT,
    "issued_by" TEXT NOT NULL,
    "printed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_surveys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "visit_type" TEXT NOT NULL,
    "department_id" TEXT,
    "doctor_id" TEXT,
    "overall_rating" INTEGER,
    "nps_score" INTEGER,
    "responses" JSONB,
    "comments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anaesthesia_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "anesthetist_id" TEXT NOT NULL,
    "events" JSONB,
    "induction_time" TIMESTAMP(3),
    "induction_method" TEXT,
    "airway_device" TEXT,
    "ett_size" TEXT,
    "maintenance_agent" TEXT,
    "muscle_relaxant" TEXT,
    "reversal_time" TIMESTAMP(3),
    "reversal_agent" TEXT,
    "extubation_time" TIMESTAMP(3),
    "vital_snapshots" JSONB,
    "total_iv_fluids" INTEGER,
    "total_blood_products" INTEGER,
    "urine_output" INTEGER,
    "recovery_score" INTEGER,
    "recovery_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anaesthesia_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_op_assessments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "asa_grade" TEXT,
    "mallampati_score" INTEGER,
    "mouth_opening" TEXT,
    "neck_mobility" TEXT,
    "dental_status" TEXT,
    "predicted_difficult" BOOLEAN NOT NULL DEFAULT false,
    "cardiac_history" TEXT,
    "respiratory_history" TEXT,
    "diabetes_status" TEXT,
    "renal_status" TEXT,
    "hepatic_status" TEXT,
    "allergies" TEXT,
    "current_medications" TEXT,
    "previous_anaesthesia" TEXT,
    "anaesthesia_plan" TEXT,
    "special_instructions" TEXT,
    "npo_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "assessed_by_id" TEXT NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_op_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_rounds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "icu_bed_id" TEXT NOT NULL,
    "round_type" TEXT NOT NULL DEFAULT 'MORNING',
    "current_status" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "ventilator_plan" TEXT,
    "nutrition_plan" TEXT,
    "labs_ordered" TEXT,
    "consult_requested" TEXT,
    "estimated_los" INTEGER,
    "rounded_by_id" TEXT NOT NULL,
    "rounded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medication_reconciliations_tenant_id_admission_id_idx" ON "medication_reconciliations"("tenant_id", "admission_id");

-- CreateIndex
CREATE INDEX "payroll_tenant_id_idx" ON "payroll"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_tenant_id_staff_id_month_year_key" ON "payroll"("tenant_id", "staff_id", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_config_tenant_id_key" ON "payroll_config"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_work_order_number_key" ON "work_orders"("work_order_number");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_status_idx" ON "work_orders"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mlc_records_mlc_number_key" ON "mlc_records"("mlc_number");

-- CreateIndex
CREATE INDEX "mlc_records_tenant_id_idx" ON "mlc_records"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "medical_record_files_file_number_key" ON "medical_record_files"("file_number");

-- CreateIndex
CREATE INDEX "medical_record_files_tenant_id_patient_id_idx" ON "medical_record_files"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "vendors_tenant_id_idx" ON "vendors"("tenant_id");

-- CreateIndex
CREATE INDEX "vendor_contracts_tenant_id_idx" ON "vendor_contracts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_indents_indent_number_key" ON "purchase_indents"("indent_number");

-- CreateIndex
CREATE INDEX "purchase_indents_tenant_id_idx" ON "purchase_indents"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_items_tenant_id_item_code_key" ON "store_items"("tenant_id", "item_code");

-- CreateIndex
CREATE INDEX "store_transactions_tenant_id_item_id_idx" ON "store_transactions"("tenant_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "linen_items_tenant_id_item_type_key" ON "linen_items"("tenant_id", "item_type");

-- CreateIndex
CREATE INDEX "linen_transactions_tenant_id_idx" ON "linen_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "waste_collections_tenant_id_idx" ON "waste_collections"("tenant_id");

-- CreateIndex
CREATE INDEX "quality_indicators_tenant_id_indicator_code_idx" ON "quality_indicators"("tenant_id", "indicator_code");

-- CreateIndex
CREATE INDEX "quality_incidents_tenant_id_idx" ON "quality_incidents"("tenant_id");

-- CreateIndex
CREATE INDEX "health_packages_tenant_id_idx" ON "health_packages"("tenant_id");

-- CreateIndex
CREATE INDEX "health_package_bookings_tenant_id_idx" ON "health_package_bookings"("tenant_id");

-- CreateIndex
CREATE INDEX "nicu_admissions_tenant_id_idx" ON "nicu_admissions"("tenant_id");

-- CreateIndex
CREATE INDEX "nicu_daily_records_tenant_id_nicu_admission_id_idx" ON "nicu_daily_records"("tenant_id", "nicu_admission_id");

-- CreateIndex
CREATE INDEX "care_protocols_tenant_id_idx" ON "care_protocols"("tenant_id");

-- CreateIndex
CREATE INDEX "patient_pathways_tenant_id_patient_id_idx" ON "patient_pathways"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "wound_assessments_tenant_id_patient_id_idx" ON "wound_assessments"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "antibiotic_usage_tenant_id_patient_id_idx" ON "antibiotic_usage"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "palliative_care_records_tenant_id_patient_id_idx" ON "palliative_care_records"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "home_visits_tenant_id_patient_id_idx" ON "home_visits"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "duty_rosters_tenant_id_shift_date_idx" ON "duty_rosters"("tenant_id", "shift_date");

-- CreateIndex
CREATE INDEX "duty_rosters_tenant_id_staff_id_idx" ON "duty_rosters"("tenant_id", "staff_id");

-- CreateIndex
CREATE INDEX "leave_requests_tenant_id_staff_id_idx" ON "leave_requests"("tenant_id", "staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "sterilization_batches_batch_number_key" ON "sterilization_batches"("batch_number");

-- CreateIndex
CREATE INDEX "sterilization_batches_tenant_id_idx" ON "sterilization_batches"("tenant_id");

-- CreateIndex
CREATE INDEX "sterilization_items_tenant_id_batch_id_idx" ON "sterilization_items"("tenant_id", "batch_id");

-- CreateIndex
CREATE INDEX "instrument_sets_tenant_id_idx" ON "instrument_sets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_visits_visit_number_key" ON "emergency_visits"("visit_number");

-- CreateIndex
CREATE INDEX "emergency_visits_tenant_id_status_idx" ON "emergency_visits"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "birth_records_tenant_id_idx" ON "birth_records"("tenant_id");

-- CreateIndex
CREATE INDEX "death_records_tenant_id_idx" ON "death_records"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "medical_certificates_certificate_number_key" ON "medical_certificates"("certificate_number");

-- CreateIndex
CREATE INDEX "medical_certificates_tenant_id_idx" ON "medical_certificates"("tenant_id");

-- CreateIndex
CREATE INDEX "feedback_surveys_tenant_id_idx" ON "feedback_surveys"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "anaesthesia_records_booking_id_key" ON "anaesthesia_records"("booking_id");

-- CreateIndex
CREATE INDEX "anaesthesia_records_tenant_id_idx" ON "anaesthesia_records"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "pre_op_assessments_booking_id_key" ON "pre_op_assessments"("booking_id");

-- CreateIndex
CREATE INDEX "pre_op_assessments_tenant_id_idx" ON "pre_op_assessments"("tenant_id");

-- CreateIndex
CREATE INDEX "icu_rounds_tenant_id_admission_id_idx" ON "icu_rounds"("tenant_id", "admission_id");

-- AddForeignKey
ALTER TABLE "vendor_contracts" ADD CONSTRAINT "vendor_contracts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_transactions" ADD CONSTRAINT "store_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "store_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linen_transactions" ADD CONSTRAINT "linen_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "linen_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_package_bookings" ADD CONSTRAINT "health_package_bookings_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "health_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_pathways" ADD CONSTRAINT "patient_pathways_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "care_protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sterilization_items" ADD CONSTRAINT "sterilization_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "sterilization_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_visits" ADD CONSTRAINT "emergency_visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
