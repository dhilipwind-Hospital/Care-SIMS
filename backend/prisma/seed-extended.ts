/**
 * seed-extended.ts
 * Covers all modules that still had no demo data after seed-features.ts:
 *   - Vitals, TriageRecords, EmergencyVisits
 *   - ICU Beds, ICU Monitoring, ICU Rounds
 *   - NICU Admissions + Daily Records
 *   - DischargeSummaries
 *   - Dialysis Machines + Sessions
 *   - Physiotherapy Orders + Sessions
 *   - Blood Bank (Donors, Donations, Inventory, Transfusions)
 *   - Radiology Orders + Results
 *   - Insurance Policies + Claims
 *   - Wound Assessments
 *   - Antibiotic Usage (Antimicrobial stewardship)
 *   - Care Protocols + Patient Pathways
 *   - Diet Orders + Meals
 *   - Ambulances + Trips
 *   - Assets + Maintenance Logs
 *   - Grievances
 *   - Infection Control Records
 *   - Quality Indicators + Incidents
 *   - Mortuary Records
 *   - Staff Attendance
 *   - Vendors
 *   - Inventory Items + Batches + Transactions
 *
 * Idempotent — safe to re-run.
 * Run: npx ts-node prisma/seed-extended.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const HOSP_SLUG = 'ayphen-general-hospital';

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: HOSP_SLUG } });
  if (!tenant) throw new Error('Tenant not found — run seed-demo.ts first');
  console.log(`▶  Target: ${tenant.tradeName} (${tenant.id})`);

  const location = await prisma.tenantLocation.findFirst({ where: { tenantId: tenant.id } });
  if (!location) throw new Error('No location found for tenant');

  const doctorUser = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id, email: 'doctor@ayphenhosp.demo' } });
  const wardNurse = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id, email: 'wardnurse@ayphenhosp.demo' } });
  const chargeNurse = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id, email: 'chargenurse@ayphenhosp.demo' } });
  const adminUser = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id, email: 'admin@ayphenhosp.demo' } });

  if (!doctorUser) throw new Error('Demo doctor not found — run seed-demo.ts first');
  const nurseId = wardNurse?.id || doctorUser.id;
  const chargeNurseId = chargeNurse?.id || nurseId;
  const adminId = adminUser?.id || doctorUser.id;

  const patients = await prisma.patient.findMany({ where: { tenantId: tenant.id }, take: 25 });
  if (patients.length === 0) throw new Error('No patients found — run seed-clinical.ts first');

  const admissions = await prisma.admission.findMany({ where: { tenantId: tenant.id }, take: 7 });
  const icuWard = await prisma.ward.findFirst({ where: { tenantId: tenant.id, code: 'ICU' } });

  // ── 1. VITALS ────────────────────────────────────────────────────────────
  console.log('\n▶  Creating vitals...');
  let vitalsCount = 0;
  const vitalPatients = patients.slice(0, 10);
  for (let p = 0; p < vitalPatients.length; p++) {
    const patient = vitalPatients[p];
    const admission = admissions[p] || null;
    for (let h = 0; h < 4; h++) {
      const recordedAt = daysAgo(h);
      const existing = await prisma.vital.findFirst({ where: { tenantId: tenant.id, patientId: patient.id, recordedAt } });
      if (existing) continue;
      const systolic = 110 + randInt(0, 40);
      const diastolic = 70 + randInt(0, 20);
      const hasAbnormal = systolic > 140 || diastolic > 90;
      await prisma.vital.create({
        data: {
          tenantId: tenant.id, locationId: location.id,
          patientId: patient.id,
          admissionId: admission?.id || null,
          systolicBp: systolic, diastolicBp: diastolic,
          heartRate: 68 + randInt(0, 30),
          respiratoryRate: 14 + randInt(0, 6),
          temperatureC: parseFloat((36.4 + Math.random() * 1.5).toFixed(1)),
          spo2: parseFloat((95 + Math.random() * 5).toFixed(1)),
          weightKg: parseFloat((50 + Math.random() * 40).toFixed(1)),
          painScore: randInt(0, 5),
          hasAbnormal, abnormalFields: hasAbnormal ? ['systolicBp'] : [],
          recordedById: nurseId, recordedAt,
        },
      });
      vitalsCount++;
    }
  }
  console.log(`   ✔ ${vitalsCount} vitals`);

  // ── 2. TRIAGE RECORDS ─────────────────────────────────────────────────────
  console.log('\n▶  Creating triage records...');
  const triageLevels = ['RED', 'YELLOW', 'GREEN', 'GREEN', 'YELLOW'];
  const complaints = ['Chest pain, diaphoresis', 'High fever 104°F', 'Abdominal pain — acute onset', 'Shortness of breath', 'Road traffic accident — laceration', 'Giddiness and near-syncope', 'Diabetic foot — cellulitis'];
  let triageCount = 0;
  for (let i = 0; i < 7 && i < patients.length; i++) {
    const existing = await prisma.triageRecord.findFirst({ where: { tenantId: tenant.id, patientId: patients[i + 5].id } });
    if (existing) continue;
    await prisma.triageRecord.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        patientId: patients[i + 5].id,
        chiefComplaint: complaints[i],
        symptoms: [complaints[i].split(',')[0].trim(), 'Distress'],
        triageLevel: triageLevels[i % 5],
        vitalsOnArrival: { bp: `${110 + i * 5}/${70 + i * 2}`, pulse: 78 + i * 5, temp: 37.2 + i * 0.3, spo2: 97 - i },
        painScore: 3 + i,
        gcs: i < 2 ? 15 : 14,
        assignedDoctorId: doctorUser.id,
        triagedById: nurseId,
        triageTime: daysAgo(i),
        notes: `Triage level ${triageLevels[i % 5]} assigned based on presentation.`,
      },
    });
    triageCount++;
  }
  console.log(`   ✔ ${triageCount} triage records`);

  // ── 3. EMERGENCY VISITS ───────────────────────────────────────────────────
  console.log('\n▶  Creating emergency visits...');
  const evDefs = [
    { num: 'EV-001', triage: 'RED', complaint: 'Acute chest pain — STEMI', mode: 'AMBULANCE', status: 'ADMITTED', daysBack: 5 },
    { num: 'EV-002', triage: 'YELLOW', complaint: 'High fever + seizure', mode: 'WALK_IN', status: 'DISCHARGED', daysBack: 4 },
    { num: 'EV-003', triage: 'GREEN', complaint: 'Minor laceration — hand', mode: 'WALK_IN', status: 'DISCHARGED', daysBack: 3 },
    { num: 'EV-004', triage: 'YELLOW', complaint: 'Severe abdominal pain', mode: 'REFERRED', status: 'ADMITTED', daysBack: 2 },
    { num: 'EV-005', triage: 'RED', complaint: 'Road accident — multiple injuries', mode: 'AMBULANCE', status: 'ADMITTED', daysBack: 1, isMlc: true },
    { num: 'EV-006', triage: 'GREEN', complaint: 'Allergic reaction — mild urticaria', mode: 'WALK_IN', status: 'DISCHARGED', daysBack: 1 },
    { num: 'EV-007', triage: 'YELLOW', complaint: 'Diabetic hypoglycemia', mode: 'WALK_IN', status: 'BEING_SEEN', daysBack: 0 },
  ];
  let evCount = 0;
  for (let i = 0; i < evDefs.length && i < patients.length; i++) {
    const ev = evDefs[i];
    const existing = await prisma.emergencyVisit.findUnique({ where: { visitNumber: ev.num } });
    if (existing) continue;
    const arrivalTime = daysAgo(ev.daysBack);
    await prisma.emergencyVisit.create({
      data: {
        tenantId: tenant.id, visitNumber: ev.num, locationId: location.id,
        patientId: patients[i].id,
        triageCategory: ev.triage, chiefComplaint: ev.complaint,
        arrivalMode: ev.mode, arrivalTime,
        vitalsOnArrival: { bp: `${120 + i * 3}/${80 + i}`, pulse: 80 + i * 5, spo2: 97 - i, temp: 37.5 + i * 0.2 },
        gcsOnArrival: ev.triage === 'RED' ? 13 : 15,
        assignedDoctorId: doctorUser.id,
        isMlc: (ev as any).isMlc || false,
        mlcNumber: (ev as any).isMlc ? `MLC-2025-${String(i + 1).padStart(4, '0')}` : null,
        disposition: ev.status === 'DISCHARGED' ? 'DISCHARGED' : ev.status === 'ADMITTED' ? 'ADMITTED' : null,
        dispositionTime: ev.status !== 'BEING_SEEN' ? new Date(arrivalTime.getTime() + 3 * 60 * 60 * 1000) : null,
        status: ev.status, createdById: adminId,
      },
    });
    evCount++;
  }
  console.log(`   ✔ ${evCount} emergency visits`);

  // ── 4. ICU BEDS ───────────────────────────────────────────────────────────
  console.log('\n▶  Creating ICU beds...');
  const icuBedDefs = [
    { num: 'ICU-01', type: 'GENERAL_ICU', hasVentilator: true, hasDialysis: true, status: 'OCCUPIED' },
    { num: 'ICU-02', type: 'GENERAL_ICU', hasVentilator: true, hasDialysis: false, status: 'OCCUPIED' },
    { num: 'ICU-03', type: 'GENERAL_ICU', hasVentilator: true, hasDialysis: false, status: 'AVAILABLE' },
    { num: 'ICU-04', type: 'CARDIAC_ICU', hasVentilator: false, hasDialysis: false, status: 'OCCUPIED' },
    { num: 'ICU-05', type: 'CARDIAC_ICU', hasVentilator: false, hasDialysis: false, status: 'AVAILABLE' },
    { num: 'ICU-06', type: 'NEURO_ICU', hasVentilator: true, hasDialysis: false, status: 'OCCUPIED' },
    { num: 'ICU-07', type: 'NEURO_ICU', hasVentilator: false, hasDialysis: false, status: 'AVAILABLE' },
    { num: 'ICU-08', type: 'PICU', hasVentilator: true, hasDialysis: false, status: 'AVAILABLE' },
  ];

  const wardId = icuWard?.id || (await prisma.ward.findFirst({ where: { tenantId: tenant.id } }))?.id || '';
  const createdIcuBeds: string[] = [];
  for (const ib of icuBedDefs) {
    const existing = await prisma.icuBed.findFirst({ where: { tenantId: tenant.id, wardId, bedNumber: ib.num } });
    if (existing) { createdIcuBeds.push(existing.id); continue; }
    const occupiedPt = ib.status === 'OCCUPIED' ? patients[createdIcuBeds.length]?.id : null;
    const bed = await prisma.icuBed.create({
      data: {
        tenantId: tenant.id, locationId: location.id, wardId,
        bedNumber: ib.num, icuType: ib.type,
        hasVentilator: ib.hasVentilator, hasMonitor: true, hasDialysis: ib.hasDialysis,
        status: ib.status, currentPatientId: occupiedPt,
        admittedAt: occupiedPt ? daysAgo(randInt(1, 5)) : null,
      },
    });
    createdIcuBeds.push(bed.id);
  }
  console.log(`   ✔ ${createdIcuBeds.length} ICU beds`);

  // ── 5. ICU MONITORING ────────────────────────────────────────────────────
  console.log('\n▶  Creating ICU monitoring records...');
  let icuMonCount = 0;
  const occupiedIcuBeds = icuBedDefs.filter(b => b.status === 'OCCUPIED');
  for (let i = 0; i < Math.min(occupiedIcuBeds.length, admissions.length, createdIcuBeds.length); i++) {
    if (icuBedDefs[i].status !== 'OCCUPIED') continue;
    const admission = admissions[i];
    if (!admission) continue;
    for (let h = 0; h < 3; h++) {
      const recordedAt = new Date(Date.now() - h * 4 * 60 * 60 * 1000);
      const existing = await prisma.icuMonitoring.findFirst({ where: { tenantId: tenant.id, admissionId: admission.id, recordedAt } });
      if (existing) continue;
      await prisma.icuMonitoring.create({
        data: {
          tenantId: tenant.id, locationId: location.id,
          admissionId: admission.id, patientId: admission.patientId,
          icuBedId: createdIcuBeds[i],
          recordedAt,
          systolicBp: 105 + randInt(0, 35), diastolicBp: 65 + randInt(0, 20),
          heartRate: 72 + randInt(0, 25), respiratoryRate: 16 + randInt(0, 6),
          spo2: parseFloat((95 + Math.random() * 5).toFixed(1)),
          temperatureC: parseFloat((36.6 + Math.random() * 1.2).toFixed(1)),
          gcs: 14 - (i % 3), urineOutputMl: 30 + randInt(0, 30),
          bloodSugarMg: parseFloat((110 + randInt(0, 80)).toFixed(1)),
          ventilatorMode: icuBedDefs[i].hasVentilator ? pick(['AC/VC', 'SIMV', 'PSV']) : null,
          fio2: icuBedDefs[i].hasVentilator ? parseFloat((0.4 + Math.random() * 0.3).toFixed(1)) : null,
          painScore: randInt(0, 4), sedationScore: randInt(0, 3),
          nursesNotes: 'Patient resting comfortably. Vitals stable.',
          recordedById: nurseId,
        },
      });
      icuMonCount++;
    }
  }
  console.log(`   ✔ ${icuMonCount} ICU monitoring records`);

  // ── 6. ICU ROUNDS ────────────────────────────────────────────────────────
  console.log('\n▶  Creating ICU rounds...');
  let icuRoundCount = 0;
  for (let i = 0; i < Math.min(occupiedIcuBeds.length, admissions.length); i++) {
    if (icuBedDefs[i].status !== 'OCCUPIED') continue;
    const admission = admissions[i];
    if (!admission) continue;
    const existing = await prisma.icuRound.findFirst({ where: { tenantId: tenant.id, admissionId: admission.id } });
    if (existing) continue;
    await prisma.icuRound.create({
      data: {
        tenantId: tenant.id, admissionId: admission.id,
        patientId: admission.patientId, icuBedId: createdIcuBeds[i],
        roundType: pick(['MORNING', 'AFTERNOON', 'EVENING']),
        currentStatus: pick(['STABLE', 'IMPROVING', 'CRITICAL']),
        assessment: 'Patient reviewed. Vitals within acceptable range. Continue current management.',
        plan: 'Continue IV antibiotics. Monitor urine output. Daily blood gas analysis.',
        ventilatorPlan: icuBedDefs[i].hasVentilator ? 'Continue current settings. Wean FiO2 to 0.40 if spo2 >96%.' : null,
        nutritionPlan: 'Ryle\'s tube feeds at 40ml/hr. Target 1500 kcal/day.',
        labsOrdered: 'CBC, RFT, LFT, ABG — morning samples',
        estimatedLos: 3 + i,
        roundedById: doctorUser.id,
        roundedAt: daysAgo(i),
      },
    });
    icuRoundCount++;
  }
  console.log(`   ✔ ${icuRoundCount} ICU rounds`);

  // ── 7. NICU ADMISSIONS ───────────────────────────────────────────────────
  console.log('\n▶  Creating NICU admissions...');
  const nicuPatients = patients.slice(18, 22);
  const nicuDefs = [
    { gw: 32, bw: 1850, diag: 'Respiratory Distress Syndrome', feed: 'FORMULA', vent: 'CPAP', status: 'ACTIVE' },
    { gw: 35, bw: 2200, diag: 'Neonatal jaundice — phototherapy', feed: 'BREAST', vent: 'NONE', status: 'ACTIVE' },
    { gw: 28, bw: 1100, diag: 'Extreme prematurity', feed: 'TPN', vent: 'MECHANICAL', status: 'ACTIVE' },
    { gw: 38, bw: 3000, diag: 'Birth asphyxia — HIE Grade 1', feed: 'BREAST', vent: 'NONE', status: 'DISCHARGED' },
  ];
  const nicuAdmissionIds: string[] = [];
  for (let i = 0; i < nicuDefs.length && i < nicuPatients.length; i++) {
    const nd = nicuDefs[i];
    const pt = nicuPatients[i];
    const existing = await prisma.nicuAdmission.findFirst({ where: { tenantId: tenant.id, patientId: pt.id } });
    if (existing) { nicuAdmissionIds.push(existing.id); continue; }
    const adm = await prisma.nicuAdmission.create({
      data: {
        tenantId: tenant.id, patientId: pt.id,
        admissionDate: daysAgo(5 - i),
        gestationalWeeks: nd.gw, birthWeightGrams: nd.bw,
        currentWeightGrams: nd.bw + randInt(-50, 100),
        apgar1min: 6 + i, apgar5min: 7 + i,
        diagnosis: nd.diag, feedType: nd.feed,
        feedVolumeMl: nd.feed === 'TPN' ? null : 12,
        phototherapy: nd.diag.includes('jaundice'),
        ventilatorSupport: nd.vent,
        icuBedId: createdIcuBeds[7] || null,
        status: nd.status,
        dischargeDate: nd.status === 'DISCHARGED' ? daysAgo(1) : null,
        dischargeWeight: nd.status === 'DISCHARGED' ? nd.bw + 150 : null,
        notes: `${nd.diag}. Continue current management and monitoring.`,
      },
    });
    nicuAdmissionIds.push(adm.id);
  }
  // NICU daily records
  let nicuDailyCount = 0;
  for (const nicuId of nicuAdmissionIds.slice(0, 2)) {
    for (let d = 0; d < 3; d++) {
      const existing = await prisma.nicuDailyRecord.findFirst({ where: { tenantId: tenant.id, nicuAdmissionId: nicuId, recordDate: daysAgo(d) } });
      if (existing) continue;
      await prisma.nicuDailyRecord.create({
        data: {
          tenantId: tenant.id, nicuAdmissionId: nicuId,
          recordDate: daysAgo(d), weightGrams: 1850 + d * 20,
          feedType: 'FORMULA', feedVolumeMl: 12 + d,
          feedFrequency: 'Q3H', urineOutput: 28 + d * 2,
          stoolCount: 2, bilirubinLevel: d === 0 ? 14.5 : 12.3 - d * 0.8,
          phototherapy: true, oxygenSupport: 'CPAP',
          temperature: 36.8, heartRate: 148, spo2: 96,
          apneaEpisodes: d > 1 ? 0 : 1,
          recordedById: nurseId,
        },
      });
      nicuDailyCount++;
    }
  }
  console.log(`   ✔ ${nicuAdmissionIds.length} NICU admissions, ${nicuDailyCount} daily records`);

  // ── 8. DISCHARGE SUMMARIES ────────────────────────────────────────────────
  console.log('\n▶  Creating discharge summaries...');
  const dischargedAdmissions = admissions.filter(a => a.status === 'DISCHARGED');
  let dsSCount = 0;
  for (const adm of dischargedAdmissions) {
    const existing = await prisma.dischargeSummary.findFirst({ where: { tenantId: tenant.id, admissionId: adm.id } });
    if (existing) continue;
    await prisma.dischargeSummary.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        admissionId: adm.id, patientId: adm.patientId,
        doctorId: doctorUser.id,
        admissionDate: adm.admissionDate,
        dischargeDate: adm.dischargeDate || daysAgo(1),
        diagnosisOnAdmission: adm.diagnosisOnAdmission,
        diagnosisOnDischarge: adm.diagnosisOnAdmission,
        proceduresPerformed: [{ name: 'IV fluid therapy', date: adm.admissionDate }],
        treatmentGiven: 'IV antibiotics, supportive care, monitoring',
        investigationSummary: 'CBC, RFT, LFT within normal limits at discharge',
        conditionAtDischarge: 'IMPROVED',
        dischargeMedications: [
          { drug: 'Paracetamol 500mg', dose: 'TID × 5 days' },
          { drug: 'Pantoprazole 40mg', dose: 'OD × 14 days' },
        ],
        followUpInstructions: 'Review with reports in 1 week. Avoid strenuous activity for 2 weeks.',
        followUpDate: daysFromNow(7),
        dietaryAdvice: 'Soft diet for 1 week. Adequate hydration.',
        activityRestrictions: 'Avoid heavy lifting. Light walking encouraged.',
        status: 'APPROVED',
        preparedById: nurseId,
        approvedById: doctorUser.id,
        approvedAt: adm.dischargeDate || daysAgo(1),
      },
    });
    dsSCount++;
  }
  console.log(`   ✔ ${dsSCount} discharge summaries`);

  // ── 9. DIALYSIS MACHINES + SESSIONS ──────────────────────────────────────
  console.log('\n▶  Creating dialysis machines and sessions...');
  const dialysisMachineDefs = [
    { num: 'DM-001', brand: 'Fresenius 5008S', model: '5008S', serial: 'FRS-2022-001', status: 'IN_USE' },
    { num: 'DM-002', brand: 'Fresenius 5008S', model: '5008S', serial: 'FRS-2022-002', status: 'AVAILABLE' },
    { num: 'DM-003', brand: 'Nipro SURDIAL', model: 'SURDIAL X', serial: 'NPR-2021-003', status: 'IN_USE' },
    { num: 'DM-004', brand: 'Nipro SURDIAL', model: 'SURDIAL X', serial: 'NPR-2021-004', status: 'MAINTENANCE' },
  ];
  const dialysisMachineIds: string[] = [];
  for (const dm of dialysisMachineDefs) {
    const existing = await prisma.dialysisMachine.findFirst({ where: { tenantId: tenant.id, locationId: location.id, machineNumber: dm.num } });
    if (existing) { dialysisMachineIds.push(existing.id); continue; }
    const machine = await prisma.dialysisMachine.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        machineNumber: dm.num, brand: dm.brand, model: dm.model,
        serialNumber: dm.serial, status: dm.status,
        lastServiceDate: daysAgo(30), nextServiceDate: daysFromNow(60),
      },
    });
    dialysisMachineIds.push(machine.id);
  }

  const dialysisSessionDefs = [
    { num: 'DS-001', type: 'HEMODIALYSIS', status: 'COMPLETED', daysBack: 2, access: 'AVF', pre: '70.5', post: '68.2', preBp: '160/100', postBp: '130/80' },
    { num: 'DS-002', type: 'HEMODIALYSIS', status: 'COMPLETED', daysBack: 1, access: 'AVF', pre: '71.0', post: '68.5', preBp: '155/95', postBp: '128/78' },
    { num: 'DS-003', type: 'HEMODIALYSIS', status: 'IN_PROGRESS', daysBack: 0, access: 'CVC', pre: '72.0', post: null, preBp: '162/102', postBp: null },
    { num: 'DS-004', type: 'PERITONEAL', status: 'SCHEDULED', daysForward: 1, access: 'PD_CATHETER', pre: null, post: null, preBp: null, postBp: null },
    { num: 'DS-005', type: 'HEMODIALYSIS', status: 'SCHEDULED', daysForward: 2, access: 'AVF', pre: null, post: null, preBp: null, postBp: null },
  ];
  let dsCount = 0;
  for (let i = 0; i < dialysisSessionDefs.length && i < patients.length; i++) {
    const ds = dialysisSessionDefs[i];
    const existing = await prisma.dialysisSession.findUnique({ where: { sessionNumber: ds.num } });
    if (existing) continue;
    const schedDate = (ds as any).daysForward ? daysFromNow((ds as any).daysForward) : daysAgo(ds.daysBack || 0);
    await prisma.dialysisSession.create({
      data: {
        tenantId: tenant.id, sessionNumber: ds.num, locationId: location.id,
        patientId: patients[i].id, doctorId: doctorUser.id,
        machineId: dialysisMachineIds[i % dialysisMachineIds.length],
        dialysisType: ds.type, scheduledDate: schedDate,
        scheduledTime: '09:00', durationMinutes: 240,
        accessType: ds.access, dialyzerType: 'HIGH_FLUX',
        bloodFlowRate: 280, dialysateFlowRate: 500,
        dryWeightKg: 68, preWeightKg: ds.pre ? parseFloat(ds.pre) : null,
        postWeightKg: ds.post ? parseFloat(ds.post) : null,
        ufGoalMl: 2000, ufAchievedMl: ds.status === 'COMPLETED' ? 1900 : null,
        preBp: ds.preBp, postBp: ds.postBp,
        heparinDose: '3000 units bolus + 1000 units/hr',
        startedAt: ds.status !== 'SCHEDULED' ? new Date(schedDate.getTime() + 9 * 60 * 60 * 1000) : null,
        endedAt: ds.status === 'COMPLETED' ? new Date(schedDate.getTime() + 13 * 60 * 60 * 1000) : null,
        status: ds.status, nurseId: nurseId,
        notes: ds.status === 'COMPLETED' ? 'Session completed uneventfully.' : null,
      },
    });
    dsCount++;
  }
  console.log(`   ✔ ${dialysisMachineIds.length} dialysis machines, ${dsCount} sessions`);

  // ── 10. PHYSIOTHERAPY ORDERS + SESSIONS ──────────────────────────────────
  console.log('\n▶  Creating physiotherapy orders and sessions...');
  const ptOrderDefs = [
    { num: 'PT-001', diag: 'Post-op knee replacement', plan: 'Strengthening and ROM exercises. Gait training.', freq: 'Daily', total: 14, completed: 5 },
    { num: 'PT-002', diag: 'Stroke rehabilitation — left hemiplegia', plan: 'Upper and lower limb mobility exercises. ADL training.', freq: 'BID', total: 30, completed: 12 },
    { num: 'PT-003', diag: 'Low back pain — disc herniation', plan: 'Core strengthening. McKenzie protocol.', freq: '5x/week', total: 20, completed: 3 },
    { num: 'PT-004', diag: 'Shoulder impingement syndrome', plan: 'Rotator cuff strengthening. Ultrasound therapy.', freq: '3x/week', total: 10, completed: 0 },
  ];
  const ptOrderIds: string[] = [];
  for (let i = 0; i < ptOrderDefs.length && i < patients.length; i++) {
    const ptd = ptOrderDefs[i];
    const existing = await prisma.physiotherapyOrder.findUnique({ where: { orderNumber: ptd.num } });
    if (existing) { ptOrderIds.push(existing.id); continue; }
    const order = await prisma.physiotherapyOrder.create({
      data: {
        tenantId: tenant.id, orderNumber: ptd.num, locationId: location.id,
        patientId: patients[i].id, doctorId: doctorUser.id,
        admissionId: admissions[i]?.id || null,
        diagnosis: ptd.diag, treatmentPlan: ptd.plan,
        frequency: ptd.freq, totalSessions: ptd.total,
        completedSessions: ptd.completed,
        therapistName: 'Karthik Selvam', therapistId: adminId,
        startDate: daysAgo(ptd.completed + 2),
        endDate: daysFromNow(ptd.total - ptd.completed),
        status: ptd.completed > 0 ? 'ACTIVE' : 'ACTIVE',
        goals: 'Full pain-free ROM. Return to independent ambulation.',
      },
    });
    ptOrderIds.push(order.id);
  }
  let ptSessionCount = 0;
  for (let i = 0; i < ptOrderIds.length; i++) {
    const order = ptOrderDefs[i];
    for (let s = 0; s < order.completed && s < 3; s++) {
      const sessionDate = daysAgo(order.completed - s);
      const existing = await prisma.physiotherapySession.findFirst({ where: { tenantId: tenant.id, orderId: ptOrderIds[i], sessionNumber: s + 1 } });
      if (existing) continue;
      await prisma.physiotherapySession.create({
        data: {
          tenantId: tenant.id, orderId: ptOrderIds[i],
          sessionNumber: s + 1, sessionDate,
          treatmentGiven: 'Therapeutic exercise, hot pack, TENS',
          painBefore: 6 - s, painAfter: 4 - s,
          romBefore: `Flexion: ${80 + s * 5}°`, romAfter: `Flexion: ${90 + s * 5}°`,
          patientResponse: pick(['GOOD', 'FAIR', 'EXCELLENT']),
          homeExercises: 'Quad sets 3×10, SLR 3×10 — twice daily',
          therapistId: adminId,
          notes: `Session ${s + 1} completed. Patient tolerating well.`,
        },
      });
      ptSessionCount++;
    }
  }
  console.log(`   ✔ ${ptOrderIds.length} PT orders, ${ptSessionCount} sessions`);

  // ── 11. BLOOD BANK ────────────────────────────────────────────────────────
  console.log('\n▶  Creating blood bank data...');
  const bloodGroups = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-'];
  const donors: string[] = [];
  for (let i = 0; i < 6; i++) {
    const donorId = `DON-${String(i + 1).padStart(5, '0')}`;
    const existing = await prisma.bloodDonor.findUnique({ where: { donorId } });
    if (existing) { donors.push(existing.id); continue; }
    const bg = bloodGroups[i];
    const d = await prisma.bloodDonor.create({
      data: {
        tenantId: tenant.id, locationId: location.id, donorId,
        firstName: pick(['Ravi', 'Suresh', 'Priya', 'Anand', 'Deepa', 'Mohan']),
        lastName: pick(['Kumar', 'Sharma', 'Nair', 'Iyer', 'Pillai', 'Rao']),
        dateOfBirth: new Date(1970 + i * 5, i, 15),
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        bloodGroup: bg.replace('+', '').replace('-', ''), rhFactor: bg.includes('+') ? 'POSITIVE' : 'NEGATIVE',
        phone: `9${randInt(100000000, 999999999)}`,
        lastDonationDate: daysAgo(90 + i * 10), totalDonations: 2 + i,
        isEligible: i < 4,
        deferralReason: i >= 4 ? 'Recent illness — defer 6 months' : null,
      },
    });
    donors.push(d.id);
  }

  const donationBags: string[] = [];
  for (let i = 0; i < donors.length && i < 4; i++) {
    const donNum = `DON-REC-${String(i + 1).padStart(6, '0')}`;
    const existing = await prisma.bloodDonation.findUnique({ where: { donationNumber: donNum } });
    if (existing) { donationBags.push(`BAG-${String(i + 1).padStart(5, '0')}`); continue; }
    const bagNum = `BAG-${String(i + 1).padStart(5, '0')}`;
    const bg = bloodGroups[i];
    await prisma.bloodDonation.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        donorId: donors[i], donationNumber: donNum,
        donationType: 'VOLUNTARY', bagNumber: bagNum,
        collectionDate: daysAgo(10 - i),
        volumeMl: 450, bloodGroup: bg.replace('+', '').replace('-', ''),
        rhFactor: bg.includes('+') ? 'POSITIVE' : 'NEGATIVE',
        hemoglobinGdl: 13.5 + i * 0.2,
        screeningResult: 'CLEARED', hivStatus: 'NEGATIVE',
        hbsAgStatus: 'NEGATIVE', hcvStatus: 'NEGATIVE', vdrlStatus: 'NEGATIVE', malariaStatus: 'NEGATIVE',
        componentsSeparated: i < 2,
        expiryDate: daysFromNow(35 - i * 5), status: 'CLEARED',
        collectedById: nurseId,
      },
    });
    donationBags.push(bagNum);
  }

  const components = ['WHOLE_BLOOD', 'PACKED_RBC', 'FRESH_FROZEN_PLASMA', 'PLATELETS'];
  for (let i = 0; i < 8; i++) {
    const bagNum = `INV-BAG-${String(i + 1).padStart(5, '0')}`;
    const bg = bloodGroups[i % bloodGroups.length];
    const status = i < 2 ? 'ISSUED' : i < 5 ? 'AVAILABLE' : 'EXPIRED';
    const existing = await prisma.bloodInventory.findFirst({ where: { tenantId: tenant.id, bagNumber: bagNum } });
    if (existing) continue;
    await prisma.bloodInventory.create({
      data: {
        tenantId: tenant.id, locationId: location.id, bagNumber: bagNum,
        component: components[i % components.length],
        bloodGroup: bg.replace('+', '').replace('-', ''),
        rhFactor: bg.includes('+') ? 'POSITIVE' : 'NEGATIVE',
        volumeMl: 350 + (i % 3) * 50,
        collectionDate: daysAgo(20 - i),
        expiryDate: status === 'EXPIRED' ? daysAgo(5) : daysFromNow(25 - i * 3),
        storageTemp: '2-6°C', status,
        issuedAt: status === 'ISSUED' ? daysAgo(1) : null,
        issuedById: status === 'ISSUED' ? doctorUser.id : null,
        crossMatchResult: status === 'ISSUED' ? 'COMPATIBLE' : null,
      },
    });
  }

  let transfusionCount = 0;
  for (let i = 0; i < 3 && i < patients.length; i++) {
    const existing = await prisma.bloodTransfusion.findFirst({ where: { tenantId: tenant.id, patientId: patients[i].id } });
    if (existing) continue;
    const bg = bloodGroups[i];
    const status = i < 2 ? 'COMPLETED' : 'IN_PROGRESS';
    await prisma.bloodTransfusion.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        patientId: patients[i].id, admissionId: admissions[i]?.id || null,
        bagNumber: donationBags[i] || `BAG-CROSS-${i + 1}`,
        component: components[i], bloodGroup: bg.replace('+', '').replace('-', ''),
        rhFactor: bg.includes('+') ? 'POSITIVE' : 'NEGATIVE',
        volumeMl: 350, crossMatchVerified: true,
        crossMatchById: nurseId, orderedById: doctorUser.id,
        startTime: daysAgo(i),
        endTime: status === 'COMPLETED' ? new Date(daysAgo(i).getTime() + 2.5 * 60 * 60 * 1000) : null,
        status, administeredById: nurseId,
        notes: 'Transfusion given as per protocol. No adverse reaction.',
      },
    });
    transfusionCount++;
  }
  console.log(`   ✔ ${donors.length} donors, ${donationBags.length} donations, 8 blood inventory, ${transfusionCount} transfusions`);

  // ── 12. RADIOLOGY ORDERS + RESULTS ───────────────────────────────────────
  console.log('\n▶  Creating radiology orders and results...');
  const radiologyDefs = [
    { num: 'RAD-001', modality: 'X-RAY', exam: 'Chest PA View', part: 'CHEST', status: 'REPORTED', finding: 'Bilateral lower zone infiltrates consistent with pneumonia. No pneumothorax.' },
    { num: 'RAD-002', modality: 'CT', exam: 'CT Brain — Plain', part: 'BRAIN', status: 'REPORTED', finding: 'No intracranial bleed. Mild cerebral atrophy noted.' },
    { num: 'RAD-003', modality: 'USG', exam: 'USG Abdomen + Pelvis', part: 'ABDOMEN', status: 'REPORTED', finding: 'Grade 1 fatty liver. Gallbladder — multiple small calculi. No free fluid.' },
    { num: 'RAD-004', modality: 'MRI', exam: 'MRI Lumbar Spine', part: 'SPINE', status: 'PENDING', finding: null },
    { num: 'RAD-005', modality: 'X-RAY', exam: 'X-Ray Right Knee', part: 'RIGHT_KNEE', status: 'ORDERED', finding: null },
    { num: 'RAD-006', modality: 'ECHO', exam: '2D Echo + Doppler', part: 'HEART', status: 'REPORTED', finding: 'Mild LVH. EF 55%. No RWMA. Mild MR.', isCritical: false },
  ];
  let radCount = 0;
  for (let i = 0; i < radiologyDefs.length && i < patients.length; i++) {
    const rd = radiologyDefs[i];
    const existing = await prisma.radiologyOrder.findUnique({ where: { orderNumber: rd.num } });
    if (existing) continue;
    const order = await prisma.radiologyOrder.create({
      data: {
        tenantId: tenant.id, orderNumber: rd.num, locationId: location.id,
        patientId: patients[i].id, doctorId: doctorUser.id,
        admissionId: admissions[i]?.id || null,
        modality: rd.modality, examType: rd.exam, bodyPart: rd.part,
        priority: i < 2 ? 'URGENT' : 'ROUTINE',
        clinicalHistory: 'Relevant clinical history provided.',
        contrast: rd.modality === 'CT',
        scheduledAt: daysAgo(3 - i),
        performedAt: rd.status !== 'ORDERED' ? daysAgo(3 - i) : null,
        performedById: rd.status !== 'ORDERED' ? adminId : null,
        status: rd.status, createdAt: daysAgo(4 - i),
      },
    });
    if (rd.finding) {
      await prisma.radiologyResult.create({
        data: {
          tenantId: tenant.id, orderId: order.id, locationId: location.id,
          findings: rd.finding,
          impression: `${rd.exam} — ${rd.status === 'REPORTED' ? 'as described above' : 'pending'}`,
          recommendation: 'Correlate clinically. Follow up as needed.',
          isCritical: false, status: 'VALIDATED',
          reportedById: adminId, reportedAt: daysAgo(2 - i),
          validatedById: doctorUser.id, validatedAt: daysAgo(2 - i),
        },
      });
    }
    radCount++;
  }
  console.log(`   ✔ ${radCount} radiology orders`);

  // ── 13. INSURANCE POLICIES + CLAIMS ──────────────────────────────────────
  console.log('\n▶  Creating insurance policies and claims...');
  const insuranceDefs = [
    { provider: 'Star Health Insurance', policy: 'SHI-FAM-001', plan: 'FAMILY_FLOATER', coverage: 500000 },
    { provider: 'HDFC ERGO Health', policy: 'HEG-IND-002', plan: 'INDIVIDUAL', coverage: 300000 },
    { provider: 'United India Insurance', policy: 'UII-GRP-003', plan: 'GROUP', coverage: 200000 },
    { provider: 'Bajaj Allianz', policy: 'BAJ-FAM-004', plan: 'FAMILY_FLOATER', coverage: 1000000 },
  ];
  const policyIds: string[] = [];
  for (let i = 0; i < insuranceDefs.length && i < patients.length; i++) {
    const ins = insuranceDefs[i];
    const existing = await prisma.insurancePolicy.findFirst({ where: { tenantId: tenant.id, patientId: patients[i].id, policyNumber: ins.policy } });
    if (existing) { policyIds.push(existing.id); continue; }
    const policy = await prisma.insurancePolicy.create({
      data: {
        tenantId: tenant.id, patientId: patients[i].id,
        providerName: ins.provider, policyNumber: ins.policy,
        tpaName: 'Paramount Health Services', planType: ins.plan,
        coverageAmount: ins.coverage, usedAmount: i * 25000,
        copayPercent: 10, deductible: 5000,
        startDate: daysAgo(180), endDate: daysFromNow(185),
        primaryInsured: `${patients[i].firstName} ${patients[i].lastName}`,
        relationship: 'SELF', isActive: true,
        verifiedAt: daysAgo(10), verifiedById: adminId,
      },
    });
    policyIds.push(policy.id);
  }
  let claimCount = 0;
  for (let i = 0; i < Math.min(policyIds.length, 3); i++) {
    const claimNum = `CLM-2025-${String(i + 1).padStart(6, '0')}`;
    const existing = await prisma.insuranceClaim.findUnique({ where: { claimNumber: claimNum } });
    if (existing) continue;
    const statuses = ['APPROVED', 'SUBMITTED', 'DRAFT'];
    const amounts = [45000, 28000, 65000];
    await prisma.insuranceClaim.create({
      data: {
        tenantId: tenant.id, claimNumber: claimNum,
        policyId: policyIds[i], patientId: patients[i].id,
        admissionId: admissions[i]?.id || null,
        claimType: 'CASHLESS', preAuthCode: `PA-${String(i + 1).padStart(6, '0')}`,
        preAuthAmount: amounts[i] * 0.8, preAuthStatus: 'APPROVED',
        preAuthDate: daysAgo(8 - i),
        claimAmount: amounts[i], approvedAmount: i === 0 ? amounts[i] * 0.9 : null,
        settledAmount: i === 0 ? amounts[i] * 0.9 : null,
        submittedAt: i < 2 ? daysAgo(5 - i) : null,
        approvedAt: i === 0 ? daysAgo(2) : null,
        settledAt: i === 0 ? daysAgo(1) : null,
        status: statuses[i], processedById: adminId,
        notes: 'Claim processed per policy terms.',
      },
    });
    claimCount++;
  }
  console.log(`   ✔ ${policyIds.length} insurance policies, ${claimCount} claims`);

  // ── 14. WOUND ASSESSMENTS ─────────────────────────────────────────────────
  console.log('\n▶  Creating wound assessments...');
  const woundDefs = [
    { type: 'SURGICAL', loc: 'Right knee — anterior', stage: null, bed: 'GRANULATION', exudate: 'SEROUS' },
    { type: 'DIABETIC_ULCER', loc: 'Right plantar foot', stage: 'II', bed: 'SLOUGH', exudate: 'PURULENT' },
    { type: 'PRESSURE_ULCER', loc: 'Sacral region', stage: 'III', bed: 'NECROTIC', exudate: 'SANGUINOUS' },
    { type: 'VENOUS', loc: 'Left medial malleolus', stage: null, bed: 'GRANULATION', exudate: 'SEROUS' },
  ];
  let woundCount = 0;
  for (let i = 0; i < woundDefs.length && i < patients.length; i++) {
    const wd = woundDefs[i];
    const existing = await prisma.woundAssessment.findFirst({ where: { tenantId: tenant.id, patientId: patients[i].id, woundType: wd.type } });
    if (existing) continue;
    await prisma.woundAssessment.create({
      data: {
        tenantId: tenant.id, patientId: patients[i].id,
        admissionId: admissions[i]?.id || null,
        woundType: wd.type, location: wd.loc, stage: wd.stage,
        lengthCm: parseFloat((2 + Math.random() * 3).toFixed(1)),
        widthCm: parseFloat((1.5 + Math.random() * 2).toFixed(1)),
        depthCm: parseFloat((0.3 + Math.random() * 1.2).toFixed(1)),
        woundBed: wd.bed, exudate: wd.exudate,
        periwoundSkin: 'Maceration around wound edges',
        treatment: 'Wound cleaned with NS. Hydrocolloid dressing applied.',
        dressingType: pick(['HYDROCOLLOID', 'FOAM', 'ALGINATE', 'SIMPLE_GAUZE']),
        painScore: 4 + i,
        assessedById: nurseId, assessedAt: daysAgo(i),
        nextAssessment: daysFromNow(2),
        notes: 'Wound shows signs of healing. Continue current dressing protocol.',
      },
    });
    woundCount++;
  }
  console.log(`   ✔ ${woundCount} wound assessments`);

  // ── 15. ANTIBIOTIC USAGE ─────────────────────────────────────────────────
  console.log('\n▶  Creating antibiotic usage records...');
  const abxDefs = [
    { drug: 'Meropenem 1g', dose: '1g', route: 'IV', freq: 'Q8H', indication: 'Hospital-acquired pneumonia', restricted: true, days: 7 },
    { drug: 'Vancomycin 1g', dose: '1g', route: 'IV', freq: 'Q12H', indication: 'MRSA bacteremia', restricted: true, days: 14 },
    { drug: 'Piperacillin-Tazobactam 4.5g', dose: '4.5g', route: 'IV', freq: 'Q6H', indication: 'Intra-abdominal infection', restricted: false, days: 5 },
    { drug: 'Colistin 2MU', dose: '2MU', route: 'IV', freq: 'Q12H', indication: 'MDR Pseudomonas pneumonia', restricted: true, days: 10 },
    { drug: 'Fluconazole 400mg', dose: '400mg', route: 'IV', freq: 'OD', indication: 'Candidemia', restricted: false, days: 14 },
  ];
  let abxCount = 0;
  for (let i = 0; i < abxDefs.length && i < patients.length; i++) {
    const ab = abxDefs[i];
    const existing = await prisma.antibioticUsage.findFirst({ where: { tenantId: tenant.id, patientId: patients[i].id, drugName: ab.drug } });
    if (existing) continue;
    await prisma.antibioticUsage.create({
      data: {
        tenantId: tenant.id, patientId: patients[i].id,
        admissionId: admissions[i]?.id || null,
        drugName: ab.drug, dose: ab.dose, route: ab.route, frequency: ab.freq,
        indication: ab.indication,
        cultureOrdered: true,
        cultureSensitivity: 'Sensitive to drug per antibiogram.',
        isRestricted: ab.restricted,
        approvedById: ab.restricted ? doctorUser.id : null,
        startDate: daysAgo(ab.days),
        endDate: i < 2 ? null : daysAgo(ab.days - 5),
        durationDays: i < 2 ? null : 5,
        deEscalated: i >= 2,
        status: i < 2 ? 'ACTIVE' : 'COMPLETED',
        notes: ab.restricted ? 'Restricted antibiotic — approved by ID consultant.' : null,
      },
    });
    abxCount++;
  }
  console.log(`   ✔ ${abxCount} antibiotic usage records`);

  // ── 16. CARE PROTOCOLS + PATIENT PATHWAYS ────────────────────────────────
  console.log('\n▶  Creating care protocols and pathways...');
  const protocolDefs = [
    { name: 'CAP Management Protocol', diag: 'Community-acquired pneumonia', icd: 'J18.9', dept: 'MEDICINE', days: 7 },
    { name: 'Hip Replacement Rehabilitation', diag: 'Total hip arthroplasty', icd: 'Z96.64', dept: 'ORTHOPAEDICS', days: 14 },
    { name: 'Diabetic Ketoacidosis Protocol', diag: 'Diabetic ketoacidosis', icd: 'E14.1', dept: 'MEDICINE', days: 3 },
  ];
  const protocolIds: string[] = [];
  for (const pd of protocolDefs) {
    const existing = await prisma.careProtocol.findFirst({ where: { tenantId: tenant.id, name: pd.name } });
    if (existing) { protocolIds.push(existing.id); continue; }
    const protocol = await prisma.careProtocol.create({
      data: {
        tenantId: tenant.id, name: pd.name, diagnosis: pd.diag,
        icdCode: pd.icd, department: pd.dept, durationDays: pd.days,
        steps: Array.from({ length: pd.days }, (_, i) => ({
          day: i + 1,
          activities: ['Vitals Q4H', 'Nursing assessment'],
          medications: ['As per chart'],
          labs: i === 0 ? ['CBC', 'CRP', 'Cultures'] : i === pd.days - 1 ? ['Discharge bloods'] : [],
          assessments: ['Daily review'],
        })),
        isActive: true, createdById: doctorUser.id,
      },
    });
    protocolIds.push(protocol.id);
  }
  let pathwayCount = 0;
  for (let i = 0; i < Math.min(protocolIds.length, patients.length, admissions.length); i++) {
    const existing = await prisma.patientPathway.findFirst({ where: { tenantId: tenant.id, patientId: patients[i].id, protocolId: protocolIds[i] } });
    if (existing) continue;
    await prisma.patientPathway.create({
      data: {
        tenantId: tenant.id, protocolId: protocolIds[i],
        patientId: patients[i].id, admissionId: admissions[i]?.id,
        startDate: daysAgo(3), currentDay: 3 + i,
        status: 'ACTIVE',
        completedSteps: [{ day: 1, step: 'Admission assessment', completedAt: daysAgo(3) }],
        notes: 'Patient progressing as per protocol.',
      },
    });
    pathwayCount++;
  }
  console.log(`   ✔ ${protocolIds.length} protocols, ${pathwayCount} patient pathways`);

  // ── 17. DIET ORDERS + MEALS ───────────────────────────────────────────────
  console.log('\n▶  Creating diet orders and meals...');
  const dietDefs = [
    { type: 'DIABETIC_DIET', cal: 1800, protein: 70, restr: ['LOW_SUGAR', 'LOW_FAT'] },
    { type: 'LOW_SODIUM', cal: 2000, protein: 80, restr: ['LOW_SODIUM'] },
    { type: 'CLEAR_LIQUIDS', cal: 500, protein: 20, restr: ['NO_SOLIDS'] },
    { type: 'SOFT_DIET', cal: 1600, protein: 65, restr: ['NO_HARD_FOODS'] },
    { type: 'NPO', cal: 0, protein: 0, restr: [] },
  ];
  let dietCount = 0;
  const dietOrderIds: string[] = [];
  for (let i = 0; i < dietDefs.length && i < admissions.length; i++) {
    const dd = dietDefs[i];
    const adm = admissions[i];
    const existing = await prisma.dietOrder.findFirst({ where: { tenantId: tenant.id, admissionId: adm.id } });
    if (existing) { dietOrderIds.push(existing.id); continue; }
    const order = await prisma.dietOrder.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        patientId: adm.patientId, admissionId: adm.id,
        wardId: adm.wardId || null, bedId: adm.bedId || null,
        doctorId: doctorUser.id, dietType: dd.type,
        caloricTarget: dd.cal, proteinTarget: dd.protein,
        restrictions: dd.restr, allergies: [],
        npoStatus: dd.type === 'NPO', npoReason: dd.type === 'NPO' ? 'Scheduled for procedure' : null,
        startDate: daysAgo(3), status: 'ACTIVE',
      },
    });
    dietOrderIds.push(order.id);
    dietCount++;
  }
  let mealCount = 0;
  const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
  for (let i = 0; i < Math.min(dietOrderIds.length, 3); i++) {
    for (let d = 0; d < 2; d++) {
      for (const mealType of mealTypes.slice(0, 3)) {
        const mealDate = daysAgo(d);
        mealDate.setHours(0, 0, 0, 0);
        const existing = await prisma.dietMeal.findFirst({ where: { tenantId: tenant.id, orderId: dietOrderIds[i], mealType, mealDate } });
        if (existing) continue;
        const served = d > 0;
        await prisma.dietMeal.create({
          data: {
            tenantId: tenant.id, orderId: dietOrderIds[i], mealType, mealDate,
            items: [
              { item: mealType === 'BREAKFAST' ? 'Idli (2) + Sambar' : mealType === 'LUNCH' ? 'Rice + Dal + Veg curry' : 'Chapathi (2) + Sabzi', quantity: 1 },
              { item: 'Curd', quantity: 1 },
            ],
            servedAt: served ? new Date(mealDate.getTime() + (mealType === 'BREAKFAST' ? 8 : mealType === 'LUNCH' ? 13 : 19) * 60 * 60 * 1000) : null,
            servedById: served ? nurseId : null,
            consumedPercent: served ? pick([100, 75, 50, 100]) : null,
            status: served ? 'SERVED' : 'PLANNED',
          },
        });
        mealCount++;
      }
    }
  }
  console.log(`   ✔ ${dietCount} diet orders, ${mealCount} meals`);

  // ── 18. AMBULANCES + TRIPS ────────────────────────────────────────────────
  console.log('\n▶  Creating ambulances and trips...');
  const ambulanceDefs = [
    { vnum: 'TN-01-AB-1234', type: 'BASIC_LIFE_SUPPORT', level: 'BLS', driver: 'Selvam K', driverPhone: '9876543210', status: 'AVAILABLE' },
    { vnum: 'TN-01-AB-5678', type: 'ADVANCED_LIFE_SUPPORT', level: 'ALS', driver: 'Murugan R', driverPhone: '9876543211', status: 'ON_TRIP' },
    { vnum: 'TN-01-CD-9012', type: 'BASIC_LIFE_SUPPORT', level: 'BLS', driver: 'Ganesh P', driverPhone: '9876543212', status: 'MAINTENANCE' },
  ];
  const ambulanceIds: string[] = [];
  for (const ad of ambulanceDefs) {
    const existing = await prisma.ambulance.findFirst({ where: { tenantId: tenant.id, vehicleNumber: ad.vnum } });
    if (existing) { ambulanceIds.push(existing.id); continue; }
    const amb = await prisma.ambulance.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        vehicleNumber: ad.vnum, vehicleType: ad.type,
        equipmentLevel: ad.level, driverName: ad.driver, driverPhone: ad.driverPhone,
        paramedicName: 'Karthik S', paramedicPhone: '9876543213',
        insuranceExpiry: daysFromNow(180), fitnessExpiry: daysFromNow(270),
        status: ad.status, isActive: true,
      },
    });
    ambulanceIds.push(amb.id);
  }

  const tripDefs = [
    { num: 'TRIP-001', type: 'EMERGENCY_PICKUP', pickup: '42, Anna Nagar West, Chennai', drop: 'Ayphen General Hospital', status: 'COMPLETED', daysBack: 3 },
    { num: 'TRIP-002', type: 'INTER_FACILITY', pickup: 'Ayphen General Hospital', drop: 'SRMC Chennai', status: 'COMPLETED', daysBack: 2 },
    { num: 'TRIP-003', type: 'PATIENT_TRANSFER', pickup: '15, T Nagar', drop: 'Ayphen General Hospital', status: 'IN_PROGRESS', daysBack: 0 },
    { num: 'TRIP-004', type: 'EMERGENCY_PICKUP', pickup: '78, Velachery', drop: 'Ayphen General Hospital', status: 'DISPATCHED', daysBack: 0 },
  ];
  let tripCount = 0;
  for (let i = 0; i < tripDefs.length && i < patients.length && i < ambulanceIds.length; i++) {
    const td = tripDefs[i];
    const existing = await prisma.ambulanceTrip.findUnique({ where: { tripNumber: td.num } });
    if (existing) continue;
    const dispatch = daysAgo(td.daysBack);
    await prisma.ambulanceTrip.create({
      data: {
        tenantId: tenant.id, tripNumber: td.num,
        ambulanceId: ambulanceIds[Math.min(i, ambulanceIds.length - 1)],
        patientId: patients[i + 3].id,
        patientName: `${patients[i + 3].firstName} ${patients[i + 3].lastName}`,
        patientPhone: patients[i + 3].mobile,
        tripType: td.type, pickupAddress: td.pickup, dropAddress: td.drop,
        dispatchTime: dispatch,
        arrivalTime: td.status !== 'DISPATCHED' ? new Date(dispatch.getTime() + 12 * 60 * 1000) : null,
        departureTime: td.status !== 'DISPATCHED' ? new Date(dispatch.getTime() + 18 * 60 * 1000) : null,
        completedTime: td.status === 'COMPLETED' ? new Date(dispatch.getTime() + 45 * 60 * 1000) : null,
        distanceKm: parseFloat((5 + Math.random() * 15).toFixed(1)),
        condition: 'CRITICAL', treatmentGiven: 'IV access established. O2 support given.',
        status: td.status, dispatchedById: adminId,
      },
    });
    tripCount++;
  }
  console.log(`   ✔ ${ambulanceIds.length} ambulances, ${tripCount} trips`);

  // ── 19. ASSETS + MAINTENANCE ─────────────────────────────────────────────
  console.log('\n▶  Creating assets...');
  const assetDefs = [
    { code: 'AST-001', name: 'Siemens Somatom CT Scanner', cat: 'IMAGING', brand: 'Siemens', serial: 'SIE-CT-2021-001', condition: 'GOOD', status: 'ACTIVE', cost: 8500000 },
    { code: 'AST-002', name: 'GE Logiq E10 Ultrasound', cat: 'IMAGING', brand: 'GE Healthcare', serial: 'GE-USG-2020-002', condition: 'GOOD', status: 'ACTIVE', cost: 2500000 },
    { code: 'AST-003', name: 'Draeger Evita V500 Ventilator', cat: 'CRITICAL_CARE', brand: 'Draeger', serial: 'DRG-VENT-2022-001', condition: 'GOOD', status: 'ACTIVE', cost: 1800000 },
    { code: 'AST-004', name: 'Philips IntelliVue MX800 Monitor', cat: 'MONITORING', brand: 'Philips', serial: 'PHI-MON-2022-002', condition: 'FAIR', status: 'ACTIVE', cost: 450000 },
    { code: 'AST-005', name: 'Fresenius 5008S Dialysis Machine', cat: 'DIALYSIS', brand: 'Fresenius', serial: 'FRS-2022-001', condition: 'GOOD', status: 'ACTIVE', cost: 750000 },
    { code: 'AST-006', name: 'Laparoscopy Tower — Karl Storz', cat: 'SURGICAL', brand: 'Karl Storz', serial: 'KS-LAP-2019-001', condition: 'FAIR', status: 'MAINTENANCE', cost: 3200000 },
    { code: 'AST-007', name: 'Autoclave — Tuttnauer 3870E', cat: 'STERILIZATION', brand: 'Tuttnauer', serial: 'TUT-2020-003', condition: 'GOOD', status: 'ACTIVE', cost: 180000 },
    { code: 'AST-008', name: 'ECG Machine — 12-lead Schiller', cat: 'DIAGNOSTIC', brand: 'Schiller', serial: 'SCH-ECG-2021-004', condition: 'GOOD', status: 'ACTIVE', cost: 75000 },
  ];
  const assetIds: string[] = [];
  for (const ad of assetDefs) {
    const existing = await prisma.asset.findFirst({ where: { tenantId: tenant.id, assetCode: ad.code } });
    if (existing) { assetIds.push(existing.id); continue; }
    const asset = await prisma.asset.create({
      data: {
        tenantId: tenant.id, locationId: location.id, assetCode: ad.code,
        name: ad.name, category: ad.cat, brand: ad.brand,
        serialNumber: ad.serial,
        purchaseDate: daysAgo(365 + Math.floor(Math.random() * 365)),
        purchaseCost: ad.cost,
        warrantyExpiry: daysFromNow(365),
        condition: ad.condition, status: ad.status,
        lastMaintenanceDate: daysAgo(30),
        nextMaintenanceDate: daysFromNow(60),
        assignedToName: 'Biomedical Department',
        notes: `${ad.name} — maintained by biomedical team.`,
      },
    });
    assetIds.push(asset.id);
  }
  let maintCount = 0;
  for (let i = 0; i < Math.min(assetIds.length, 4); i++) {
    const existing = await prisma.assetMaintenance.findFirst({ where: { tenantId: tenant.id, assetId: assetIds[i] } });
    if (existing) continue;
    await prisma.assetMaintenance.create({
      data: {
        tenantId: tenant.id, assetId: assetIds[i],
        maintenanceType: pick(['PREVENTIVE', 'CORRECTIVE', 'CALIBRATION']),
        description: 'Routine preventive maintenance — cleaning, calibration, and functional check.',
        performedByName: 'BioMed Services Ltd', vendor: 'BioMed Services Ltd',
        cost: pick([5000, 8000, 12000, 3500]),
        scheduledDate: daysAgo(30), completedDate: daysAgo(28),
        nextDueDate: daysFromNow(60), status: 'COMPLETED',
        notes: 'Equipment functioning within specifications.',
        performedById: adminId,
      },
    });
    maintCount++;
  }
  console.log(`   ✔ ${assetIds.length} assets, ${maintCount} maintenance logs`);

  // ── 20. GRIEVANCES ────────────────────────────────────────────────────────
  console.log('\n▶  Creating grievances...');
  const grievanceDefs = [
    { num: 'GRV-001', type: 'PATIENT', cat: 'STAFF_BEHAVIOUR', sev: 'HIGH', subj: 'Rude behaviour by ward staff', status: 'RESOLVED', daysBack: 7 },
    { num: 'GRV-002', type: 'VISITOR', cat: 'FACILITY', sev: 'MEDIUM', subj: 'Unclean washrooms on ward floor', status: 'IN_PROGRESS', daysBack: 3 },
    { num: 'GRV-003', type: 'PATIENT', cat: 'BILLING', sev: 'HIGH', subj: 'Billing discrepancy — overcharged for medicines', status: 'OPEN', daysBack: 1 },
    { num: 'GRV-004', type: 'PATIENT', cat: 'WAIT_TIME', sev: 'MEDIUM', subj: 'Excessive waiting time in OPD', status: 'OPEN', daysBack: 0 },
    { num: 'GRV-005', type: 'VISITOR', cat: 'FOOD', sev: 'LOW', subj: 'Food quality not satisfactory for patient', status: 'RESOLVED', daysBack: 5 },
  ];
  let grvCount = 0;
  for (let i = 0; i < grievanceDefs.length && i < patients.length; i++) {
    const gd = grievanceDefs[i];
    const existing = await prisma.grievance.findUnique({ where: { ticketNumber: gd.num } });
    if (existing) continue;
    const createdAt = daysAgo(gd.daysBack);
    await prisma.grievance.create({
      data: {
        tenantId: tenant.id, ticketNumber: gd.num, locationId: location.id,
        complainantType: gd.type, complainantName: `${patients[i].firstName} ${patients[i].lastName}`,
        complainantPhone: patients[i].mobile,
        patientId: patients[i].id,
        category: gd.cat, severity: gd.sev, subject: gd.subj,
        description: `Complaint regarding ${gd.subj.toLowerCase()}. Reported by patient/visitor on ${createdAt.toLocaleDateString()}.`,
        assignedToName: 'Quality Officer', assignedToId: adminId,
        resolution: gd.status === 'RESOLVED' ? 'Issue investigated and resolved. Patient apology offered. Staff counselled.' : null,
        resolvedAt: gd.status === 'RESOLVED' ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
        resolvedById: gd.status === 'RESOLVED' ? adminId : null,
        satisfactionScore: gd.status === 'RESOLVED' ? pick([4, 5]) : null,
        status: gd.status, createdAt,
      },
    });
    grvCount++;
  }
  console.log(`   ✔ ${grvCount} grievances`);

  // ── 21. INFECTION CONTROL ─────────────────────────────────────────────────
  console.log('\n▶  Creating infection control records...');
  const icDefs = [
    { type: 'HAI_REPORT', organism: 'Klebsiella pneumoniae', site: 'URINARY_TRACT', infType: 'CAUTI', isHai: true, status: 'ACTIVE' },
    { type: 'ISOLATION', organism: 'MRSA', site: 'WOUND', infType: 'SSI', isHai: true, status: 'ACTIVE' },
    { type: 'OUTBREAK', organism: 'C. difficile', site: 'GI_TRACT', infType: 'CDI', isHai: true, status: 'RESOLVED' },
    { type: 'SURVEILLANCE', organism: 'E. coli', site: 'BLOOD', infType: 'CLABSI', isHai: true, status: 'ACTIVE' },
  ];
  const icWard = await prisma.ward.findFirst({ where: { tenantId: tenant.id } });
  let icCount = 0;
  for (let i = 0; i < icDefs.length && i < patients.length; i++) {
    const ic = icDefs[i];
    const existing = await prisma.infectionControlRecord.findFirst({ where: { tenantId: tenant.id, patientId: patients[i].id, recordType: ic.type } });
    if (existing) continue;
    await prisma.infectionControlRecord.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        recordType: ic.type, patientId: patients[i].id,
        admissionId: admissions[i]?.id || null,
        wardId: icWard?.id,
        organism: ic.organism, infectionSite: ic.site, infectionType: ic.infType,
        isolationType: ic.organism === 'MRSA' ? 'CONTACT' : 'STANDARD',
        onsetDate: daysAgo(5 - i), cultureDate: daysAgo(4 - i),
        antibioticSensitivity: { resistant: ['Ampicillin', 'Cephalosporins'], sensitive: ['Meropenem', 'Colistin'] },
        isHai: ic.isHai,
        reportedByName: chargeNurse ? `${chargeNurse.firstName} ${chargeNurse.lastName || ''}`.trim() : 'Meenakshi Pillai',
        reportedById: chargeNurseId,
        actionsTaken: 'Contact isolation initiated. IPAC team notified. Enhanced environmental cleaning.',
        outcome: ic.status === 'RESOLVED' ? 'Resolved — no further cases' : null,
        status: ic.status,
        resolvedAt: ic.status === 'RESOLVED' ? daysAgo(1) : null,
        notes: `${ic.organism} detected. Infection prevention measures activated.`,
      },
    });
    icCount++;
  }
  console.log(`   ✔ ${icCount} infection control records`);

  // ── 22. QUALITY INDICATORS + INCIDENTS ───────────────────────────────────
  console.log('\n▶  Creating quality indicators and incidents...');
  const qiDefs = [
    { code: 'QI-001', name: 'Hand Hygiene Compliance', cat: 'INFECTION_CONTROL', target: 90, value: 87, num: 870, den: 1000 },
    { code: 'QI-002', name: 'Patient Falls Rate (per 1000 bed-days)', cat: 'PATIENT_SAFETY', target: 2, value: 1.5, num: 3, den: 2000 },
    { code: 'QI-003', name: 'Medication Error Rate', cat: 'PATIENT_SAFETY', target: 0.5, value: 0.3, num: 3, den: 1000 },
    { code: 'QI-004', name: 'Surgical Site Infection Rate (%)', cat: 'INFECTION_CONTROL', target: 2, value: 1.2, num: 6, den: 500 },
    { code: 'QI-005', name: 'C-Section Rate (%)', cat: 'CLINICAL_OUTCOMES', target: 25, value: 32, num: 32, den: 100 },
    { code: 'QI-006', name: 'Average Length of Stay (Days)', cat: 'OPERATIONAL', target: 5, value: 5.8, num: 580, den: 100 },
  ];
  let qiCount = 0;
  for (const qi of qiDefs) {
    const existing = await prisma.qualityIndicator.findFirst({ where: { tenantId: tenant.id, indicatorCode: qi.code } });
    if (existing) continue;
    await prisma.qualityIndicator.create({
      data: {
        tenantId: tenant.id, indicatorCode: qi.code, name: qi.name,
        category: qi.cat, target: qi.target, period: 'MONTHLY',
        value: qi.value, numerator: qi.num, denominator: qi.den,
        calculatedAt: daysAgo(1), reportedById: adminId,
        notes: qi.value > qi.target ? 'Above target — review needed.' : 'Within target range.',
      },
    });
    qiCount++;
  }

  const qincDefs = [
    { type: 'PATIENT_FALL', sev: 'MINOR', desc: 'Patient fell while attempting to reach bathroom unaided. No injury.' },
    { type: 'MEDICATION_ERROR', sev: 'MODERATE', desc: 'Wrong dose administered — 10mg instead of 5mg Amlodipine.' },
    { type: 'NEEDLE_STICK', sev: 'MINOR', desc: 'Nurse sustained needle-stick injury while recapping needle.' },
    { type: 'NEAR_MISS', sev: 'NEAR_MISS', desc: 'Wrong patient identified for blood transfusion — caught before administration.' },
  ];
  let qincCount = 0;
  for (let i = 0; i < qincDefs.length && i < patients.length; i++) {
    const qinc = qincDefs[i];
    const existing = await prisma.qualityIncident.findFirst({ where: { tenantId: tenant.id, incidentType: qinc.type, patientId: patients[i].id } });
    if (existing) continue;
    await prisma.qualityIncident.create({
      data: {
        tenantId: tenant.id, incidentType: qinc.type,
        patientId: patients[i].id, reportedById: nurseId,
        description: qinc.desc, severity: qinc.sev,
        rootCauseAnalysis: i < 2 ? 'Contributing factors: staffing, environmental, process-related' : null,
        correctiveAction: i < 2 ? 'Staff re-education. Process review. Environmental modification.' : null,
        status: i < 2 ? 'RESOLVED' : 'INVESTIGATING',
        resolvedAt: i < 2 ? daysAgo(2) : null,
        createdAt: daysAgo(5 - i),
      },
    });
    qincCount++;
  }
  console.log(`   ✔ ${qiCount} quality indicators, ${qincCount} quality incidents`);

  // ── 23. MORTUARY RECORDS ──────────────────────────────────────────────────
  console.log('\n▶  Creating mortuary records...');
  const mortuaryDefs = [
    { recNum: 'MOR-001', name: 'Ramesh Subramanian', age: 78, gender: 'MALE', cause: 'Acute Myocardial Infarction', unit: 'A-1', status: 'RELEASED', daysBack: 5 },
    { recNum: 'MOR-002', name: 'Kamala Devi', age: 85, gender: 'FEMALE', cause: 'Cerebrovascular Accident — massive', unit: 'A-2', status: 'IN_CUSTODY', daysBack: 2 },
    { recNum: 'MOR-003', name: 'Unidentified Male', age: 45, gender: 'MALE', cause: 'Pending post-mortem', unit: 'B-1', status: 'IN_CUSTODY', daysBack: 1, police: true },
  ];
  let mortCount = 0;
  for (const md of mortuaryDefs) {
    const existing = await prisma.mortuaryRecord.findUnique({ where: { recordNumber: md.recNum } });
    if (existing) continue;
    const receivedAt = daysAgo(md.daysBack);
    await prisma.mortuaryRecord.create({
      data: {
        tenantId: tenant.id, locationId: location.id,
        recordNumber: md.recNum, deceasedName: md.name, age: md.age,
        gender: md.gender, dateOfDeath: receivedAt,
        timeOfDeath: '14:30', causeOfDeath: md.cause,
        attendingDoctorId: doctorUser.id, pronouncedById: doctorUser.id,
        deathCertificateNo: `DC-2025-${String(mortCount + 1).padStart(6, '0')}`,
        unitNumber: md.unit, receivedAt,
        releasedAt: md.status === 'RELEASED' ? new Date(receivedAt.getTime() + 24 * 60 * 60 * 1000) : null,
        releasedTo: md.status === 'RELEASED' ? 'Family — son' : null,
        policeNotified: (md as any).police || false,
        autopsyRequired: (md as any).police || false,
        autopsyStatus: (md as any).police ? 'PENDING' : null,
        status: md.status,
        notes: md.status === 'IN_CUSTODY' ? 'Family informed. Documents pending.' : null,
      },
    });
    mortCount++;
  }
  console.log(`   ✔ ${mortCount} mortuary records`);

  // ── 24. STAFF ATTENDANCE ──────────────────────────────────────────────────
  console.log('\n▶  Creating staff attendance...');
  const staffUsers = [doctorUser, wardNurse, chargeNurse, adminUser].filter(Boolean) as typeof doctorUser[];
  const shiftTypes = ['MORNING', 'EVENING', 'NIGHT', 'MORNING'];
  let attCount = 0;
  for (let d = 0; d < 5; d++) {
    for (let u = 0; u < staffUsers.length; u++) {
      const user = staffUsers[u];
      if (!user) continue;
      const attDate = daysAgo(d);
      attDate.setHours(0, 0, 0, 0);
      const existing = await prisma.staffAttendance.findFirst({ where: { tenantId: tenant.id, userId: user.id, attendanceDate: attDate } });
      if (existing) continue;
      const isPresent = Math.random() < 0.9;
      const status = !isPresent ? pick(['ABSENT', 'HALF_DAY']) : d === 0 ? 'PRESENT' : 'PRESENT';
      const clockIn = isPresent ? new Date(attDate.getTime() + (shiftTypes[u] === 'MORNING' ? 8 : shiftTypes[u] === 'EVENING' ? 14 : 22) * 60 * 60 * 1000) : null;
      const clockOut = isPresent && d > 0 ? new Date((clockIn as Date).getTime() + 8.5 * 60 * 60 * 1000) : null;
      await prisma.staffAttendance.create({
        data: {
          tenantId: tenant.id, locationId: location.id,
          userId: user.id,
          userName: `${user.firstName} ${user.lastName || ''}`.trim(),
          attendanceDate: attDate, shiftType: shiftTypes[u],
          clockIn, clockOut,
          breakMinutes: isPresent ? 30 : 0,
          overtimeMinutes: isPresent && d > 0 ? randInt(0, 30) : 0,
          status,
        },
      });
      attCount++;
    }
  }
  console.log(`   ✔ ${attCount} attendance records`);

  // ── 25. VENDORS ───────────────────────────────────────────────────────────
  console.log('\n▶  Creating vendors...');
  const vendorDefs = [
    { name: 'Medline Pharma Distributors', cat: 'PHARMA', contact: 'Ravi Kumar', phone: '9876500001', rating: 5 },
    { name: 'Tata Medical Equipment', cat: 'EQUIPMENT', contact: 'Suresh Nair', phone: '9876500002', rating: 4 },
    { name: 'SurgiPro Consumables', cat: 'CONSUMABLES', contact: 'Priya Sharma', phone: '9876500003', rating: 4 },
    { name: 'BioMed Services Ltd', cat: 'SERVICES', contact: 'Anand Pillai', phone: '9876500004', rating: 5 },
    { name: 'HospoCare Linen Services', cat: 'SERVICES', contact: 'Deepa Krishnan', phone: '9876500005', rating: 3 },
  ];
  let vendorCount = 0;
  for (const vd of vendorDefs) {
    const existing = await prisma.vendor.findFirst({ where: { tenantId: tenant.id, name: vd.name } });
    if (existing) continue;
    await prisma.vendor.create({
      data: {
        tenantId: tenant.id, name: vd.name, category: vd.cat,
        contactPerson: vd.contact, phone: vd.phone,
        email: `${vd.contact.toLowerCase().replace(' ', '.')}@${vd.name.toLowerCase().replace(/ /g, '')}.com`,
        gstNumber: `33AAAA${randInt(1000, 9999)}A1Z5`,
        address: '123, Industrial Area, Chennai 600032',
        rating: vd.rating, isActive: true,
      },
    });
    vendorCount++;
  }
  console.log(`   ✔ ${vendorCount} vendors`);

  // ── 26. INVENTORY ITEMS + BATCHES + TRANSACTIONS ──────────────────────────
  console.log('\n▶  Creating inventory items...');
  const inventoryDefs = [
    { code: 'INV-001', name: 'Surgical Gloves (Sterile)', cat: 'PPE', unit: 'PAIR', stock: 500, reorder: 100, cost: 15 },
    { code: 'INV-002', name: 'Disposable Syringes 5ml', cat: 'CONSUMABLES', unit: 'PIECE', stock: 2000, reorder: 500, cost: 4 },
    { code: 'INV-003', name: 'IV Cannula 18G', cat: 'CONSUMABLES', unit: 'PIECE', stock: 300, reorder: 100, cost: 25 },
    { code: 'INV-004', name: 'Surgical Face Mask', cat: 'PPE', unit: 'BOX', stock: 50, reorder: 20, cost: 180 },
    { code: 'INV-005', name: 'Suture Vicryl 2-0', cat: 'SURGICAL', unit: 'PIECE', stock: 80, reorder: 30, cost: 120 },
    { code: 'INV-006', name: 'Urine Catheter 16 Fr', cat: 'CONSUMABLES', unit: 'PIECE', stock: 40, reorder: 20, cost: 65 },
    { code: 'INV-007', name: 'Oxygen Cylinder D-type', cat: 'MEDICAL_GAS', unit: 'CYLINDER', stock: 10, reorder: 5, cost: 800 },
    { code: 'INV-008', name: 'BP Cuff (Disposable)', cat: 'CONSUMABLES', unit: 'PIECE', stock: 8, reorder: 20, cost: 35 }, // low stock
  ];
  const inventoryIds: string[] = [];
  for (const iv of inventoryDefs) {
    const existing = await prisma.inventoryItem.findFirst({ where: { tenantId: tenant.id, itemCode: iv.code } });
    if (existing) { inventoryIds.push(existing.id); continue; }
    const item = await prisma.inventoryItem.create({
      data: {
        tenantId: tenant.id, locationId: location.id, itemCode: iv.code,
        name: iv.name, category: iv.cat, unitOfMeasure: iv.unit,
        currentStock: iv.stock, reorderLevel: iv.reorder, maxStockLevel: iv.reorder * 10,
        unitCost: iv.cost, supplier: 'SurgiPro Consumables',
        storageLocation: `Storeroom-${String(inventoryIds.length + 1).padStart(2, '0')}`,
        isConsumable: true, isActive: true,
        lastRestockedAt: daysAgo(10),
      },
    });
    inventoryIds.push(item.id);
  }

  let invBatchCount = 0;
  for (let i = 0; i < Math.min(inventoryIds.length, 5); i++) {
    const batchNum = `IBATCH-2025-${String(i + 1).padStart(3, '0')}`;
    const existing = await prisma.inventoryBatch.findFirst({ where: { tenantId: tenant.id, itemId: inventoryIds[i], batchNumber: batchNum } });
    if (existing) continue;
    await prisma.inventoryBatch.create({
      data: {
        tenantId: tenant.id, itemId: inventoryIds[i], batchNumber: batchNum,
        manufacturerName: 'SurgiPro Manufacturing', expiryDate: daysFromNow(365),
        manufactureDate: daysAgo(30), quantityReceived: inventoryDefs[i].stock + 200,
        quantityRemaining: inventoryDefs[i].stock, unitCost: inventoryDefs[i].cost,
        supplierName: 'SurgiPro Consumables',
        invoiceNumber: `INV-SUP-2025-${String(i + 1).padStart(4, '0')}`,
        receivedAt: daysAgo(10), receivedById: adminId, isActive: true,
      },
    });
    invBatchCount++;
  }

  let invTxnCount = 0;
  for (let i = 0; i < Math.min(inventoryIds.length, 6); i++) {
    for (let t = 0; t < 2; t++) {
      const txnType = t === 0 ? 'ISSUE' : 'RECEIPT';
      const existing = await prisma.inventoryTransaction.findFirst({ where: { tenantId: tenant.id, itemId: inventoryIds[i], transactionType: txnType, createdAt: daysAgo(t) } });
      if (existing) continue;
      await prisma.inventoryTransaction.create({
        data: {
          tenantId: tenant.id, itemId: inventoryIds[i],
          transactionType: txnType,
          quantity: txnType === 'RECEIPT' ? 200 : 25 + i * 5,
          referenceType: 'MANUAL', departmentName: pick(['General Ward', 'ICU', 'OT', 'Emergency']),
          remarks: txnType === 'RECEIPT' ? 'Stock received from supplier' : 'Issued to department',
          performedById: adminId, createdAt: daysAgo(t),
        },
      });
      invTxnCount++;
    }
  }
  console.log(`   ✔ ${inventoryIds.length} inventory items, ${invBatchCount} batches, ${invTxnCount} transactions`);

  console.log('\n✅  seed-extended.ts complete!\n');
  console.log('Summary:');
  console.log(`  Vitals: ${vitalsCount}`);
  console.log(`  Triage: ${triageCount}, Emergency Visits: ${evCount}`);
  console.log(`  ICU Beds: ${createdIcuBeds.length}, Monitoring: ${icuMonCount}, Rounds: ${icuRoundCount}`);
  console.log(`  NICU: ${nicuAdmissionIds.length} admissions`);
  console.log(`  Discharge Summaries: ${dsSCount}`);
  console.log(`  Dialysis: ${dialysisMachineIds.length} machines, ${dsCount} sessions`);
  console.log(`  Physiotherapy: ${ptOrderIds.length} orders`);
  console.log(`  Blood Bank: ${donors.length} donors, ${donationBags.length} donations, ${transfusionCount} transfusions`);
  console.log(`  Radiology: ${radCount} orders`);
  console.log(`  Insurance: ${policyIds.length} policies, ${claimCount} claims`);
  console.log(`  Wound: ${woundCount}, Antibiotics: ${abxCount}`);
  console.log(`  Protocols: ${protocolIds.length}, Pathways: ${pathwayCount}`);
  console.log(`  Diet: ${dietCount} orders, ${mealCount} meals`);
  console.log(`  Ambulance: ${ambulanceIds.length}, Trips: ${tripCount}`);
  console.log(`  Assets: ${assetIds.length}`);
  console.log(`  Grievances: ${grvCount}`);
  console.log(`  Infection Control: ${icCount}, Quality: ${qiCount} indicators, ${qincCount} incidents`);
  console.log(`  Mortuary: ${mortCount}`);
  console.log(`  Staff Attendance: ${attCount}`);
  console.log(`  Vendors: ${vendorCount}`);
  console.log(`  Inventory: ${inventoryIds.length} items, ${invBatchCount} batches`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
