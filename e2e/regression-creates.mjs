// API-level create regression: hits ~36 create endpoints and asserts 201/200.
// Fast smoke test (no browser). Run: node regression-creates.mjs
// Needs org.json (copy org.json.example -> org.json and fill in credentials).
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./org.json', import.meta.url), 'utf8'));
const S = () => Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10);
async function rq(method, path, tok, body, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(cfg.api + path, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
      return { s: r.status, j: await r.json().catch(() => ({})) };
    } catch (e) { if (i === tries) return { s: 0, j: { message: String(e.message).slice(0, 50) } }; await new Promise(r => setTimeout(r, 4000)); }
  }
}
const results = [];
const rec = (mod, r) => { const ok = r.s === 201 || r.s === 200; results.push({ mod, s: r.s, ok }); console.log(`${ok ? '✓' : '✗'} ${mod.padEnd(26)} HTTP ${r.s}${ok ? '' : '  ' + JSON.stringify(r.j.message || r.j).slice(0, 80)}`); return r.j; };

const tok = (await rq('POST', '/auth/login', null, { email: cfg.logins.admin, password: cfg.password })).j.accessToken;
// prerequisites
const pat = rec('patients', await rq('POST', '/patients', tok, { firstName: 'Reg' + S(), lastName: 'Test', mobile: '9876500099', gender: 'MALE', dateOfBirth: '1990-01-01' }));
const pid = pat.id;
const doctorId = ((await rq('GET', '/doctors/affiliations/tenant', tok)).j[0] || {}).doctorId;
const adm0 = (await rq('GET', '/admissions?status=ACTIVE&limit=1', tok)).j.data?.[0];
const drug = (await rq('GET', '/pharmacy/drugs?limit=1', tok)).j.data?.[0];
const loc = (await rq('GET', '/auth/me', tok)).j.locationId;

// core journey creates
rec('appointments', await rq('POST', '/appointments', tok, { patientId: pid, doctorId, appointmentDate: '2026-08-01', appointmentTime: `${10 + Math.floor(Math.random()*8)}:${Math.floor(Math.random()*5)}5`, chiefComplaint: 'Reg' }));
const tri = rec('triage', await rq('POST', '/triage', tok, { patientId: pid, chiefComplaint: 'Fever', triageLevel: 'YELLOW' }));
const con = rec('consultations', await rq('POST', '/consultations', tok, { patientId: pid, doctorId }));
if (con.id) rec('consultations/complete', await rq('PATCH', `/consultations/${con.id}/complete`, tok, { assessment: 'URI', diagnoses: [{ icdCode: 'J06.9', description: 'Acute URI' }] }));
rec('prescriptions', await rq('POST', '/prescriptions', tok, { patientId: pid, doctorId, items: [{ drugName: 'Calpol', dosage: '500mg', frequency: 'BD', durationDays: 5 }] }));
rec('lab/orders', await rq('POST', '/lab/orders', tok, { patientId: pid, doctorId, tests: [{ testCode: 'CBC', testName: 'Complete Blood Count' }] }));
rec('radiology/orders', await rq('POST', '/radiology/orders', tok, { patientId: pid, modality: 'X-RAY', bodyPart: 'Chest', priority: 'ROUTINE' }));
const adm = rec('admissions', await rq('POST', '/admissions', tok, { patientId: pid, admittingDoctorId: doctorId, admissionType: 'PLANNED' }));
const room = rec('ot/rooms', await rq('POST', '/ot/rooms', tok, { name: 'REG-OT-' + S() }));
if (room.id) rec('ot/bookings', await rq('POST', '/ot/bookings', tok, { patientId: pid, otRoomId: room.id, primarySurgeonId: doctorId, procedureName: 'Appendectomy', scheduledDate: '2026-09-' + (10 + Math.floor(Math.random()*18)), scheduledStart: '09:00' }));
const inv = rec('billing/invoices', await rq('POST', '/billing/invoices', tok, { patientId: pid, lineItems: [{ description: 'Consult', quantity: 1, unitPrice: 500 }] }));
if (inv.id) rec('billing/payments', await rq('POST', `/billing/invoices/${inv.id}/payments`, tok, { amount: 500, paymentMethod: 'CASH' }));

