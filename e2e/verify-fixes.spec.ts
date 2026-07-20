import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('./org.json', import.meta.url), 'utf8'));
const API = cfg.api;            // live Render backend
const PW = cfg.password;

test.use({ baseURL: 'https://care-sims.vercel.app' });

async function rq(method: string, path: string, token: string | null, body?: any) {
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${method} ${path} :: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

async function uiLogin(page: any, email: string) {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
}

let adminTok = '';
let doctorId = '';
test.beforeAll(async () => {
  const l = await rq('POST', '/auth/login', null, { email: cfg.logins.admin, password: PW });
  adminTok = l.accessToken;
  const affs = await rq('GET', '/doctors/affiliations/tenant', adminTok);
  const list = Array.isArray(affs) ? affs : (affs.data || []);
  doctorId = list[0]?.doctorId || list[0]?.id || '';
  console.log('doctorId for setup:', doctorId);
});

test('ACT 4 (fixed): "Complete Consultation" really completes + persists structured ICD diagnosis', async ({ page }) => {
  const pat = await rq('POST', '/patients', adminTok, { firstName: 'FixCheck', lastName: 'Consult', mobile: '9876511111', gender: 'MALE', dateOfBirth: '1990-01-01' });
  const pid = pat.id;
  console.log('patient:', pat.patientId, pid);

  await uiLogin(page, cfg.logins.admin);
  await page.goto(`/app/doctor/consultation?patientId=${pid}`);
  await page.getByPlaceholder('Chief complaint').fill('Sore throat and fever');
  await page.getByPlaceholder('Physical examination findings').fill('Throat congested, no exudate');
  await page.getByPlaceholder('e.g. Acute Pharyngitis').fill('Acute URI');
  await page.getByPlaceholder('e.g. J02.9').fill('J06.9');
  await page.getByPlaceholder('Treatment plan, instructions').fill('Rest, fluids, symptomatic care');
  await page.getByRole('button', { name: 'Complete Consultation' }).click();
  // success state: button label flips to "Consultation Saved"
  await expect(page.getByRole('button', { name: 'Consultation Saved' })).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/FIX-04-consultation.png', fullPage: true });

  // AUTHORITATIVE: verify via API that it's COMPLETED with a structured J06.9 diagnosis
  const cons = (await rq('GET', `/consultations?patientId=${pid}&limit=10`, adminTok)).data || [];
  expect(cons.length).toBeGreaterThan(0);
  const detail = await rq('GET', `/consultations/${cons[0].id}`, adminTok);
  console.log('CONSULT =>', detail.status, '| dx:', JSON.stringify((detail.diagnoses || []).map((d: any) => `${d.icdCode}:${d.description}`)), '| completedAt:', detail.completedAt);
  expect(detail.status).toBe('COMPLETED');
  expect((detail.diagnoses || []).some((d: any) => d.icdCode === 'J06.9')).toBeTruthy();
});

test('ACT 12: discharge via Discharge-Summary → Approve flips admission to DISCHARGED', async ({ page }) => {
  const pat = await rq('POST', '/patients', adminTok, { firstName: 'FixCheck', lastName: 'Discharge', mobile: '9876522222', gender: 'FEMALE', dateOfBirth: '1985-02-02' });
  const adm = await rq('POST', '/admissions', adminTok, { patientId: pat.id, admittingDoctorId: doctorId || undefined, admissionType: 'PLANNED', diagnosisOnAdmission: 'Observation — fever workup' });
  const admId = adm.id;
  console.log('admission:', adm.admissionNumber, admId, 'status', adm.status);
  expect(adm.status).toBe('ACTIVE');

  await uiLogin(page, cfg.logins.wardnurse);
  await page.goto(`/app/discharge-summary?admissionId=${admId}`);
  await page.waitForTimeout(3500); // let deep-link prefill admission/patient/doctor/dates

  // Make sure the create form is open
  const createBtn = page.getByRole('button', { name: 'Create Draft' });
  if (!(await createBtn.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /New Discharge Summary/ }).click();
    await page.waitForTimeout(800);
  }
  // Ensure required diagnosis present (do NOT touch the date input — its onChange
  // used to clobber the prefilled patientId; discharge date is optional here).
  const dxAdm = page.getByPlaceholder('Diagnosis on Admission');
  if (!(await dxAdm.inputValue().catch(() => ''))) await dxAdm.fill('Observation — fever workup');
  await createBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/FIX-12a-summary-created.png', fullPage: true });

  // Approve the just-created summary (the card showing this admission) -> cascades discharge
  page.once('dialog', d => d.accept().catch(() => {}));
  const approveBtn = page.locator('.hms-card', { hasText: admId.slice(0, 8) }).getByRole('button', { name: 'Approve' }).first();
  await approveBtn.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await approveBtn.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/FIX-12b-approved.png', fullPage: true });

  // AUTHORITATIVE: the admission must now be DISCHARGED
  const after = await rq('GET', `/admissions/${admId}`, adminTok);
  console.log('ADMISSION =>', after.status, '| dischargeDate:', after.dischargeDate);
  expect(after.status).toBe('DISCHARGED');
});
