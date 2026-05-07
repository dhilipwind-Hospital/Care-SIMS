/**
 * seed-features.ts
 * Populates Ayphen General Hospital with demo data for all newly-added features:
 *   - Wards, Beds, Admissions
 *   - Drugs + DrugBatches (pharmacy inventory)
 *   - MedicationAdministration records (MAR) — SCHEDULED / ADMINISTERED / WITHHELD
 *   - WorkOrders (OPEN / IN_PROGRESS / COMPLETED, some overdue)
 *   - TeleconsultSessions (SCHEDULED / IN_PROGRESS / COMPLETED)
 *   - PalliativeCareRecords
 *   - HomeVisits (SCHEDULED / IN_PROGRESS / COMPLETED)
 *   - WasteCollections with manifest pipeline
 *   - LabQCRuns (PASS / WARNING / FAIL)
 *   - LabCalibrations (CURRENT / DUE / OVERDUE)
 *   - ShiftHandovers (DRAFT / SUBMITTED / ACKNOWLEDGED)
 *
 * Idempotent — safe to re-run. Will NOT touch other tenants.
 * Run: npx ts-node prisma/seed-features.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const HOSP_SLUG = 'ayphen-general-hospital';

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function hoursAgo(n: number) { return new Date(Date.now() - n * 60 * 60 * 1000); }
function hoursFromNow(n: number) { return new Date(Date.now() + n * 60 * 60 * 1000); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: HOSP_SLUG } });
  if (!tenant) throw new Error('Tenant not found — run seed-demo.ts first');
  console.log(`▶  Target: ${tenant.tradeName} (${tenant.id})`);

  const location = await prisma.tenantLocation.findFirst({ where: { tenantId: tenant.id } });
  if (!location) throw new Error('No location found for tenant');

  const doctorUser = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id, email: 'doctor@ayphenhosp.demo' } });
  const wardNurse = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id, email: 'wardnurse@ayphenhosp.demo' } });
  const chargeNurse = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id, email: 'chargenurse@ayphenhosp.demo' } });
  const labTech = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id, email: 'labtech@ayphenhosp.demo' } });
  const adminUser = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id, email: 'admin@ayphenhosp.demo' } });
  const receptionUser = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id, email: 'reception@ayphenhosp.demo' } });

  if (!doctorUser) throw new Error('Demo doctor not found — run seed-demo.ts first');
  const nurseId = wardNurse?.id || doctorUser.id;
  const chargeNurseId = chargeNurse?.id || nurseId;
  const labTechId = labTech?.id || doctorUser.id;
  const adminId = adminUser?.id || doctorUser.id;

  // Grab some patients created by seed-clinical
  const patients = await prisma.patient.findMany({ where: { tenantId: tenant.id }, take: 20 });
  if (patients.length === 0) throw new Error('No patients found — run seed-clinical.ts first');

  // ── 1. WARDS & BEDS ──────────────────────────────────────────────────────
  console.log('\n▶  Creating wards and beds...');

  const wardDefs = [
    { name: 'General Ward A', code: 'GWA', type: 'GENERAL', totalBeds: 20, floor: 1 },
    { name: 'General Ward B', code: 'GWB', type: 'GENERAL', totalBeds: 20, floor: 1 },
    { name: 'ICU', code: 'ICU', type: 'ICU', totalBeds: 8, floor: 2 },
    { name: 'Maternity Ward', code: 'MAT', type: 'MATERNITY', totalBeds: 12, floor: 2 },
    { name: 'Paediatric Ward', code: 'PAE', type: 'PAEDIATRIC', totalBeds: 10, floor: 3 },
  ];

  const wards: { id: string; code: string }[] = [];
  for (const wd of wardDefs) {
    const w = await prisma.ward.upsert({
      where: { tenantId_locationId_code: { tenantId: tenant.id, locationId: location.id, code: wd.code } },
      update: {},
      create: { tenantId: tenant.id, locationId: location.id, ...wd, chargeNurseId: chargeNurseId, isActive: true },
    });
    wards.push({ id: w.id, code: wd.code });
  }
  console.log(`   ✔ ${wards.length} wards`);

  // Create beds for each ward
  let totalBeds = 0;
  const allBeds: { id: string; wardId: string; status: string }[] = [];
  const bedStatuses = ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'OCCUPIED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'RESERVED'];
  for (const ward of wards) {
    const wardDef = wardDefs.find(w => w.code === ward.code)!;
    for (let b = 1; b <= wardDef.totalBeds; b++) {
      const bedNum = `${ward.code}-${String(b).padStart(2, '0')}`;
      const status = b <= 5 ? pick(bedStatuses) : 'AVAILABLE';
      const bed = await prisma.bed.upsert({
        where: { wardId_bedNumber: { wardId: ward.id, bedNumber: bedNum } },
        update: {},
        create: { tenantId: tenant.id, wardId: ward.id, bedNumber: bedNum, type: ward.code === 'ICU' ? 'ICU' : 'GENERAL', status },
      });
      allBeds.push({ id: bed.id, wardId: ward.id, status: bed.status });
      totalBeds++;
    }
  }
  console.log(`   ✔ ${totalBeds} beds`);

  // ── 2. ADMISSIONS ─────────────────────────────────────────────────────────
  console.log('\n▶  Creating admissions...');

  const occupiedBeds = allBeds.filter(b => b.status === 'OCCUPIED');
  const admissionDefs = [
    { i: 0, days: 5, diag: 'Acute appendicitis', type: 'EMERGENCY', status: 'ACTIVE' },
    { i: 1, days: 3, diag: 'Type 2 diabetes mellitus — uncontrolled', type: 'PLANNED', status: 'ACTIVE' },
    { i: 2, days: 7, diag: 'Community-acquired pneumonia', type: 'EMERGENCY', status: 'ACTIVE' },
    { i: 3, days: 1, diag: 'Elective cholecystectomy', type: 'PLANNED', status: 'ACTIVE' },
    { i: 4, days: 10, diag: 'COPD exacerbation', type: 'EMERGENCY', status: 'ACTIVE' },
    { i: 5, days: 14, diag: 'Post-op recovery — hip replacement', type: 'PLANNED', status: 'DISCHARGED' },
    { i: 6, days: 8, diag: 'Acute MI — NSTEMI', type: 'EMERGENCY', status: 'DISCHARGED' },
  ];

  const createdAdmissions: string[] = [];
  for (let idx = 0; idx < admissionDefs.length && idx < patients.length; idx++) {
    const def = admissionDefs[idx];
    const patient = patients[idx];
    const bed = occupiedBeds[idx] || allBeds[idx];
    const admNo = `ADM${String(100 + idx + 1).padStart(6, '0')}`;
    const existing = await prisma.admission.findUnique({ where: { admissionNumber: admNo } });
    if (existing) { createdAdmissions.push(existing.id); continue; }
    const adm = await prisma.admission.create({
      data: {
        tenantId: tenant.id,
        admissionNumber: admNo,
        locationId: location.id,
        patientId: patient.id,
        bedId: bed.id,
        wardId: bed.wardId,
        admittingDoctorId: doctorUser.id,
        admissionDate: daysAgo(def.days),
        admissionType: def.type,
        diagnosisOnAdmission: def.diag,
        expectedDischargeDate: daysFromNow(def.status === 'DISCHARGED' ? -1 : 3),
        dischargeDate: def.status === 'DISCHARGED' ? daysAgo(1) : null,
        dischargeType: def.status === 'DISCHARGED' ? 'REGULAR' : null,
        status: def.status,
        dailyBedCharge: 1500,
      },
    });
    createdAdmissions.push(adm.id);
  }
  console.log(`   ✔ ${createdAdmissions.length} admissions`);

  // ── 3. DRUGS & DRUG BATCHES ───────────────────────────────────────────────
  console.log('\n▶  Creating drugs and batches...');

  const drugDefs = [
    { brandName: 'Calpol 500mg', genericName: 'Paracetamol', category: 'ANALGESIC', dosageForm: 'TABLET', strength: '500mg', reorderLevel: 100, maxStockLevel: 2000 },
    { brandName: 'Augmentin 625mg', genericName: 'Amoxicillin+Clavulanate', category: 'ANTIBIOTIC', dosageForm: 'TABLET', strength: '625mg', reorderLevel: 50, maxStockLevel: 500 },
    { brandName: 'Glucophage 500mg', genericName: 'Metformin', category: 'ANTIDIABETIC', dosageForm: 'TABLET', strength: '500mg', reorderLevel: 200, maxStockLevel: 3000 },
    { brandName: 'Amlokind 5mg', genericName: 'Amlodipine', category: 'ANTIHYPERTENSIVE', dosageForm: 'TABLET', strength: '5mg', reorderLevel: 150, maxStockLevel: 2000 },
    { brandName: 'Pan 40mg', genericName: 'Pantoprazole', category: 'PPI', dosageForm: 'TABLET', strength: '40mg', reorderLevel: 100, maxStockLevel: 1500 },
    { brandName: 'Ciplox 500mg', genericName: 'Ciprofloxacin', category: 'ANTIBIOTIC', dosageForm: 'TABLET', strength: '500mg', reorderLevel: 50, maxStockLevel: 600 },
    { brandName: 'Morphine 10mg/ml', genericName: 'Morphine Sulphate', category: 'OPIOID_ANALGESIC', dosageForm: 'INJECTION', strength: '10mg/ml', reorderLevel: 20, maxStockLevel: 100, isControlled: true },
    { brandName: 'Normal Saline 500ml', genericName: 'Sodium Chloride 0.9%', category: 'IV_FLUID', dosageForm: 'IV_BAG', strength: '0.9%', reorderLevel: 100, maxStockLevel: 1000 },
    { brandName: 'Insulin Glargine 100U/ml', genericName: 'Insulin Glargine', category: 'INSULIN', dosageForm: 'INJECTION', strength: '100U/ml', reorderLevel: 30, maxStockLevel: 200 },
    { brandName: 'Ondansetron 4mg', genericName: 'Ondansetron', category: 'ANTIEMETIC', dosageForm: 'TABLET', strength: '4mg', reorderLevel: 80, maxStockLevel: 800 },
  ];

  const createdDrugs: { id: string; name: string }[] = [];
  for (const dd of drugDefs) {
    const existing = await prisma.drug.findFirst({ where: { tenantId: tenant.id, brandName: dd.brandName } });
    if (existing) { createdDrugs.push({ id: existing.id, name: existing.brandName }); continue; }
    const drug = await prisma.drug.create({
      data: { tenantId: tenant.id, brandName: dd.brandName, genericName: dd.genericName, category: dd.category, dosageForm: dd.dosageForm, strength: dd.strength, reorderLevel: dd.reorderLevel, maxStockLevel: dd.maxStockLevel, isControlled: (dd as any).isControlled || false, unitOfMeasure: dd.dosageForm === 'TABLET' ? 'STRIP' : 'UNIT', manufacturer: 'Demo Pharma Ltd', storageCondition: 'ROOM_TEMPERATURE' },
    });
    createdDrugs.push({ id: drug.id, name: drug.brandName });
  }

  // Create batches for each drug
  const batchStatuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'EXPIRING_SOON'];
  for (let i = 0; i < createdDrugs.length; i++) {
    const drug = createdDrugs[i];
    const batchNo = `BTH-2025-${String(i + 1).padStart(3, '0')}`;
    const existing = await prisma.drugBatch.findFirst({ where: { tenantId: tenant.id, drugId: drug.id, batchNumber: batchNo } });
    if (existing) continue;
    // Some batches expiring soon for demo
    const expiryMonths = i < 2 ? 1 : i < 4 ? 6 : 18;
    await prisma.drugBatch.create({
      data: {
        tenantId: tenant.id, drugId: drug.id, locationId: location.id,
        batchNumber: batchNo, expiryDate: daysFromNow(expiryMonths * 30),
        quantityInStock: i === 0 ? 8 : i === 1 ? 12 : 150 + i * 30, // first two low-stock
        unitCost: 5 + i * 8, shelfLocation: `R${i + 1}-S${(i % 3) + 1}`,
        status: i < 2 ? 'LOW_STOCK' : 'ACTIVE', receivedDate: daysAgo(30),
      },
    });
  }
  console.log(`   ✔ ${createdDrugs.length} drugs with batches`);

  // ── 4. MEDICATION ADMINISTRATION (MAR) ───────────────────────────────────
  console.log('\n▶  Creating MAR records...');

  const marDrugs = [
    { drugName: 'Paracetamol 500mg', dosage: '1 tablet', route: 'ORAL', frequency: 'TID' },
    { drugName: 'Metformin 500mg', dosage: '1 tablet', route: 'ORAL', frequency: 'BID' },
    { drugName: 'Amlodipine 5mg', dosage: '1 tablet', route: 'ORAL', frequency: 'OD' },
    { drugName: 'Pantoprazole 40mg', dosage: '1 tablet', route: 'ORAL', frequency: 'OD' },
    { drugName: 'Insulin Glargine 10U', dosage: '10 units', route: 'SC', frequency: 'HS' },
    { drugName: 'Normal Saline 500ml', dosage: '500ml', route: 'IV', frequency: 'BID' },
    { drugName: 'Ondansetron 4mg', dosage: '1 tablet', route: 'ORAL', frequency: 'TID' },
    { drugName: 'Ciprofloxacin 500mg', dosage: '1 tablet', route: 'ORAL', frequency: 'BID' },
  ];

  let marCount = 0;
  for (let admIdx = 0; admIdx < Math.min(createdAdmissions.length, 4); admIdx++) {
    const admId = createdAdmissions[admIdx];
    const patId = patients[admIdx].id;

    for (let drugIdx = 0; drugIdx < 4; drugIdx++) {
      const drug = marDrugs[drugIdx];
      // Create records over last 2 days + today + upcoming
      for (let hourOffset = -36; hourOffset <= 12; hourOffset += 8) {
        const sched = new Date(Date.now() + hourOffset * 60 * 60 * 1000);
        const isPast = hourOffset < 0;
        const isFarPast = hourOffset < -20;
        const status = isPast
          ? (isFarPast
            ? (Math.random() < 0.15 ? 'WITHHELD' : 'ADMINISTERED')
            : (hourOffset < -4 ? (Math.random() < 0.1 ? 'WITHHELD' : 'ADMINISTERED') : 'SCHEDULED'))
          : 'SCHEDULED';

        const existing = await prisma.medicationAdministration.findFirst({
          where: { tenantId: tenant.id, admissionId: admId, drugName: drug.drugName, scheduledTime: sched },
        });
        if (existing) continue;

        await prisma.medicationAdministration.create({
          data: {
            tenantId: tenant.id, locationId: location.id,
            admissionId: admId, patientId: patId,
            drugName: drug.drugName, dosage: drug.dosage,
            route: drug.route, frequency: drug.frequency,
            scheduledTime: sched,
            administeredTime: status === 'ADMINISTERED' ? new Date(sched.getTime() + 5 * 60 * 1000) : null,
            administeredById: status === 'ADMINISTERED' ? nurseId : null,
            status,
            withheldReason: status === 'WITHHELD' ? pick(['Patient refused', 'NPO for procedure', 'Drug interaction — held on doctor advice', 'Patient vomiting']) : null,
            notes: status === 'ADMINISTERED' ? 'Administered without adverse reaction' : null,
          },
        });
        marCount++;
      }
    }
  }
  console.log(`   ✔ ${marCount} MAR records`);

  // ── 5. WORK ORDERS ───────────────────────────────────────────────────────
  console.log('\n▶  Creating work orders...');

  const workOrderDefs = [
    { num: 'WO-001', cat: 'ELECTRICAL', pri: 'CRITICAL', desc: 'Power failure in ICU — UPS not switching over', status: 'COMPLETED', daysBack: 5, assignee: 'Raj Electricals', completionNote: 'UPS battery replaced and tested' },
    { num: 'WO-002', cat: 'PLUMBING', pri: 'HIGH', desc: 'Blocked drain in Operation Theatre washroom', status: 'COMPLETED', daysBack: 3, assignee: 'Swift Plumbing', completionNote: 'Drain cleared and sanitized' },
    { num: 'WO-003', cat: 'BIOMEDICAL', pri: 'HIGH', desc: 'ECG machine in Cardiology giving erratic readings', status: 'IN_PROGRESS', daysBack: 2, assignee: 'BioMed Services' },
    { num: 'WO-004', cat: 'HVAC', pri: 'MEDIUM', desc: 'AC not cooling in Radiology waiting area', status: 'IN_PROGRESS', daysBack: 1, assignee: 'Cool Air Services' },
    { num: 'WO-005', cat: 'IT', pri: 'HIGH', desc: 'Network switch down — pharmacy terminals offline', status: 'COMPLETED', daysBack: 4, assignee: 'IT Support Team', completionNote: 'Switch replaced, all terminals online' },
    { num: 'WO-006', cat: 'ELECTRICAL', pri: 'LOW', desc: 'Corridor lighting flickering on 2nd floor', status: 'OPEN', daysBack: 0 },
    { num: 'WO-007', cat: 'CARPENTRY', pri: 'LOW', desc: 'Broken door hinge in male ward bathroom', status: 'OPEN', daysBack: 0 },
    { num: 'WO-008', cat: 'HVAC', pri: 'MEDIUM', desc: 'Exhaust fan not working in lab specimen room', status: 'ASSIGNED', daysBack: 1, assignee: 'Cool Air Services' },
    { num: 'WO-009', cat: 'BIOMEDICAL', pri: 'CRITICAL', desc: 'Ventilator in ICU Bed 3 alarming — O2 sensor fault', status: 'IN_PROGRESS', daysBack: 0, assignee: 'BioMed Services' },
    { num: 'WO-010', cat: 'CIVIL', pri: 'MEDIUM', desc: 'Seepage from ceiling in OPD room 4', status: 'OPEN', daysBack: 6 }, // overdue
    { num: 'WO-011', cat: 'PAINTING', pri: 'LOW', desc: 'Wall paint peeling in general ward waiting area', status: 'OPEN', daysBack: 8 }, // overdue
    { num: 'WO-012', cat: 'IT', pri: 'MEDIUM', desc: 'Printer driver not installed on nurse station PC', status: 'COMPLETED', daysBack: 2, assignee: 'IT Support Team', completionNote: 'Driver installed and test print done' },
  ];

  let woCount = 0;
  for (const wo of workOrderDefs) {
    const existing = await prisma.workOrder.findUnique({ where: { workOrderNumber: wo.num } });
    if (existing) continue;
    const createdAt = daysAgo(wo.daysBack);
    await prisma.workOrder.create({
      data: {
        tenantId: tenant.id, workOrderNumber: wo.num,
        requestedById: adminId, locationId: location.id,
        category: wo.cat, priority: wo.pri, description: wo.desc,
        assignedToName: wo.assignee || null,
        assignedToId: wo.assignee ? adminId : null,
        status: wo.status,
        startedAt: ['IN_PROGRESS', 'COMPLETED'].includes(wo.status) ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : null,
        completedAt: wo.status === 'COMPLETED' ? new Date(createdAt.getTime() + 6 * 60 * 60 * 1000) : null,
        notes: (wo as any).completionNote || null,
        estimatedCost: pick([500, 1000, 1500, 2500, 5000, 8000]),
        actualCost: wo.status === 'COMPLETED' ? pick([600, 900, 1200, 2800, 4500]) : null,
        createdAt,
      },
    });
    woCount++;
  }
  console.log(`   ✔ ${woCount} work orders`);

  // ── 6. TELECONSULT SESSIONS ───────────────────────────────────────────────
  console.log('\n▶  Creating teleconsult sessions...');

  const tcDefs = [
    { code: 'TC-001', status: 'COMPLETED', hoursBack: 48, duration: 22, drJoined: true, ptJoined: true },
    { code: 'TC-002', status: 'COMPLETED', hoursBack: 24, duration: 18, drJoined: true, ptJoined: true },
    { code: 'TC-003', status: 'COMPLETED', hoursBack: 4, duration: 30, drJoined: true, ptJoined: true },
    { code: 'TC-004', status: 'IN_PROGRESS', hoursBack: 0, duration: null, drJoined: true, ptJoined: true },
    { code: 'TC-005', status: 'SCHEDULED', hoursForward: 2, drJoined: false, ptJoined: false },
    { code: 'TC-006', status: 'SCHEDULED', hoursForward: 5, drJoined: false, ptJoined: false },
    { code: 'TC-007', status: 'SCHEDULED', hoursForward: 24, drJoined: false, ptJoined: false },
    { code: 'TC-008', status: 'CANCELLED', hoursBack: 12, cancelReason: 'Patient requested reschedule' },
  ];

  let tcCount = 0;
  for (let i = 0; i < tcDefs.length && i < patients.length; i++) {
    const tc = tcDefs[i];
    const patient = patients[i + 5]; // offset from admission patients
    if (!patient) continue;
    const existing = await prisma.teleconsultSession.findUnique({ where: { sessionCode: tc.code } });
    if (existing) continue;

    const scheduledAt = (tc as any).hoursForward
      ? hoursFromNow((tc as any).hoursForward)
      : hoursAgo((tc as any).hoursBack || 0);

    await prisma.teleconsultSession.create({
      data: {
        tenantId: tenant.id, sessionCode: tc.code, locationId: location.id,
        patientId: patient.id, doctorId: doctorUser.id,
        sessionType: pick(['VIDEO', 'VIDEO', 'AUDIO']),
        scheduledAt,
        startedAt: tc.status !== 'SCHEDULED' && tc.status !== 'CANCELLED' ? new Date(scheduledAt.getTime() + 2 * 60 * 1000) : null,
        endedAt: tc.status === 'COMPLETED' ? new Date(scheduledAt.getTime() + ((tc.duration || 20) + 2) * 60 * 1000) : null,
        durationMinutes: tc.status === 'COMPLETED' ? (tc.duration || 20) : null,
        roomUrl: `https://meet.ayphen.demo/room/${tc.code}`,
        patientJoined: tc.ptJoined || false,
        doctorJoined: tc.drJoined || false,
        status: tc.status,
        cancelledReason: (tc as any).cancelReason || null,
        notes: tc.status === 'COMPLETED' ? 'Follow-up in 2 weeks. Prescription sent.' : null,
      },
    });
    tcCount++;
  }
  console.log(`   ✔ ${tcCount} teleconsult sessions`);

  // ── 7. PALLIATIVE CARE RECORDS ────────────────────────────────────────────
  console.log('\n▶  Creating palliative care records...');

  const palliativeDefs = [
    { pIdx: 10, type: 'ASSESSMENT', pain: 7, diag: 'Advanced Ca Lung', support: 'COMBINED', status: 'ACTIVE', goals: 'COMFORT_ONLY', daysBack: 5 },
    { pIdx: 11, type: 'SYMPTOM_CHECK', pain: 4, diag: 'End-stage renal disease', support: 'MEDICAL', status: 'ACTIVE', goals: 'DNR', daysBack: 3 },
    { pIdx: 12, type: 'FAMILY_MEETING', pain: 3, diag: 'Metastatic breast cancer', support: 'PSYCHOLOGICAL', status: 'ACTIVE', goals: 'DNR', daysBack: 2 },
    { pIdx: 13, type: 'GOALS_OF_CARE', pain: 8, diag: 'Advanced Ca Pancreas', support: 'COMBINED', status: 'ACTIVE', goals: 'COMFORT_ONLY', daysBack: 1 },
    { pIdx: 14, type: 'FOLLOW_UP', pain: 2, diag: 'COPD — end stage', support: 'MEDICAL', status: 'DISCHARGED', goals: 'FULL_CODE', daysBack: 7 },
    { pIdx: 15, type: 'ASSESSMENT', pain: 6, diag: 'Advanced Ca Colon', support: 'SOCIAL', status: 'ACTIVE', goals: 'DNI', daysBack: 0 },
  ];

  let palCount = 0;
  for (const pd of palliativeDefs) {
    if (pd.pIdx >= patients.length) continue;
    const patient = patients[pd.pIdx];
    const existing = await prisma.palliativeCareRecord.findFirst({
      where: { tenantId: tenant.id, patientId: patient.id, recordType: pd.type },
    });
    if (existing) continue;

    await prisma.palliativeCareRecord.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        recordType: pd.type,
        diagnosis: pd.diag,
        painScore: pd.pain,
        painType: pick(['NOCICEPTIVE', 'NEUROPATHIC', 'MIXED', 'VISCERAL']),
        supportType: pd.support,
        primaryNurse: chargeNurse ? `${chargeNurse.firstName} ${chargeNurse.lastName || ''}`.trim() : 'Meenakshi Pillai',
        carePlan: `${pd.diag} — focus on comfort and pain management. Daily assessment required.`,
        status: pd.status,
        symptoms: [
          { symptom: 'Pain', severity: pd.pain },
          { symptom: 'Nausea', severity: Math.floor(Math.random() * 5) },
          { symptom: 'Fatigue', severity: Math.floor(Math.random() * 8) + 2 },
        ],
        goalsOfCare: pd.goals,
        advanceDirective: pd.goals === 'COMFORT_ONLY' ? 'Patient has signed advance directive opting for comfort care only.' : null,
        familyMeetingNotes: pd.type === 'FAMILY_MEETING' ? 'Family members present: spouse and two children. Goals of care discussed. Family agrees with comfort-focused approach.' : null,
        medications: [{ drug: 'Morphine 5mg', route: 'SC', frequency: 'Q4H PRN' }, { drug: 'Haloperidol 0.5mg', route: 'SC', frequency: 'Q8H' }],
        assessedById: doctorUser.id,
        assessedAt: daysAgo(pd.daysBack),
        nextFollowUp: daysFromNow(pd.status === 'DISCHARGED' ? -1 : 3),
        notes: `Pain well-controlled with current regimen. Continue monitoring.`,
      },
    });
    palCount++;
  }
  console.log(`   ✔ ${palCount} palliative care records`);

  // ── 8. HOME VISITS ────────────────────────────────────────────────────────
  console.log('\n▶  Creating home visits...');

  const nurseName = wardNurse ? `${wardNurse.firstName} ${wardNurse.lastName || ''}`.trim() : 'Anitha Balan';
  const homeVisitDefs = [
    { pIdx: 0, type: 'ROUTINE', status: 'COMPLETED', daysBack: 3, address: '42, Anna Nagar West, Chennai 600040' },
    { pIdx: 1, type: 'WOUND_CARE', status: 'COMPLETED', daysBack: 2, address: '15, T Nagar, Chennai 600017' },
    { pIdx: 2, type: 'POST_DISCHARGE', status: 'COMPLETED', daysBack: 1, address: '8, Adyar, Chennai 600020' },
    { pIdx: 3, type: 'MEDICATION', status: 'IN_PROGRESS', daysBack: 0, address: '77, Velachery Main Road, Chennai 600042' },
    { pIdx: 4, type: 'PHYSIOTHERAPY', status: 'SCHEDULED', daysForward: 1, address: '203, Tambaram East, Chennai 600059' },
    { pIdx: 5, type: 'PALLIATIVE', status: 'SCHEDULED', daysForward: 2, address: '56, KK Nagar, Chennai 600078' },
    { pIdx: 6, type: 'ROUTINE', status: 'SCHEDULED', daysForward: 3, address: '91, Porur, Chennai 600116' },
    { pIdx: 7, type: 'WOUND_CARE', status: 'CANCELLED', daysBack: 1, address: '34, Chromepet, Chennai 600044' },
    { pIdx: 8, type: 'POST_DISCHARGE', status: 'SCHEDULED', daysForward: 1, address: '12, Sholinganallur, Chennai 600119' },
    { pIdx: 9, type: 'ROUTINE', status: 'NO_ACCESS', daysBack: 2, address: '65, Perambur, Chennai 600011' },
  ];

  let hvCount = 0;
  for (const hv of homeVisitDefs) {
    if (hv.pIdx >= patients.length) continue;
    const patient = patients[hv.pIdx];
    const visitDate = (hv as any).daysForward ? daysFromNow((hv as any).daysForward) : daysAgo(hv.daysBack || 0);
    const existing = await prisma.homeVisit.findFirst({ where: { tenantId: tenant.id, patientId: patient.id, visitDate } });
    if (existing) continue;

    await prisma.homeVisit.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        visitDate,
        visitType: hv.type,
        staffId: nurseId,
        nurseId: nurseId,
        nurseName,
        address: hv.address,
        status: hv.status,
        startTime: hv.status === 'COMPLETED' ? new Date(visitDate.getTime() + 9 * 60 * 60 * 1000) : hv.status === 'IN_PROGRESS' ? new Date() : null,
        endTime: hv.status === 'COMPLETED' ? new Date(visitDate.getTime() + 10.5 * 60 * 60 * 1000) : null,
        vitalsRecorded: hv.status === 'COMPLETED' ? { bp: `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 15)}`, pulse: 72 + Math.floor(Math.random() * 20), temp: (36.5 + Math.random()).toFixed(1), spo2: 95 + Math.floor(Math.random() * 5) } : null,
        medications: hv.type === 'MEDICATION' ? 'Metformin 500mg OD, Amlodipine 5mg OD' : null,
        followUpDate: hv.status === 'COMPLETED' ? daysFromNow(7) : null,
        notes: hv.status === 'NO_ACCESS' ? 'Patient not available at home. Neighbour informed to pass message.' : hv.status === 'CANCELLED' ? 'Patient cancelled — admitted to hospital' : null,
      },
    });
    hvCount++;
  }
  console.log(`   ✔ ${hvCount} home visits`);

  // ── 9. WASTE COLLECTIONS ──────────────────────────────────────────────────
  console.log('\n▶  Creating waste collections...');

  const wasteDefs = [
    { cat: 'YELLOW', kg: 4.5, vendor: 'GreenPath Bio Waste', manifest: 'MAN-2025-001', mStatus: 'COMPLETED', daysBack: 5, handed: true, disposal: 'INCINERATION' },
    { cat: 'RED', kg: 2.8, vendor: 'GreenPath Bio Waste', manifest: 'MAN-2025-002', mStatus: 'ACKNOWLEDGED', daysBack: 3, handed: true, disposal: 'AUTOCLAVE' },
    { cat: 'WHITE', kg: 1.2, vendor: 'GreenPath Bio Waste', manifest: 'MAN-2025-003', mStatus: 'SUBMITTED', daysBack: 2, handed: true, disposal: 'INCINERATION' },
    { cat: 'BLUE', kg: 3.0, vendor: 'GreenPath Bio Waste', manifest: 'MAN-2025-004', mStatus: 'PENDING', daysBack: 1, handed: false, disposal: 'RECYCLING' },
    { cat: 'BLACK', kg: 8.5, vendor: 'Municipal Corporation', manifest: null, mStatus: 'PENDING', daysBack: 0, handed: false, disposal: 'DEEP_BURIAL' },
    { cat: 'YELLOW', kg: 5.2, vendor: 'GreenPath Bio Waste', manifest: 'MAN-2025-005', mStatus: 'COMPLETED', daysBack: 8, handed: true, disposal: 'INCINERATION' },
    { cat: 'RED', kg: 1.6, vendor: 'GreenPath Bio Waste', manifest: 'MAN-2025-006', mStatus: 'COMPLETED', daysBack: 10, handed: true, disposal: 'CHEMICAL' },
  ];

  let wasteCount = 0;
  for (const wd of wasteDefs) {
    const collectedAt = daysAgo(wd.daysBack);
    const existing = await prisma.wasteCollection.findFirst({ where: { tenantId: tenant.id, manifestNumber: wd.manifest || undefined, collectedAt } });
    if (existing) continue;
    await prisma.wasteCollection.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        wasteCategory: wd.cat, weightKg: wd.kg,
        collectedById: adminId, collectedAt,
        handedToVendor: wd.handed,
        handedAt: wd.handed ? new Date(collectedAt.getTime() + 4 * 60 * 60 * 1000) : null,
        vendorName: wd.vendor, manifestNumber: wd.manifest,
        manifestStatus: wd.mStatus, disposalMethod: wd.disposal,
        notes: `Daily ${wd.cat} waste collection — ${wd.kg}kg`,
      },
    });
    wasteCount++;
  }
  console.log(`   ✔ ${wasteCount} waste collection records`);

  // ── 10. LAB QC RUNS ───────────────────────────────────────────────────────
  console.log('\n▶  Creating Lab QC runs...');

  const qcDefs = [
    { lot: 'QC-LOT-2025-A', test: 'Glucose', analyzer: 'Roche Cobas C311', level: 'LEVEL_1', expected: '5.5', obtained: '5.6', status: 'PASS' },
    { lot: 'QC-LOT-2025-A', test: 'Glucose', analyzer: 'Roche Cobas C311', level: 'LEVEL_2', expected: '12.0', obtained: '12.1', status: 'PASS' },
    { lot: 'QC-LOT-2025-B', test: 'Haemoglobin', analyzer: 'Sysmex XN-550', level: 'LEVEL_1', expected: '10.0', obtained: '10.6', status: 'WARNING' },
    { lot: 'QC-LOT-2025-B', test: 'Haemoglobin', analyzer: 'Sysmex XN-550', level: 'LEVEL_2', expected: '14.5', obtained: '14.4', status: 'PASS' },
    { lot: 'QC-LOT-2025-C', test: 'Creatinine', analyzer: 'Roche Cobas C311', level: 'LEVEL_1', expected: '90', obtained: '102', status: 'FAIL' },
    { lot: 'QC-LOT-2025-C', test: 'Creatinine', analyzer: 'Roche Cobas C311', level: 'LEVEL_2', expected: '180', obtained: '181', status: 'PASS' },
    { lot: 'QC-LOT-2025-D', test: 'PT/INR', analyzer: 'Stago STA-R MAX', level: 'LEVEL_1', expected: '1.0', obtained: '1.02', status: 'PASS' },
    { lot: 'QC-LOT-2025-D', test: 'TSH', analyzer: 'CLIA Analyzer', level: 'LEVEL_1', expected: '2.5', obtained: '2.7', status: 'PASS' },
  ];

  let qcCount = 0;
  for (const qc of qcDefs) {
    const existing = await prisma.labQCRun.findFirst({ where: { tenantId: tenant.id, qcLot: qc.lot, testName: qc.test, controlLevel: qc.level } });
    if (existing) continue;
    await prisma.labQCRun.create({
      data: {
        tenantId: tenant.id, qcLot: qc.lot, testName: qc.test,
        analyzer: qc.analyzer, controlLevel: qc.level,
        expectedValue: qc.expected, obtainedValue: qc.obtained,
        status: qc.status, performedById: labTechId,
        runDate: daysAgo(Math.floor(Math.random() * 3)),
        notes: qc.status === 'FAIL' ? 'Calibration check required. Notified Lab Supervisor.' : qc.status === 'WARNING' ? 'Borderline deviation. Repeat run performed — PASS.' : null,
      },
    });
    qcCount++;
  }
  console.log(`   ✔ ${qcCount} Lab QC runs`);

  // ── 11. LAB CALIBRATIONS ─────────────────────────────────────────────────
  console.log('\n▶  Creating Lab calibrations...');

  const calDefs = [
    { instrument: 'Roche Cobas C311', test: 'Clinical Chemistry Panel', last: daysAgo(20), next: daysFromNow(10), status: 'CURRENT' },
    { instrument: 'Sysmex XN-550', test: 'Complete Blood Count', last: daysAgo(25), next: daysFromNow(5), status: 'CURRENT' },
    { instrument: 'Stago STA-R MAX', test: 'Coagulation Profile', last: daysAgo(30), next: daysFromNow(0), status: 'DUE' }, // due today
    { instrument: 'CLIA Analyzer', test: 'Immunoassay Panel', last: daysAgo(45), next: daysAgo(5), status: 'OVERDUE' },
    { instrument: 'Blood Gas Analyzer', test: 'ABG Analysis', last: daysAgo(14), next: daysFromNow(16), status: 'CURRENT' },
    { instrument: 'Urine Analyzer', test: 'Urine Microscopy', last: daysAgo(10), next: daysFromNow(20), status: 'CURRENT' },
    { instrument: 'Centrifuge — Lab 1', test: 'Sample Processing', last: daysAgo(60), next: daysAgo(30), status: 'OVERDUE' },
  ];

  let calCount = 0;
  for (const cd of calDefs) {
    const existing = await prisma.labCalibration.findFirst({ where: { tenantId: tenant.id, instrument: cd.instrument, testName: cd.test } });
    if (existing) continue;
    await prisma.labCalibration.create({
      data: {
        tenantId: tenant.id, instrument: cd.instrument, testName: cd.test,
        lastCalibration: cd.last, nextDue: cd.next, status: cd.status,
        performedById: labTechId,
        notes: cd.status === 'OVERDUE' ? 'Calibration overdue — schedule with biomedical engineer immediately.' : cd.status === 'DUE' ? 'Calibration due today — arrange with biomedical team.' : null,
      },
    });
    calCount++;
  }
  console.log(`   ✔ ${calCount} Lab calibration records`);

  // ── 12. SHIFT HANDOVERS ───────────────────────────────────────────────────
  console.log('\n▶  Creating shift handovers...');

  const generalWard = wards.find(w => w.code === 'GWA');
  const shiftDefs = [
    { type: 'MORNING', daysBack: 2, status: 'ACKNOWLEDGED', fromName: 'Anitha Balan', toName: 'Meenakshi Pillai' },
    { type: 'EVENING', daysBack: 2, status: 'ACKNOWLEDGED', fromName: 'Meenakshi Pillai', toName: 'Anitha Balan' },
    { type: 'NIGHT', daysBack: 2, status: 'ACKNOWLEDGED', fromName: 'Anitha Balan', toName: 'Meenakshi Pillai' },
    { type: 'MORNING', daysBack: 1, status: 'ACKNOWLEDGED', fromName: 'Meenakshi Pillai', toName: 'Anitha Balan' },
    { type: 'EVENING', daysBack: 1, status: 'SUBMITTED', fromName: 'Anitha Balan', toName: 'Meenakshi Pillai' },
    { type: 'NIGHT', daysBack: 0, status: 'DRAFT', fromName: 'Meenakshi Pillai', toName: null },
  ];

  let shiftCount = 0;
  for (const sd of shiftDefs) {
    const shiftDate = daysAgo(sd.daysBack);
    shiftDate.setHours(0, 0, 0, 0);
    const existing = await prisma.shiftHandover.findFirst({ where: { tenantId: tenant.id, shiftType: sd.type, shiftDate, handoverFromName: sd.fromName } });
    if (existing) continue;
    await prisma.shiftHandover.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        wardId: generalWard?.id || null,
        shiftDate, shiftType: sd.type,
        handoverFromId: chargeNurseId, handoverFromName: sd.fromName,
        handoverToId: sd.toName ? nurseId : null, handoverToName: sd.toName,
        patientSummary: [
          { bedNo: 'GWA-01', patient: 'Arjun Sharma', condition: 'Stable', alerts: 'BP monitoring QID' },
          { bedNo: 'GWA-02', patient: 'Priya Nair', condition: 'Improving', alerts: 'Antibiotics 6-hourly' },
          { bedNo: 'GWA-04', patient: 'Vikram Kumar', condition: 'Critical', alerts: 'Awaiting CT report. Dr. notified.' },
        ],
        criticalAlerts: sd.type === 'NIGHT' ? ['Bed GWA-04: Vitals unstable — BP 90/60', 'Bed GWA-07: High fever 39.8°C — doctor informed'] : [],
        pendingTasks: [{ task: 'IV line change — Bed GWA-03', due: '08:00' }, { task: 'Dressing — Bed GWA-05', due: '09:00' }],
        medicationNotes: 'Morphine keys handed over. Count: 8 vials (was 10, 2 administered this shift).',
        generalNotes: 'Ward generally quiet. New admission expected from OT by 10pm.',
        status: sd.status,
        acknowledgedAt: sd.status === 'ACKNOWLEDGED' ? new Date(daysAgo(sd.daysBack).getTime() + 8 * 60 * 60 * 1000) : null,
      },
    });
    shiftCount++;
  }
  console.log(`   ✔ ${shiftCount} shift handovers`);

  console.log('\n✅  seed-features.ts complete!\n');
  console.log('Summary:');
  console.log(`  Wards: ${wards.length}, Beds: ${totalBeds}`);
  console.log(`  Admissions: ${createdAdmissions.length}`);
  console.log(`  Drugs: ${createdDrugs.length} with batches`);
  console.log(`  MAR records: ${marCount}`);
  console.log(`  Work orders: ${woCount}`);
  console.log(`  Teleconsult sessions: ${tcCount}`);
  console.log(`  Palliative care records: ${palCount}`);
  console.log(`  Home visits: ${hvCount}`);
  console.log(`  Waste collections: ${wasteCount}`);
  console.log(`  Lab QC runs: ${qcCount}`);
  console.log(`  Lab calibrations: ${calCount}`);
  console.log(`  Shift handovers: ${shiftCount}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
