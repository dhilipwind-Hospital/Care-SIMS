-- CreateTable
CREATE TABLE "pharmacy_returns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "location_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'PATIENT',
    "patient_id" TEXT,
    "drug_id" TEXT,
    "drug_name" TEXT NOT NULL,
    "batch_number" TEXT,
    "quantity_returned" INTEGER NOT NULL,
    "return_reason" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'SEALED',
    "disposition" TEXT NOT NULL DEFAULT 'RETURN_TO_STOCK',
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "credit_amount" DECIMAL(10,2),
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_equipment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "name" TEXT NOT NULL,
    "equipment_type" TEXT NOT NULL,
    "serial_number" TEXT,
    "ot_room_id" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "sterilization_status" TEXT NOT NULL DEFAULT 'PENDING_STERILIZATION',
    "last_sterilized_at" TIMESTAMP(3),
    "sterilized_by_id" TEXT,
    "next_sterilization_due" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ot_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_returns_return_number_key" ON "pharmacy_returns"("return_number");

-- AddForeignKey
ALTER TABLE "ot_equipment" ADD CONSTRAINT "ot_equipment_ot_room_id_fkey" FOREIGN KEY ("ot_room_id") REFERENCES "ot_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
