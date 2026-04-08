/**
 * seed-clinical.ts
 * Populates the Ayphen General Hospital demo tenant with realistic clinical data
 * so that dashboards, reports, and lists look populated during a demo pitch.
 *
 * Creates (into tenant slug = "ayphen-general-hospital"):
 *   - 25 patients (mix of ages, genders, registration types)
 *   - 30 appointments (spread across past 14 days and next 7 days)
 *   - 20 queue tokens (today, various statuses)
 *   - 15 consultations (completed) with prescriptions
 *   - 20 invoices (mix of DRAFT / FINALIZED / PAID / PARTIAL)
 *
 * Idempotent: will skip entities that already exist by unique keys.
 * Safe to re-run. Will NOT touch other tenants.
 *
 * Run: npx ts-node prisma/seed-clinical.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOSP_SLUG = 'ayphen-general-hospital';

const FIRST_NAMES_M = ['Arjun', 'Vikram', 'Rahul', 'Suresh', 'Karthik', 'Mohan', 'Ravi', 'Prakash', 'Anand', 'Dinesh', 'Ganesh', 'Harish'];
const FIRST_NAMES_F = ['Priya', 'Deepa', 'Lakshmi', 'Meera', 'Anitha', 'Kavitha', 'Sangeetha', 'Divya', 'Shalini', 'Nithya', 'Radha', 'Sudha'];
const LAST_NAMES = ['Sharma', 'Kumar', 'Iyer', 'Menon', 'Pillai', 'Nair', 'Reddy', 'Krishnan', 'Rao', 'Subramanian', 'Venkatesh', 'Mohan'];

const CHIEF_COMPLAINTS = [
  'Fever and body ache for 3 days',
  'Persistent cough and sore throat',
  'Chest pain on exertion',
  'Headache and dizziness',
  'Abdominal pain and nausea',
  'Lower back pain for 1 week',
  'Joint pain in knees',
  'High blood pressure follow-up',
  'Diabetes routine check',
  'Skin rash and itching',
  'Fatigue and weakness',
  'Shortness of breath',
];

const DIAGNOSES = [
  { code: 'J06.9', desc: 'Acute upper respiratory infection' },
  { code: 'K30', desc: 'Functional dyspepsia' },
  { code: 'M54.5', desc: 'Low back pain' },
  { code: 'I10', desc: 'Essential hypertension' },
  { code: 'E11.9', desc: 'Type 2 diabetes mellitus' },
  { code: 'R51', desc: 'Headache' },
  { code: 'L29.9', desc: 'Pruritus, unspecified' },
  { code: 'R53.83', desc: 'Other fatigue' },
];

const DRUGS = [
  { name: 'Paracetamol 500mg', dosage: '1 tablet', freq: 'TID', duration: 5 },
  { name: 'Amoxicillin 500mg', dosage: '1 capsule', freq: 'BID', duration: 7 },
  { name: 'Cetirizine 10mg', dosage: '1 tablet', freq: 'HS', duration: 5 },
  { name: 'Pantoprazole 40mg', dosage: '1 tablet', freq: 'OD', duration: 14 },
  { name: 'Metformin 500mg', dosage: '1 tablet', freq: 'BID', duration: 30 },
  { name: 'Amlodipine 5mg', dosage: '1 tablet', freq: 'OD', duration: 30 },
  { name: 'Azithromycin 500mg', dosage: '1 tablet', freq: 'OD', duration: 3 },
  { name: 'Diclofenac 50mg', dosage: '1 tablet', freq: 'BID', duration: 5 },
];

const LINE_ITEMS = [
  { desc: 'Consultation Fee — General Medicine', price: 500, category: 'CONSULTATION' },
  { desc: 'Consultation Fee — Specialist', price: 800, category: 'CONSULTATION' },
  { desc: 'Complete Blood Count (CBC)', price: 350, category: 'LAB' },
  { desc: 'Blood Sugar (Fasting)', price: 150, category: 'LAB' },
  { desc: 'Lipid Profile', price: 650, category: 'LAB' },
  { desc: 'ECG', price: 300, category: 'DIAGNOSTIC' },
  { desc: 'Chest X-Ray', price: 450, category: 'RADIOLOGY' },
  { desc: 'Ultrasound Abdomen', price: 1200, category: 'RADIOLOGY' },
  { desc: 'IV Fluids Administration', price: 250, category: 'PROCEDURE' },
  { desc: 'Injection — IM', price: 100, category: 'PROCEDURE' },
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n: number): Date { const d = new Date(); d.setDate(d.getDate() + n); return d; }

async function main() {
  console.log('\n🏥  Ayphen Clinical Data Seed — Starting\n');

  const tenant = await prisma.tenant.findUnique({ where: { slug: HOSP_SLUG } });
  if (!tenant) {
    throw new Error(`Tenant ${HOSP_SLUG} not found. Run seed-demo.ts first.`);
  }
  console.log(`▶  Target tenant: ${tenant.tradeName} (${tenant.id})`);

  const location = await prisma.tenantLocation.findFirst({ where: { tenantId: tenant.id } });
  if (!location) throw new Error('No location found for tenant');

  // Find a doctor user to attribute appointments/consultations to
  const doctorUser = await prisma.tenantUser.findFirst({
    where: { tenantId: tenant.id, email: 'doctor@ayphenhosp.demo' },
  });
  if (!doctorUser) throw new Error('Demo doctor user not found. Run seed-demo.ts first.');

  // Find a reception user for createdBy attribution
  const receptionUser = await prisma.tenantUser.findFirst({
    where: { tenantId: tenant.id, email: 'reception@ayphenhosp.demo' },
  });
  const billingUser = await prisma.tenantUser.findFirst({
    where: { tenantId: tenant.id, email: 'billing@ayphenhosp.demo' },
  });
  const createdById = receptionUser?.id || doctorUser.id;
  const billingCreatedById = billingUser?.id || doctorUser.id;

  // ── 1. PATIENTS ──────────────────────────────────────────────────────────
  console.log('\n▶  Creating patients...');
  const existingCount = await prisma.patient.count({ where: { tenantId: tenant.id } });
  const TARGET_PATIENTS = 25;
  const toCreate = Math.max(0, TARGET_PATIENTS - existingCount);

  const createdPatients: { id: string; patientId: string; firstName: string; lastName: string; gender: string }[] = [];

  // Reuse existing patients if any
  const existing = await prisma.patient.findMany({ where: { tenantId: tenant.id }, take: TARGET_PATIENTS });
  createdPatients.push(...existing.map(p => ({ id: p.id, patientId: p.patientId, firstName: p.firstName, lastName: p.lastName, gender: p.gender })));

  for (let i = 0; i < toCreate; i++) {
    const gender = Math.random() < 0.5 ? 'MALE' : 'FEMALE';
    const firstName = gender === 'MALE' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
    const lastName = pick(LAST_NAMES);
    const age = randInt(5, 80);
    const seq = existingCount + i + 1;
    const pid = `P${String(seq).padStart(6, '0')}`;

    try {
      const patient = await prisma.patient.create({
        data: {
          tenantId: tenant.id,
          patientId: pid,
          locationId: location.id,
          registrationType: pick(['WALKIN', 'APPOINTMENT', 'REFERRAL']),
          firstName,
          lastName,
          gender,
          ageYears: age,
          dateOfBirth: new Date(new Date().getFullYear() - age, randInt(0, 11), randInt(1, 28)),
          bloodGroup: pick(['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-']),
          mobile: `98${randInt(10000000, 99999999)}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${seq}@demo.test`,
          address: { line1: `${randInt(1, 999)}, ${pick(['Anna Nagar', 'T Nagar', 'Adyar', 'Velachery', 'Tambaram'])}`, city: 'Chennai', state: 'Tamil Nadu', pinCode: '600001' },
          allergies: Math.random() < 0.2 ? ['Penicillin'] : [],
          existingConditions: Math.random() < 0.3 ? [pick(['Diabetes', 'Hypertension', 'Asthma'])] : [],
          registeredById: createdById,
        },
      });
      createdPatients.push({ id: patient.id, patientId: patient.patientId, firstName, lastName, gender });
    } catch (err: any) {
      console.log(`   ⚠️  Skipped patient ${pid}: ${err.message}`);
    }
  }
  console.log(`   ✅ ${createdPatients.length} patients available (${toCreate} newly created)`);

  if (createdPatients.length === 0) {
    throw new Error('No patients to work with');
  }

  // ── 2. APPOINTMENTS ──────────────────────────────────────────────────────
  console.log('\n▶  Creating appointments...');
  const apptCount = await prisma.appointment.count({ where: { tenantId: tenant.id } });
  let apptsCreated = 0;
  if (apptCount < 30) {
    for (let i = 0; i < 30 - apptCount; i++) {
      const p = pick(createdPatients);
      const dayOffset = randInt(-14, 7);
      const date = dayOffset < 0 ? daysAgo(-dayOffset) : daysFromNow(dayOffset);
      const hour = randInt(9, 17);
      const mins = pick([0, 15, 30, 45]);
      const isPast = dayOffset < 0;
      const status = isPast ? pick(['COMPLETED', 'COMPLETED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']) : 'SCHEDULED';

      try {
        await prisma.appointment.create({
          data: {
            tenantId: tenant.id,
            locationId: location.id,
            patientId: p.id,
            doctorId: doctorUser.id,
            appointmentDate: date,
            appointmentTime: `${String(hour).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
            durationMinutes: 15,
            type: pick(['NEW', 'FOLLOWUP']),
            source: pick(['RECEPTION', 'ONLINE', 'PHONE']),
            chiefComplaint: pick(CHIEF_COMPLAINTS),
            status,
            createdById,
          },
        });
        apptsCreated++;
      } catch (err: any) {
        // conflict — skip
      }
    }
  }
  console.log(`   ✅ ${apptsCreated} appointments created (${apptCount + apptsCreated} total)`);

  // ── 3. QUEUE TOKENS (today) ──────────────────────────────────────────────
  console.log('\n▶  Creating queue tokens for today...');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const existingTokens = await prisma.queueToken.count({ where: { tenantId: tenant.id, queueDate: today } });
  let tokensCreated = 0;
  if (existingTokens < 20) {
    const startTokenNum = existingTokens + 1;
    for (let i = 0; i < 20 - existingTokens; i++) {
      const p = pick(createdPatients);
      const tokenNumber = startTokenNum + i;
      // Distribute statuses
      const statusDist = i < 8 ? 'COMPLETED' : i < 14 ? 'IN_CONSULTATION' : 'WAITING';
      try {
        await prisma.queueToken.create({
          data: {
            tenantId: tenant.id,
            tokenNumber,
            locationId: location.id,
            queueDate: today,
            patientId: p.id,
            doctorId: doctorUser.id,
            visitType: pick(['NEW', 'FOLLOWUP']),
            priority: pick(['NORMAL', 'NORMAL', 'NORMAL', 'URGENT']),
            status: statusDist,
          },
        });
        tokensCreated++;
      } catch (err: any) {
        // unique conflict — skip
      }
    }
  }
  console.log(`   ✅ ${tokensCreated} queue tokens created`);

  // ── 4. CONSULTATIONS + PRESCRIPTIONS ─────────────────────────────────────
  console.log('\n▶  Creating consultations with prescriptions...');
  const consultCount = await prisma.consultation.count({ where: { tenantId: tenant.id } });
  let consultsCreated = 0;
  let rxCreated = 0;
  if (consultCount < 15) {
    for (let i = 0; i < 15 - consultCount; i++) {
      const p = pick(createdPatients);
      const startedAt = daysAgo(randInt(0, 14));
      const completedAt = new Date(startedAt.getTime() + randInt(15, 45) * 60000);
      const dx = pick(DIAGNOSES);

      try {
        const consult = await prisma.consultation.create({
          data: {
            tenantId: tenant.id,
            locationId: location.id,
            patientId: p.id,
            doctorId: doctorUser.id,
            chiefComplaint: pick(CHIEF_COMPLAINTS),
            historySubjective: 'Patient reports symptoms began 3-5 days ago. No recent travel. No known exposures.',
            historyObjective: 'Alert, oriented. Vitals stable. No acute distress.',
            assessment: dx.desc,
            plan: 'Symptomatic treatment. Follow up in 1 week if symptoms persist.',
            status: 'COMPLETED',
            startedAt,
            completedAt,
            diagnoses: {
              create: [{ icdCode: dx.code, description: dx.desc, type: 'PRIMARY', sortOrder: 0 }],
            },
          },
        });
        consultsCreated++;

        // Create prescription for ~80% of consultations
        if (Math.random() < 0.8) {
          const rxNumber = `RX-${Date.now()}-${i}`;
          const meds = pickN(DRUGS, randInt(1, 3));
          await prisma.prescription.create({
            data: {
              tenantId: tenant.id,
              rxNumber,
              locationId: location.id,
              consultationId: consult.id,
              patientId: p.id,
              doctorId: doctorUser.id,
              status: pick(['ISSUED', 'SENT_TO_PHARMACY', 'DISPENSED']),
              validityDate: daysFromNow(30),
              issuedAt: completedAt,
              items: {
                create: meds.map((m, idx) => ({
                  drugName: m.name,
                  dosage: m.dosage,
                  frequency: m.freq,
                  durationDays: m.duration,
                  quantity: m.duration * (m.freq === 'TID' ? 3 : m.freq === 'BID' ? 2 : 1),
                  instructions: 'After food',
                  sortOrder: idx,
                })),
              },
            },
          });
          rxCreated++;
        }
      } catch (err: any) {
        console.log(`   ⚠️  Consultation skipped: ${err.message}`);
      }
    }
  }
  console.log(`   ✅ ${consultsCreated} consultations created`);
  console.log(`   ✅ ${rxCreated} prescriptions created`);

  // ── 5. INVOICES ──────────────────────────────────────────────────────────
  console.log('\n▶  Creating invoices...');
  const invCount = await prisma.invoice.count({ where: { tenantId: tenant.id } });
  let invoicesCreated = 0;
  if (invCount < 20) {
    const startSeq = invCount + 1;
    const year = new Date().getFullYear();
    for (let i = 0; i < 20 - invCount; i++) {
      const p = pick(createdPatients);
      const numLineItems = randInt(1, 4);
      const items = pickN(LINE_ITEMS, numLineItems);
      const subtotal = items.reduce((s, it) => s + it.price, 0);
      const discount = Math.random() < 0.3 ? Math.floor(subtotal * 0.1) : 0;
      const tax = Math.floor(subtotal * 0.05);
      const netTotal = subtotal - discount + tax;

      // Status distribution: 50% PAID, 20% PARTIAL, 20% FINALIZED, 10% DRAFT
      const rand = Math.random();
      let status: string;
      let paidAmount: number;
      if (rand < 0.5) { status = 'PAID'; paidAmount = netTotal; }
      else if (rand < 0.7) { status = 'PARTIAL'; paidAmount = Math.floor(netTotal * 0.5); }
      else if (rand < 0.9) { status = 'FINALIZED'; paidAmount = 0; }
      else { status = 'DRAFT'; paidAmount = 0; }

      const createdAt = daysAgo(randInt(0, 14));
      const invoiceNumber = `INV-${year}-${String(startSeq + i).padStart(6, '0')}`;

      try {
        const invoice = await prisma.invoice.create({
          data: {
            tenantId: tenant.id,
            invoiceNumber,
            locationId: location.id,
            patientId: p.id,
            doctorId: doctorUser.id,
            invoiceType: pick(['OPD', 'OPD', 'OPD', 'PHARMACY', 'LAB']),
            subtotal,
            discountAmount: discount,
            taxAmount: tax,
            netTotal,
            paidAmount,
            status,
            createdById: billingCreatedById,
            createdAt,
            lineItems: {
              create: items.map((it, idx) => ({
                description: it.desc,
                category: it.category,
                quantity: 1,
                unitPrice: it.price,
                amount: it.price,
                sortOrder: idx,
              })),
            },
          },
        });

        // Create payment record for PAID/PARTIAL invoices
        if (paidAmount > 0) {
          await prisma.payment.create({
            data: {
              tenantId: tenant.id,
              invoiceId: invoice.id,
              amount: paidAmount,
              paymentMethod: pick(['CASH', 'CARD', 'UPI']),
              paymentDate: createdAt,
              recordedById: billingCreatedById,
            },
          });
        }
        invoicesCreated++;
      } catch (err: any) {
        console.log(`   ⚠️  Invoice skipped: ${err.message}`);
      }
    }
  }
  console.log(`   ✅ ${invoicesCreated} invoices created`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  CLINICAL SEED COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  const finalCounts = {
    patients: await prisma.patient.count({ where: { tenantId: tenant.id } }),
    appointments: await prisma.appointment.count({ where: { tenantId: tenant.id } }),
    queueTokens: await prisma.queueToken.count({ where: { tenantId: tenant.id } }),
    consultations: await prisma.consultation.count({ where: { tenantId: tenant.id } }),
    prescriptions: await prisma.prescription.count({ where: { tenantId: tenant.id } }),
    invoices: await prisma.invoice.count({ where: { tenantId: tenant.id } }),
  };
  console.log(`  Total Patients:      ${finalCounts.patients}`);
  console.log(`  Total Appointments:  ${finalCounts.appointments}`);
  console.log(`  Total Queue Tokens:  ${finalCounts.queueTokens}`);
  console.log(`  Total Consultations: ${finalCounts.consultations}`);
  console.log(`  Total Prescriptions: ${finalCounts.prescriptions}`);
  console.log(`  Total Invoices:      ${finalCounts.invoices}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
