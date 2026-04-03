/**
 * Bootstrap — runs ONCE on fresh install.
 * Creates:
 *   1. Platform super admin account (credentials printed to console)
 *   2. Feature modules catalog (master list — no clinical data)
 * Zero mock patients, zero demo tenants, zero sample records.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const FEATURE_MODULES = [
  { moduleId: 'MOD_PAT_REG', name: 'Patient Registration', category: 'PATIENT', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 1 },
  { moduleId: 'MOD_PAT_SELF_BOOK', name: 'Patient Self-Booking', category: 'PATIENT', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 2 },
  { moduleId: 'MOD_PAT_RECORDS', name: 'Patient Medical Records', category: 'PATIENT', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 3 },
  { moduleId: 'MOD_PAT_CROSS_LOC', name: 'Cross-Location Record Access', category: 'PATIENT', applicableTypes: ['MULTISPECIALTY'], sortOrder: 4 },
  { moduleId: 'MOD_PAT_PORTAL', name: 'Patient Portal', category: 'PATIENT', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 5 },
  { moduleId: 'MOD_QUEUE', name: 'OPD Queue Dashboard', category: 'RECEPTION', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 10 },
  { moduleId: 'MOD_APPT', name: 'Appointment Management', category: 'RECEPTION', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 11 },
  { moduleId: 'MOD_WALKIN', name: 'Walk-in Registration', category: 'RECEPTION', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 12 },
  { moduleId: 'MOD_TOKEN', name: 'Token / Display System', category: 'RECEPTION', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 13 },
  { moduleId: 'MOD_TRIAGE', name: 'Triage Station', category: 'NURSE', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 20 },
  { moduleId: 'MOD_CONSULT', name: 'Doctor Consultation', category: 'CLINICAL', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 30 },
  { moduleId: 'MOD_RX', name: 'Prescriptions', category: 'CLINICAL', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 31 },
  { moduleId: 'MOD_LAB_ORD', name: 'Lab Orders', category: 'CLINICAL', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 32 },
  { moduleId: 'MOD_REFERRAL', name: 'Referral Management', category: 'CLINICAL', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 33 },
  { moduleId: 'MOD_ICD', name: 'ICD-10 Diagnosis Coding', category: 'CLINICAL', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 34 },
  { moduleId: 'MOD_TELEMEDICINE', name: 'Telemedicine', category: 'CLINICAL', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 35 },
  { moduleId: 'MOD_VITALS', name: 'Vitals Recording', category: 'NURSE', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 21 },
  { moduleId: 'MOD_WARD', name: 'Ward Management', category: 'NURSE', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 22 },
  { moduleId: 'MOD_ADMISSION', name: 'Admissions', category: 'NURSE', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 23 },
  { moduleId: 'MOD_MED_ADMIN', name: 'Medication Administration (MAR)', category: 'NURSE', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 24 },
  { moduleId: 'MOD_ICU', name: 'ICU Management', category: 'NURSE', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 25 },
  { moduleId: 'MOD_DISCHARGE', name: 'Discharge Management', category: 'NURSE', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 26 },
  { moduleId: 'MOD_DISPENSARY', name: 'Basic Dispensary', category: 'PHARMACY', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 40 },
  { moduleId: 'MOD_PHARMA_FULL', name: 'Full Pharmacy', category: 'PHARMACY', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 41 },
  { moduleId: 'MOD_PHARMA_PO', name: 'Purchase Orders', category: 'PHARMACY', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 42 },
  { moduleId: 'MOD_PHARMA_RETURNS', name: 'Pharmacy Returns', category: 'PHARMACY', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 43 },
  { moduleId: 'MOD_PHARMA_CENTRAL', name: 'Centralized Inventory', category: 'PHARMACY', applicableTypes: ['MULTISPECIALTY'], sortOrder: 44 },
  { moduleId: 'MOD_PHARMA_REPORTS', name: 'Pharmacy Reports', category: 'PHARMACY', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 45 },
  { moduleId: 'MOD_LAB_BASIC', name: 'Basic Lab (refer-out)', category: 'LAB', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 50 },
  { moduleId: 'MOD_LAB_FULL', name: 'Full In-House Lab', category: 'LAB', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 51 },
  { moduleId: 'MOD_LAB_QC', name: 'Lab Quality Control', category: 'LAB', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 52 },
  { moduleId: 'MOD_LAB_REPORTS', name: 'Lab Reports', category: 'LAB', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 53 },
  { moduleId: 'MOD_RADIOLOGY', name: 'Radiology Orders', category: 'LAB', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 54 },
  { moduleId: 'MOD_BILL_OPD', name: 'OPD Billing', category: 'BILLING', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 60 },
  { moduleId: 'MOD_BILL_IPD', name: 'IPD Billing', category: 'BILLING', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 61 },
  { moduleId: 'MOD_BILL_INS', name: 'Insurance / TPA Billing', category: 'BILLING', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 62 },
  { moduleId: 'MOD_BILL_CGHS', name: 'CGHS / ECHS Billing', category: 'BILLING', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 63 },
  { moduleId: 'MOD_BILL_CREDIT', name: 'Corporate Credit Billing', category: 'BILLING', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 64 },
  { moduleId: 'MOD_GST', name: 'GST Computation', category: 'BILLING', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 65 },
  { moduleId: 'MOD_OT_BASIC', name: 'Minor Procedure Room', category: 'OT', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 70 },
  { moduleId: 'MOD_OT_SCHEDULE', name: 'OT Scheduling', category: 'OT', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 71 },
  { moduleId: 'MOD_OT_LIVE', name: 'OT Live Monitor', category: 'OT', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 72 },
  { moduleId: 'MOD_OT_EQUIPMENT', name: 'OT Equipment & Sterilization', category: 'OT', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 73 },
  { moduleId: 'MOD_MULTI_LOC', name: 'Multi-Location Management', category: 'NETWORK', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 80 },
  { moduleId: 'MOD_REFERRAL_NET', name: 'Internal Referral Network', category: 'NETWORK', applicableTypes: ['MULTISPECIALTY'], sortOrder: 81 },
  { moduleId: 'MOD_CROSS_LOC_RX', name: 'Cross-Location Rx View', category: 'NETWORK', applicableTypes: ['MULTISPECIALTY'], sortOrder: 82 },
  { moduleId: 'MOD_CENTRAL_RPT', name: 'Network-Level Reporting', category: 'ANALYTICS', applicableTypes: ['MULTISPECIALTY'], sortOrder: 90 },
  { moduleId: 'MOD_REPORTS', name: 'Reports & Analytics', category: 'ANALYTICS', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 91 },
  { moduleId: 'MOD_AUDIT', name: 'Audit Logs', category: 'COMPLIANCE', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 100 },
  { moduleId: 'MOD_COMPLIANCE', name: 'Compliance Dashboard', category: 'COMPLIANCE', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 101 },
  // New modules
  { moduleId: 'MOD_BLOOD_BANK', name: 'Blood Bank', category: 'CLINICAL', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 36 },
  { moduleId: 'MOD_DIALYSIS', name: 'Dialysis Unit', category: 'CLINICAL', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 37 },
  { moduleId: 'MOD_PHYSIOTHERAPY', name: 'Physiotherapy', category: 'CLINICAL', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 38 },
  { moduleId: 'MOD_AMBULANCE', name: 'Ambulance & Emergency Transport', category: 'OPERATIONS', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 110 },
  { moduleId: 'MOD_ATTENDANCE', name: 'Staff Attendance', category: 'HR', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 120 },
  { moduleId: 'MOD_INVENTORY', name: 'General Inventory', category: 'OPERATIONS', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 111 },
  { moduleId: 'MOD_ASSETS', name: 'Asset Management', category: 'OPERATIONS', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 112 },
  { moduleId: 'MOD_GRIEVANCE', name: 'Grievance & Feedback', category: 'QUALITY', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 130 },
  { moduleId: 'MOD_INFECTION_CTRL', name: 'Infection Control', category: 'QUALITY', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 131 },
  { moduleId: 'MOD_CONSENT', name: 'Consent Management', category: 'COMPLIANCE', applicableTypes: ['CLINIC','HOSPITAL','MULTISPECIALTY'], sortOrder: 102 },
  { moduleId: 'MOD_DIET', name: 'Diet & Nutrition', category: 'CLINICAL', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 39 },
  { moduleId: 'MOD_MORTUARY', name: 'Mortuary Management', category: 'OPERATIONS', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 113 },
  { moduleId: 'MOD_VISITOR', name: 'Visitor Management', category: 'OPERATIONS', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 114 },
  { moduleId: 'MOD_SHIFT_HANDOVER', name: 'Shift Handover', category: 'NURSE', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 27 },
  { moduleId: 'MOD_HOUSEKEEPING', name: 'Housekeeping', category: 'OPERATIONS', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 115 },
  { moduleId: 'MOD_INSURANCE', name: 'Insurance & TPA Management', category: 'BILLING', applicableTypes: ['HOSPITAL','MULTISPECIALTY'], sortOrder: 66 },
];

async function bootstrap() {
  console.log('\n🔧 Ayphen HMS — Production Bootstrap\n');

  // 1. Feature modules catalog (master list — no clinical data)
  let created = 0;
  for (const mod of FEATURE_MODULES) {
    const existing = await prisma.featureModule.findUnique({ where: { moduleId: mod.moduleId } });
    if (!existing) {
      await prisma.featureModule.create({ data: { moduleId: mod.moduleId, name: mod.name, category: mod.category, applicableTypes: mod.applicableTypes, sortOrder: mod.sortOrder, isActive: true } });
      created++;
    }
  }
  console.log(`✅ Feature modules catalog: ${FEATURE_MODULES.length} modules (${created} new)`);

  // 2. Platform super admin — only if none exists
  const existing = await prisma.platformUser.findFirst({ where: { platformRole: 'PLATFORM_OWNER' } });
  if (existing) {
    console.log(`ℹ️  Platform admin already exists: ${existing.email}`);
  } else {
    const email = process.env.PLATFORM_ADMIN_EMAIL || 'admin@ayphen.io';
    const password = process.env.PLATFORM_ADMIN_PASSWORD || generateSecurePassword();
    const hash = await bcrypt.hash(password, 12);
    await prisma.platformUser.create({
      data: { email, passwordHash: hash, firstName: 'Platform', lastName: 'Admin', platformRole: 'PLATFORM_OWNER', mfaEnabled: false },
    });
    console.log(`\n✅ Platform admin created`);
    console.log(`   Email    : ${email}`);
    console.log(`   Password : ${password}`);
    console.log(`\n⚠️  SAVE THIS PASSWORD — it will not be shown again.\n`);
  }

  console.log('\n✅ Bootstrap complete. No demo data created.\n');
}

function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';
  const all = upper + lower + digits + special;
  let pwd = upper[Math.floor(Math.random() * upper.length)]
    + lower[Math.floor(Math.random() * lower.length)]
    + digits[Math.floor(Math.random() * digits.length)]
    + special[Math.floor(Math.random() * special.length)];
  for (let i = 0; i < 8; i++) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

bootstrap()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
