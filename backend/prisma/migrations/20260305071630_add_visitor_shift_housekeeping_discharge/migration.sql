-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "admission_id" TEXT,
    "visitor_name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "id_type" TEXT,
    "id_number" TEXT,
    "photo_url" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'VISIT',
    "check_in_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out_time" TIMESTAMP(3),
    "badge_number" TEXT,
    "escort_required" BOOLEAN NOT NULL DEFAULT false,
    "escorted_by" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CHECKED_IN',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_handovers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "ward_id" TEXT,
    "department_id" TEXT,
    "shift_date" DATE NOT NULL,
    "shift_type" TEXT NOT NULL,
    "handover_from_id" TEXT NOT NULL,
    "handover_from_name" TEXT NOT NULL,
    "handover_to_id" TEXT,
    "handover_to_name" TEXT,
    "patient_summary" JSONB,
    "critical_alerts" TEXT[],
    "pending_tasks" JSONB,
    "medication_notes" TEXT,
    "equipment_issues" TEXT,
    "general_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housekeeping_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "ward_id" TEXT,
    "bed_id" TEXT,
    "room_or_area" TEXT,
    "task_type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "description" TEXT,
    "requested_by" TEXT,
    "requested_by_name" TEXT,
    "assigned_to" TEXT,
    "assigned_to_name" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housekeeping_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discharge_summaries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "admission_date" TIMESTAMP(3) NOT NULL,
    "discharge_date" TIMESTAMP(3),
    "diagnosis_on_admission" TEXT NOT NULL,
    "diagnosis_on_discharge" TEXT,
    "procedures_performed" JSONB,
    "treatment_given" TEXT,
    "investigation_summary" TEXT,
    "condition_at_discharge" TEXT,
    "discharge_medications" JSONB,
    "follow_up_instructions" TEXT,
    "follow_up_date" DATE,
    "dietary_advice" TEXT,
    "activity_restrictions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "prepared_by" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discharge_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitors_tenant_id_status_idx" ON "visitors"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "shift_handovers_tenant_id_shift_date_idx" ON "shift_handovers"("tenant_id", "shift_date");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_tenant_id_status_idx" ON "housekeeping_tasks"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "discharge_summaries_tenant_id_admission_id_key" ON "discharge_summaries"("tenant_id", "admission_id");