// modules fixed across sessions
rec('mlc', await rq('POST', '/mlc', tok, { patientId: pid, natureOfInjury: 'RTA', broughtBy: 'POLICE' }));
rec('vital-records/births', await rq('POST', '/vital-records/births', tok, { motherPatientId: pid, dateOfBirth: '2026-06-20', gender: 'MALE' }));
rec('vital-records/deaths', await rq('POST', '/vital-records/deaths', tok, { patientId: pid, dateOfDeath: '2026-06-25', causeOfDeath: 'Cardiac arrest' }));
rec('certificates', await rq('POST', '/certificates', tok, { patientId: pid, certificateType: 'FITNESS' }));
rec('consents', await rq('POST', '/consents', tok, { patientId: pid, consentType: 'GENERAL', consentGivenBy: 'Self', doctorName: 'Dr X', description: 'Consent' }));
const pol = rec('insurance/policies', await rq('POST', '/insurance/policies', tok, { patientId: pid, providerName: 'Acme', policyNumber: 'POL-' + S(), planName: 'Gold', sumInsured: 100000 }));
if (pol.id) rec('insurance/claims', await rq('POST', '/insurance/claims', tok, { policyId: pol.id, claimType: 'CASHLESS', totalAmount: 5000 }));
const refDept = (await rq('GET', '/org/departments', tok)).j[0];
rec('referrals', await rq('POST', '/referrals', tok, { patientId: pid, referredToDeptId: refDept?.id, referredToDeptName: refDept?.name, reason: 'Eval', urgency: 'ROUTINE' }));
rec('blood-bank/donors', await rq('POST', '/blood-bank/donors', tok, { firstName: 'D' + S(), lastName: 'Donor', dateOfBirth: '1990-01-01', bloodGroup: 'O', rhFactor: 'POSITIVE', phone: '9876543210' }));
rec('blood-bank/transfusions', await rq('POST', '/blood-bank/transfusions', tok, { patientId: pid, component: 'PRBC', bloodGroup: 'O', rhFactor: 'POSITIVE', volumeMl: 350, bagNumber: 'BAG-' + S() }));
rec('lab/qc/runs', await rq('POST', '/lab/qc/runs', tok, { qcLot: 'LOT-' + S(), testName: 'Glucose', expectedValue: '5.5', obtainedValue: '5.6' }));
if (drug) rec('pharmacy/batches', await rq('POST', '/pharmacy/batches', tok, { drugId: drug.id, batchNumber: 'B-' + S(), expiryDate: '2027-12-31', unitCost: 2, quantity: 50 }));
rec('icu/beds', await rq('POST', '/icu/beds', tok, { bedNumber: 'ICU-' + S(), bedType: 'MEDICAL_ICU' }));
rec('diet/orders', await rq('POST', '/diet/orders', tok, { patientId: pid, dietType: 'DIABETIC' }));
const pord = rec('physiotherapy/orders', await rq('POST', '/physiotherapy/orders', tok, { patientId: pid, doctorId, locationId: loc, therapistId: doctorId, therapistName: 'PT', diagnosis: 'LBP', treatmentPlan: 'Stretch', frequency: 'Daily', totalSessions: 5, startDate: '2026-07-01' }));
if (pord.id) rec('physiotherapy/sessions', await rq('POST', `/physiotherapy/orders/${pord.id}/sessions`, tok, { notes: 'Done' }));
rec('palliative-care', await rq('POST', '/palliative-care', tok, { patientName: 'Pall Test', recordType: 'ASSESSMENT' }));
if (adm0) rec('medication-admin/schedule', await rq('POST', '/medication-admin/schedule', tok, { patientId: pid, admissionId: adm0.id, drugName: 'Paracetamol', dosage: '500mg', route: 'ORAL', frequency: 'BD', scheduledTime: '2026-07-01T08:00:00Z' }));
rec('antimicrobial', await rq('POST', '/antimicrobial', tok, { patientId: pid, drugName: 'Ceftriaxone', route: 'IV', durationDays: 5, dose: '1g', frequency: 'OD', startDate: '2026-07-01' }));
const proto = rec('clinical-pathways/protocols', await rq('POST', '/clinical-pathways/protocols', tok, { name: 'Proto-' + S(), durationDays: 7, steps: [] }));
if (proto.id) rec('clinical-pathways/pathways', await rq('POST', '/clinical-pathways/pathways', tok, { patientId: pid, protocolId: proto.id }));
// locationId-class spot checks (admin has a location, so these should still work)
rec('visitors', await rq('POST', '/visitors', tok, { visitorName: 'V' + S(), purpose: 'Visit', whomToMeet: 'Patient' }));
rec('staff-attendance/clock-in', await rq('POST', '/staff-attendance/clock-in', tok, { shiftType: 'GENERAL' }));

const pass = results.filter(r => r.ok).length;
console.log(`\n=== CREATE REGRESSION: ${pass}/${results.length} endpoints OK ===`);
const bad = results.filter(r => !r.ok);
if (bad.length) bad.forEach(b => console.log(`   ✗ ${b.mod} (HTTP ${b.s})`));
else console.log('   all green');
