/**
 * seed-demo.ts
 * Creates two demo organizations with all roles and users:
 *   1. Ayphen General Hospital  — full hospital with every system role
 *   2. MedCorner Pharmacy       — standalone pharmacy-only org
 *
 * Run: npx ts-node prisma/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'Ayphen@123';

// ─── ALL HOSPITAL MODULES ────────────────────────────────────────────────────
const HOSPITAL_MODULES = [
  'MOD_PAT_REG','MOD_PAT_SELF_BOOK','MOD_PAT_RECORDS','MOD_PAT_PORTAL',
  'MOD_QUEUE','MOD_APPT','MOD_WALKIN','MOD_TOKEN',
  'MOD_TRIAGE','MOD_VITALS','MOD_WARD','MOD_ADMISSION','MOD_MED_ADMIN','MOD_DISCHARGE',
  'MOD_CONSULT','MOD_RX','MOD_LAB_ORD','MOD_ICD','MOD_REFERRAL',
  'MOD_LAB_FULL','MOD_LAB_QC','MOD_LAB_REPORTS',
  'MOD_PHARMA_FULL','MOD_PHARMA_PO','MOD_PHARMA_RETURNS','MOD_PHARMA_REPORTS',
  'MOD_BILL_OPD','MOD_BILL_IPD','MOD_GST',
  'MOD_OT_SCHEDULE','MOD_OT_LIVE','MOD_OT_EQUIPMENT',
  'MOD_REPORTS','MOD_AUDIT','MOD_COMPLIANCE',
];

// ─── PHARMACY-ONLY MODULES ────────────────────────────────────────────────────
const PHARMACY_MODULES = [
  'MOD_PAT_REG',
  'MOD_PHARMA_FULL','MOD_PHARMA_PO','MOD_PHARMA_RETURNS','MOD_PHARMA_REPORTS',
  'MOD_BILL_OPD','MOD_GST',
  'MOD_AUDIT',
];

// ─── SYSTEM ROLES DEFINITIONS ─────────────────────────────────────────────────
const HOSPITAL_ROLES = [
  { name: 'Organization Admin',      systemRoleId: 'SYS_ORG_ADMIN',           description: 'Full access to all enabled modules' },
  { name: 'Doctor',                  systemRoleId: 'SYS_DOCTOR',              description: 'Consultation, Rx, Lab Orders' },
  { name: 'Senior Consultant',       systemRoleId: 'SYS_SENIOR_DOCTOR',       description: 'Doctor + referrals + all dept view' },
  { name: 'Head of Department',      systemRoleId: 'SYS_HOD',                 description: 'Senior Doctor + dept reports' },
  { name: 'Receptionist',            systemRoleId: 'SYS_RECEPTIONIST',        description: 'Queue, registration, appointments' },
  { name: 'Front Office Manager',    systemRoleId: 'SYS_FRONT_OFFICE',        description: 'Receptionist + appointment mgmt' },
  { name: 'Nurse',                   systemRoleId: 'SYS_NURSE',               description: 'Vitals, triage' },
  { name: 'Ward Nurse',              systemRoleId: 'SYS_WARD_NURSE',          description: 'Vitals, MAR, ward tasks' },
  { name: 'Charge Nurse',            systemRoleId: 'SYS_CHARGE_NURSE',        description: 'All Nurse + ward management' },
  { name: 'Pharmacist',              systemRoleId: 'SYS_PHARMACIST',          description: 'Full pharmacy module' },
  { name: 'Pharmacist In-Charge',    systemRoleId: 'SYS_PHARMACY_INCHARGE',   description: 'Pharmacist + PO approval + returns' },
  { name: 'Lab Technician',          systemRoleId: 'SYS_LAB_TECH',            description: 'Sample processing, result entry' },
  { name: 'Lab Supervisor',          systemRoleId: 'SYS_LAB_SUPERVISOR',      description: 'Lab Tech + validation + QC' },
  { name: 'OT Nurse',                systemRoleId: 'SYS_OT_NURSE',            description: 'OT schedule view + equipment' },
  { name: 'OT Coordinator',          systemRoleId: 'SYS_OT_COORDINATOR',      description: 'Full OT module management' },
  { name: 'Billing Staff',           systemRoleId: 'SYS_BILLING',             description: 'Invoicing, payments' },
  { name: 'Billing Manager',         systemRoleId: 'SYS_BILLING_MANAGER',     description: 'All Billing + discount approval' },
  { name: 'Compliance Officer',      systemRoleId: 'SYS_COMPLIANCE_OFFICER',  description: 'Audit logs + compliance (read-only)' },
  { name: 'Insurance Executive',     systemRoleId: 'SYS_INSURANCE_EXEC',      description: 'Insurance / TPA billing only' },
];

const PHARMACY_ROLES = [
  { name: 'Organization Admin',    systemRoleId: 'SYS_ORG_ADMIN',          description: 'Full access to all pharmacy modules' },
  { name: 'Pharmacist',            systemRoleId: 'SYS_PHARMACIST',         description: 'Dispense, inventory, returns' },
  { name: 'Pharmacist In-Charge',  systemRoleId: 'SYS_PHARMACY_INCHARGE',  description: 'All pharmacy + PO approval + reports' },
  { name: 'Billing Staff',         systemRoleId: 'SYS_BILLING',            description: 'Billing and payment collection' },
];

// ─── HOSPITAL USERS (one per role) ────────────────────────────────────────────
const HOSPITAL_USERS = [
  { firstName: 'Arjun',     lastName: 'Sharma',     email: 'admin@ayphenhosp.demo',          roleKey: 'SYS_ORG_ADMIN' },
  { firstName: 'Priya',     lastName: 'Nair',        email: 'doctor@ayphenhosp.demo',         roleKey: 'SYS_DOCTOR' },
  { firstName: 'Rajesh',    lastName: 'Menon',       email: 'srdoctor@ayphenhosp.demo',       roleKey: 'SYS_SENIOR_DOCTOR' },
  { firstName: 'Deepa',     lastName: 'Krishnan',    email: 'hod@ayphenhosp.demo',            roleKey: 'SYS_HOD' },
  { firstName: 'Kavitha',   lastName: 'Rajan',       email: 'reception@ayphenhosp.demo',      roleKey: 'SYS_RECEPTIONIST' },
  { firstName: 'Sathish',   lastName: 'Kumar',       email: 'frontoffice@ayphenhosp.demo',    roleKey: 'SYS_FRONT_OFFICE' },
  { firstName: 'Lakshmi',   lastName: 'Devi',        email: 'nurse@ayphenhosp.demo',          roleKey: 'SYS_NURSE' },
  { firstName: 'Anitha',    lastName: 'Balan',       email: 'wardnurse@ayphenhosp.demo',      roleKey: 'SYS_WARD_NURSE' },
  { firstName: 'Meenakshi', lastName: 'Pillai',      email: 'chargenurse@ayphenhosp.demo',    roleKey: 'SYS_CHARGE_NURSE' },
  { firstName: 'Suresh',    lastName: 'Murugan',     email: 'pharmacist@ayphenhosp.demo',     roleKey: 'SYS_PHARMACIST' },
  { firstName: 'Geetha',    lastName: 'Sundaram',    email: 'pharmacyic@ayphenhosp.demo',     roleKey: 'SYS_PHARMACY_INCHARGE' },
  { firstName: 'Ravi',      lastName: 'Shankar',     email: 'labtech@ayphenhosp.demo',        roleKey: 'SYS_LAB_TECH' },
  { firstName: 'Vijaya',    lastName: 'Lakshmi',     email: 'labsup@ayphenhosp.demo',         roleKey: 'SYS_LAB_SUPERVISOR' },
  { firstName: 'Karthik',   lastName: 'Selvam',      email: 'otnurse@ayphenhosp.demo',        roleKey: 'SYS_OT_NURSE' },
  { firstName: 'Divya',     lastName: 'Ramesh',      email: 'otcoord@ayphenhosp.demo',        roleKey: 'SYS_OT_COORDINATOR' },
  { firstName: 'Bala',      lastName: 'Subramaniam', email: 'billing@ayphenhosp.demo',        roleKey: 'SYS_BILLING' },
  { firstName: 'Nirmala',   lastName: 'Srinivasan',  email: 'billingmgr@ayphenhosp.demo',     roleKey: 'SYS_BILLING_MANAGER' },
  { firstName: 'Senthil',   lastName: 'Nathan',      email: 'compliance@ayphenhosp.demo',     roleKey: 'SYS_COMPLIANCE_OFFICER' },
  { firstName: 'Padma',     lastName: 'Venkatesh',   email: 'insurance@ayphenhosp.demo',      roleKey: 'SYS_INSURANCE_EXEC' },
];

// ─── PHARMACY USERS ───────────────────────────────────────────────────────────
const PHARMACY_USERS = [
  { firstName: 'Murugan',   lastName: 'Selvaraj',    email: 'admin@medcorner.demo',           roleKey: 'SYS_ORG_ADMIN' },
  { firstName: 'Meena',     lastName: 'Krishnan',    email: 'pharmacist@medcorner.demo',      roleKey: 'SYS_PHARMACIST' },
  { firstName: 'Gopi',      lastName: 'Nathan',      email: 'pharmacyic@medcorner.demo',      roleKey: 'SYS_PHARMACY_INCHARGE' },
  { firstName: 'Preethi',   lastName: 'Arumugam',    email: 'billing@medcorner.demo',         roleKey: 'SYS_BILLING' },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱  Ayphen Demo Seed — Starting\n');
  const hash = await bcrypt.hash(PASSWORD, 12);

  // ── 1. HOSPITAL ──────────────────────────────────────────────────────────────
  console.log('▶  Creating: Ayphen General Hospital');

  const hospSlug = 'ayphen-general-hospital';
  let hosp = await prisma.tenant.findUnique({ where: { slug: hospSlug } });
  if (hosp) {
    console.log(`   ⚠️  Already exists — skipping tenant creation (will still upsert roles/users)`);
  } else {
    hosp = await prisma.tenant.create({
      data: {
        slug: hospSlug,
        legalName: 'Ayphen General Hospital Pvt Ltd',
        tradeName: 'Ayphen General Hospital',
        orgType: 'HOSPITAL',
        primaryEmail: 'info@ayphenhosp.demo',
        primaryPhone: '044-10000001',
        subscriptionPlan: 'STANDARD',
        subscriptionStatus: 'ACTIVE',
        maxUsers: 100,
        maxLocations: 5,
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      },
    });
  }

  // Location
  let hospLoc = await prisma.tenantLocation.findFirst({ where: { tenantId: hosp.id } });
  if (!hospLoc) {
    hospLoc = await prisma.tenantLocation.create({
      data: {
        tenantId: hosp.id,
        locationCode: 'HQ',
        name: 'Ayphen General Hospital — Main Building',
        type: 'MAIN',
        addressLine1: '1, Hospital Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600001',
        phone: '044-10000001',
        email: 'info@ayphenhosp.demo',
        emergencyAvailable: true,
      },
    });
  }

  // Feature flags — hospital
  for (const modId of HOSPITAL_MODULES) {
    await prisma.organizationFeature.upsert({
      where: { tenantId_moduleId: { tenantId: hosp.id, moduleId: modId } },
      update: { isEnabled: true },
      create: { tenantId: hosp.id, moduleId: modId, isEnabled: true },
    });
  }
  console.log(`   ✅ ${HOSPITAL_MODULES.length} modules enabled`);

  // Roles
  const hospRoleMap: Record<string, string> = {};
  for (const r of HOSPITAL_ROLES) {
    const role = await prisma.tenantRole.upsert({
      where: { tenantId_name: { tenantId: hosp.id, name: r.name } },
      update: { systemRoleId: r.systemRoleId, description: r.description, isSystemRole: true },
      create: {
        tenantId: hosp.id,
        name: r.name,
        description: r.description,
        systemRoleId: r.systemRoleId,
        isSystemRole: true,
        isActive: true,
      },
    });
    hospRoleMap[r.systemRoleId] = role.id;
  }
  console.log(`   ✅ ${HOSPITAL_ROLES.length} roles created`);

  // Users
  for (const u of HOSPITAL_USERS) {
    const roleId = hospRoleMap[u.roleKey];
    if (!roleId) continue;
    await prisma.tenantUser.upsert({
      where: { tenantId_email: { tenantId: hosp.id, email: u.email } },
      update: {},
      create: {
        tenantId: hosp.id,
        email: u.email,
        passwordHash: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        roleId,
        primaryLocationId: hospLoc.id,
        locationScope: 'SINGLE',
        allowedLocations: [hospLoc.id],
        forcePasswordChange: false,
        isActive: true,
        registrationSource: 'ADMIN_INVITE',
      },
    });
  }
  console.log(`   ✅ ${HOSPITAL_USERS.length} users created`);
  console.log(`   ✅ Hospital done!\n`);

  // ── 2. PHARMACY ──────────────────────────────────────────────────────────────
  console.log('▶  Creating: MedCorner Pharmacy');

  const pharmSlug = 'medcorner-pharmacy';
  let pharm = await prisma.tenant.findUnique({ where: { slug: pharmSlug } });
  if (pharm) {
    console.log(`   ⚠️  Already exists — skipping tenant creation (will still upsert roles/users)`);
  } else {
    pharm = await prisma.tenant.create({
      data: {
        slug: pharmSlug,
        legalName: 'MedCorner Pharmacy Pvt Ltd',
        tradeName: 'MedCorner Pharmacy',
        orgType: 'PHARMACY_STANDALONE',
        primaryEmail: 'info@medcorner.demo',
        primaryPhone: '044-20000001',
        subscriptionPlan: 'STANDALONE',
        subscriptionStatus: 'ACTIVE',
        maxUsers: 10,
        maxLocations: 1,
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      },
    });
  }

  // Location
  let pharmLoc = await prisma.tenantLocation.findFirst({ where: { tenantId: pharm.id } });
  if (!pharmLoc) {
    pharmLoc = await prisma.tenantLocation.create({
      data: {
        tenantId: pharm.id,
        locationCode: 'SHOP1',
        name: 'MedCorner Pharmacy — Anna Nagar',
        type: 'MAIN',
        addressLine1: '14, 7th Avenue, Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600040',
        phone: '044-20000001',
        email: 'info@medcorner.demo',
        pharmacyLicenseNo: 'TN/DL/2024/12345',
        gstin: '33MEDCOR000A1Z5',
      },
    });
  }

  // Feature flags — pharmacy only
  for (const modId of PHARMACY_MODULES) {
    await prisma.organizationFeature.upsert({
      where: { tenantId_moduleId: { tenantId: pharm.id, moduleId: modId } },
      update: { isEnabled: true },
      create: { tenantId: pharm.id, moduleId: modId, isEnabled: true },
    });
  }
  console.log(`   ✅ ${PHARMACY_MODULES.length} modules enabled (pharmacy-only)`);

  // Roles
  const pharmRoleMap: Record<string, string> = {};
  for (const r of PHARMACY_ROLES) {
    const role = await prisma.tenantRole.upsert({
      where: { tenantId_name: { tenantId: pharm.id, name: r.name } },
      update: { systemRoleId: r.systemRoleId, description: r.description, isSystemRole: true },
      create: {
        tenantId: pharm.id,
        name: r.name,
        description: r.description,
        systemRoleId: r.systemRoleId,
        isSystemRole: true,
        isActive: true,
      },
    });
    pharmRoleMap[r.systemRoleId] = role.id;
  }
  console.log(`   ✅ ${PHARMACY_ROLES.length} roles created`);

  // Users
  for (const u of PHARMACY_USERS) {
    const roleId = pharmRoleMap[u.roleKey];
    if (!roleId) continue;
    await prisma.tenantUser.upsert({
      where: { tenantId_email: { tenantId: pharm.id, email: u.email } },
      update: {},
      create: {
        tenantId: pharm.id,
        email: u.email,
        passwordHash: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        roleId,
        primaryLocationId: pharmLoc.id,
        locationScope: 'SINGLE',
        allowedLocations: [pharmLoc.id],
        forcePasswordChange: false,
        isActive: true,
        registrationSource: 'ADMIN_INVITE',
      },
    });
  }
  console.log(`   ✅ ${PHARMACY_USERS.length} users created`);
  console.log(`   ✅ Pharmacy done!\n`);

  // ── PRINT CREDENTIALS ────────────────────────────────────────────────────────
  printCredentials();
}

function printCredentials() {
  const P = PASSWORD;
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  AYPHEN DEMO CREDENTIALS');
  console.log('  Common password for ALL users below: ' + P);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  ORG 1 — AYPHEN GENERAL HOSPITAL (Full Hospital)               │');
  console.log('│  Login URL: http://localhost:5555/login  →  Staff tab           │');
  console.log('├──────────────────────────┬──────────────────────────────────────┤');
  console.log('│  Role                    │  Email                               │');
  console.log('├──────────────────────────┼──────────────────────────────────────┤');
  console.log('│  Organization Admin      │  admin@ayphenhosp.demo               │');
  console.log('│  Doctor                  │  doctor@ayphenhosp.demo              │');
  console.log('│  Senior Consultant       │  srdoctor@ayphenhosp.demo            │');
  console.log('│  Head of Department      │  hod@ayphenhosp.demo                 │');
  console.log('│  Receptionist            │  reception@ayphenhosp.demo           │');
  console.log('│  Front Office Manager    │  frontoffice@ayphenhosp.demo         │');
  console.log('│  Nurse                   │  nurse@ayphenhosp.demo               │');
  console.log('│  Ward Nurse              │  wardnurse@ayphenhosp.demo           │');
  console.log('│  Charge Nurse            │  chargenurse@ayphenhosp.demo         │');
  console.log('│  Pharmacist              │  pharmacist@ayphenhosp.demo          │');
  console.log('│  Pharmacist In-Charge    │  pharmacyic@ayphenhosp.demo          │');
  console.log('│  Lab Technician          │  labtech@ayphenhosp.demo             │');
  console.log('│  Lab Supervisor          │  labsup@ayphenhosp.demo              │');
  console.log('│  OT Nurse                │  otnurse@ayphenhosp.demo             │');
  console.log('│  OT Coordinator          │  otcoord@ayphenhosp.demo             │');
  console.log('│  Billing Staff           │  billing@ayphenhosp.demo             │');
  console.log('│  Billing Manager         │  billingmgr@ayphenhosp.demo          │');
  console.log('│  Compliance Officer      │  compliance@ayphenhosp.demo          │');
  console.log('│  Insurance Executive     │  insurance@ayphenhosp.demo           │');
  console.log('└──────────────────────────┴──────────────────────────────────────┘\n');

  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│  ORG 2 — MEDCORNER PHARMACY (Standalone Pharmacy Only)         │');
  console.log('│  Login URL: http://localhost:5555/login  →  Staff tab           │');
  console.log('├──────────────────────────┬──────────────────────────────────────┤');
  console.log('│  Role                    │  Email                               │');
  console.log('├──────────────────────────┼──────────────────────────────────────┤');
  console.log('│  Organization Admin      │  admin@medcorner.demo                │');
  console.log('│  Pharmacist              │  pharmacist@medcorner.demo           │');
  console.log('│  Pharmacist In-Charge    │  pharmacyic@medcorner.demo           │');
  console.log('│  Billing Staff           │  billing@medcorner.demo              │');
  console.log('└──────────────────────────┴──────────────────────────────────────┘\n');

  console.log('  Password (all users): ' + P + '\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
