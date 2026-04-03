-- AlterTable
ALTER TABLE "doctor_registry" ADD COLUMN     "apns_token" TEXT,
ADD COLUMN     "device_tokens" JSONB DEFAULT '[]',
ADD COLUMN     "device_type" TEXT,
ADD COLUMN     "fcm_token" TEXT;

-- AlterTable
ALTER TABLE "patient_accounts" ADD COLUMN     "apns_token" TEXT,
ADD COLUMN     "device_tokens" JSONB DEFAULT '[]',
ADD COLUMN     "device_type" TEXT,
ADD COLUMN     "fcm_token" TEXT;

-- AlterTable
ALTER TABLE "tenant_users" ADD COLUMN     "apns_token" TEXT,
ADD COLUMN     "device_tokens" JSONB DEFAULT '[]',
ADD COLUMN     "device_type" TEXT,
ADD COLUMN     "fcm_token" TEXT;
