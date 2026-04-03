-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "location_id" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_administrations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "prescription_item_id" TEXT,
    "drug_name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "administered_time" TIMESTAMP(3),
    "administered_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "withheld_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_tenant_id_recipient_id_is_read_idx" ON "notifications"("tenant_id", "recipient_id", "is_read");

-- CreateIndex
CREATE INDEX "medication_administrations_tenant_id_admission_id_idx" ON "medication_administrations"("tenant_id", "admission_id");
