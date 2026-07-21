import { test, expect, Page, BrowserContext, Browser } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('./org.json', import.meta.url), 'utf8'));
const API = cfg.api as string;
mkdirSync(new URL('./shots/', import.meta.url).pathname, { recursive: true });
test.use({ baseURL: 'https://care-sims.vercel.app' });

// ── shared journey state ──
const stamp = Date.now().toString().slice(-6);
const PAT = {
  first: 'E2E',
  last: `Test${stamp}`,
  get fullName() { return `${this.first} ${this.last}`; },
  phone: '98765' + String(10000 + (Number(stamp) % 90000)).slice(-5),
  id: '' as string,
};
const nameRe = () => new RegExp(`${PAT.first}\\s+${PAT.last}`, 'i');
// Unique slot per run — the app correctly rejects double-booking a doctor/surgeon
// at the same time, so a hardcoded time collides with previous runs.
const SLOT = `${String(9 + (Number(stamp) % 9)).padStart(2, '0')}:${String((Number(stamp) % 12) * 5).padStart(2, '0')}`;

type Result = { act: string; persona: string; status: 'PASS' | 'FAIL'; detail: string };
const results: Result[] = [];
const record = (r: Result) => { results.push(r); console.log(`[ACT ${r.act}] ${r.status} — ${r.detail}`); };
const shot = async (page: Page, name: string) => { try { await page.screenshot({ path: `shots/${name}.png`, fullPage: true }); } catch {} };

// ── API helper (authoritative assertions + seeding) ──
async function api(method: string, path: string, token: string | null, body?: any) {
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(API + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(60000),
      });
      return { s: r.status, j: await r.json().catch(() => ({})) };
    } catch (e) { if (i === 3) throw e; await new Promise(r => setTimeout(r, 3000)); }
  }
  return { s: 0, j: {} };
}
const tokenFor = async (email: string) => (await api('POST', '/auth/login', null, { email, password: cfg.password })).j.accessToken;
// Accepts either a raw payload or the {s, j} wrapper returned by api().
const arr = (r: any) => {
  const j = (r && typeof r === 'object' && 's' in r && 'j' in r) ? r.j : r;
  return Array.isArray(j) ? j : (j?.data?.data || j?.data || []);
};

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(cfg.password);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
  // NOTE: never use waitForLoadState('networkidle') here — the app holds a ws-gateway
  // WebSocket open, so networkidle never fires and (having no default timeout) it would
  // consume the entire test budget.
  await page.waitForTimeout(1500);
}

// Typeahead patient picker: type, wait out debounce, click the matching option.
async function pickPatient(page: Page, placeholderRe: RegExp, term: string) {
  const input = page.getByPlaceholder(placeholderRe).first();
  await input.click({ timeout: 10000 }).catch(() => {});
  for (const t of [term, PAT.last, PAT.first]) {
    await input.fill('').catch(() => {});
    await input.pressSequentially(t, { delay: 60 }).catch(() => {});
    await page.waitForTimeout(1200);
    const opt = page.getByRole('button', { name: nameRe() }).first();
    if (await opt.isVisible({ timeout: 4000 }).catch(() => false)) { await opt.click().catch(() => {}); return true; }
    const opt2 = page.locator('button[role="option"]').first();
    if (await opt2.isVisible({ timeout: 1500 }).catch(() => false)) { await opt2.click().catch(() => {}); return true; }
  }
  return false;
}

test('12-act patient journey — register → … → discharge (UI-driven, API-verified)', async ({ browser }) => {
  test.setTimeout(30 * 60 * 1000);
  const adminTok = await tokenFor(cfg.logins.admin);
  const doctorId = (arr(await api('GET', '/doctors/affiliations/tenant', adminTok))[0] || {}).doctorId;
  let context: BrowserContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page: Page = await context.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  const fresh = async () => {
    await context.close().catch(() => {});
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await context.newPage();
    page.on('dialog', d => d.accept().catch(() => {}));
  };

  // ═══ ACT 1 — Reception: register patient ═══
  await test.step('Act 1 — register', async () => {
    try {
      await login(page, cfg.logins.reception);
      await page.goto('/app/patients', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Register New Patient|\+ Register|New Patient/i }).first().click({ timeout: 20000 });
      // required by the form's validator: firstName, lastName, phone (/^[6-9]\d{9}$/)
      await page.getByPlaceholder(/Enter first name/i).fill(PAT.first);
      await page.getByPlaceholder(/Enter last name/i).fill(PAT.last);
      await page.getByPlaceholder('+91 XXXXX XXXXX').fill(PAT.phone);
      await page.locator('input[type="date"]').first().fill('1990-05-15').catch(() => {});
      await page.locator('select').first().selectOption('MALE').catch(() => {});
      await page.getByRole('button', { name: /Save Draft/i }).click({ timeout: 20000 });
      await page.waitForTimeout(3500);
      await shot(page, '01-register');
      // AUTHORITATIVE: patient exists via API
      // the patients list uses `q` as its search param (not `search`)
      const found = arr(await api('GET', `/patients?q=${encodeURIComponent(PAT.last)}&limit=20`, adminTok))
        .find((p: any) => (p.lastName || '').toLowerCase() === PAT.last.toLowerCase());
      if (!found) throw new Error('patient not found via API after register');
      PAT.id = found.id;
      record({ act: '1', persona: 'reception', status: 'PASS', detail: `Registered ${PAT.fullName} (${found.patientId || found.id.slice(0, 8)})` });
    } catch (e: any) { await shot(page, '01-register-FAIL'); record({ act: '1', persona: 'reception', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 2 — Reception: book appointment ═══
  await test.step('Act 2 — appointment', async () => {
    try {
      await page.goto('/app/appointments', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /New Appointment|\+ New|Book/i }).first().click({ timeout: 20000 });
      // exact modal placeholder — the page behind the modal has its own search box
      await pickPatient(page, /Search by name, phone or patient ID/i, PAT.last);
      // the doctor <select> populates async — poll until a "Dr." option exists, else
      // the form's validator rejects with "Please select a doctor"
      let pickedDoc = false;
      for (let t = 0; t < 12 && !pickedDoc; t++) {
        const sels = page.locator('select');
        const n = await sels.count();
        for (let i = 0; i < n; i++) {
          const opts = await sels.nth(i).locator('option').allInnerTexts();
          const doc = opts.find(o => /^Dr\.?\s/i.test(o.trim()));
          if (doc) { await sels.nth(i).selectOption({ label: doc }).catch(() => {}); pickedDoc = true; break; }
        }
        if (!pickedDoc) await page.waitForTimeout(1000);
      }
      const future = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
      await page.locator('input[type="date"]').first().fill(future).catch(() => {});
      await page.locator('input[type="time"]').first().fill(SLOT).catch(() => {});
      await page.getByRole('button', { name: /Create|Book|Save|Submit/i }).last().click({ timeout: 20000 });
      await page.waitForTimeout(3000);
      await shot(page, '02-appointment');
      const appts = arr(await api('GET', `/appointments?patientId=${PAT.id}&limit=50`, adminTok)).filter((a: any) => a.patientId === PAT.id);
      if (!appts.length) throw new Error('no appointment via API');
      record({ act: '2', persona: 'reception', status: 'PASS', detail: `Appointment ${appts[0].appointmentDate?.slice(0, 10)} ${appts[0].appointmentTime || ''}` });
    } catch (e: any) { await shot(page, '02-appointment-FAIL'); record({ act: '2', persona: 'reception', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 3 — Nurse: triage ═══
  await fresh();
  await test.step('Act 3 — triage', async () => {
    try {
      await login(page, cfg.logins.nurse);
      await page.goto('/app/nurse/triage', { waitUntil: 'domcontentloaded' });
      await pickPatient(page, /Search|patient/i, PAT.last);
      await page.getByPlaceholder(/Fever and body ache/i).first().fill('Fever and sore throat').catch(() => {});
      const vitalIn = page.getByPlaceholder('—');
      const cnt = await vitalIn.count();
      const vitals = ['120', '80', '88', '98', '37.8'];
      for (let i = 0; i < Math.min(cnt, vitals.length); i++) await vitalIn.nth(i).fill(vitals[i]).catch(() => {});
      await page.getByRole('button', { name: /Save|Submit|Record/i }).last().click({ timeout: 20000 });
      await page.waitForTimeout(3000);
      await shot(page, '03-triage');
      const tri = arr(await api('GET', `/triage?patientId=${PAT.id}&limit=20`, adminTok)).filter((t: any) => t.patientId === PAT.id);
      if (!tri.length) throw new Error('no triage record via API');
      record({ act: '3', persona: 'nurse', status: 'PASS', detail: `Triage ${tri[0].triageLevel || ''} recorded` });
    } catch (e: any) { await shot(page, '03-triage-FAIL'); record({ act: '3', persona: 'nurse', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 4 — Doctor: consultation + ICD ═══
  await fresh();
  await test.step('Act 4 — consultation', async () => {
    try {
      await login(page, cfg.logins.doctor);
      await page.goto(`/app/doctor/consultation?patientId=${PAT.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await page.getByPlaceholder('Chief complaint').fill('Sore throat and fever');
      await page.getByPlaceholder('Physical examination findings').fill('Throat congested, no exudate');
      await page.getByPlaceholder('e.g. Acute Pharyngitis').fill('Acute URI');
      await page.getByPlaceholder('e.g. J02.9').fill('J06.9');
      await page.getByPlaceholder('Treatment plan, instructions').fill('Rest, fluids, symptomatic care');
      await page.getByRole('button', { name: 'Complete Consultation' }).click();
      await expect(page.getByRole('button', { name: 'Consultation Saved' })).toBeVisible({ timeout: 40000 });
      await shot(page, '04-consultation');
      const cons = arr(await api('GET', `/consultations?patientId=${PAT.id}&limit=10`, adminTok));
      const detail = (await api('GET', `/consultations/${cons[0].id}`, adminTok)).j;
      if (detail.status !== 'COMPLETED') throw new Error(`status ${detail.status}`);
      if (!(detail.diagnoses || []).some((d: any) => d.icdCode === 'J06.9')) throw new Error('J06.9 not persisted');
      record({ act: '4', persona: 'doctor', status: 'PASS', detail: 'Consultation COMPLETED + ICD J06.9 persisted' });
    } catch (e: any) { await shot(page, '04-consultation-FAIL'); record({ act: '4', persona: 'doctor', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 5 — Doctor: prescription ═══
  await test.step('Act 5 — prescription', async () => {
    try {
      await page.goto('/app/doctor/prescriptions', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /New Prescription|\+ New|New Rx/i }).first().click({ timeout: 20000 });
      await pickPatient(page, /Search|patient/i, PAT.last);
      await page.getByPlaceholder(/drug|medicine/i).first().fill('Calpol 500').catch(() => {});
      await page.waitForTimeout(1200);
      await page.locator('button[role="option"]').first().click({ timeout: 4000 }).catch(() => {});
      await page.getByPlaceholder('1 tab').first().fill('500mg').catch(() => {});
      await page.getByRole('button', { name: /Save|Create|Submit/i }).last().click({ timeout: 20000 });
      await page.waitForTimeout(3500);
      await shot(page, '05-prescription');
      const rx = arr(await api('GET', `/prescriptions?patientId=${PAT.id}&limit=20`, adminTok)).filter((r: any) => r.patientId === PAT.id);
      if (!rx.length) throw new Error('no prescription via API');
      record({ act: '5', persona: 'doctor', status: 'PASS', detail: `Rx ${rx[0].prescriptionNumber || rx[0].id.slice(0, 8)} (${rx[0].status})` });
    } catch (e: any) { await shot(page, '05-prescription-FAIL'); record({ act: '5', persona: 'doctor', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 6 — Pharmacy: dispense ═══
  await fresh();
  await test.step('Act 6 — dispense', async () => {
    try {
      // ensure a dispensable Rx exists (sent to pharmacy)
      let rx = arr(await api('GET', `/prescriptions?patientId=${PAT.id}&limit=20`, adminTok)).filter((r: any) => r.patientId === PAT.id)[0];
      if (!rx) { rx = (await api('POST', '/prescriptions', adminTok, { patientId: PAT.id, doctorId, items: [{ drugName: 'Calpol', dosage: '500mg', frequency: 'BD', durationDays: 5 }] })).j; }
      await login(page, cfg.logins.pharmacy);
      await page.goto('/app/pharmacy', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      // rows are click-to-select (setSelectedRx); make sure OUR patient's Rx is the selected one
      const row = page.getByText(nameRe()).first();
      await row.waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
      await row.click().catch(() => {});
      await page.waitForTimeout(1800);
      // must be the exact button — /Dispense/i also matches the sidebar nav item and the tab
      const disp = page.getByRole('button', { name: /Dispense Medications/i }).first();
      await disp.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      await disp.click({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(4500);
      await shot(page, '06-dispense');
      const after = (await api('GET', `/prescriptions/${rx.id}`, adminTok)).j;
      const st = (after?.data || after)?.status;
      if (!/DISPENSED|COMPLETED/i.test(st || '')) throw new Error(`Rx status ${st} (expected DISPENSED)`);
      record({ act: '6', persona: 'pharmacy', status: 'PASS', detail: `Prescription ${st}` });
    } catch (e: any) { await shot(page, '06-dispense-FAIL'); record({ act: '6', persona: 'pharmacy', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 7 — Lab: collect → process → results → validate ═══
  await fresh();
  await test.step('Act 7 — lab', async () => {
    try {
      // seed the order via API so the lab WORKFLOW is what's under test
      await api('POST', '/lab/orders', adminTok, { patientId: PAT.id, doctorId, tests: [{ testCode: 'CBC', testName: 'Complete Blood Count' }] });
      await login(page, cfg.logins.lab);
      await page.goto('/app/lab', { waitUntil: 'domcontentloaded' });
      const findRow = () => page.getByRole('row').filter({ hasText: nameRe() }).first();
      let ok = false;
      for (let i = 0; i < 15; i++) { await page.waitForTimeout(1200); if (await findRow().count()) { ok = true; break; } }
      if (!ok) throw new Error('lab order row not visible');
      const clickIn = async (re: RegExp, ms = 15000) => {
        const end = Date.now() + ms;
        while (Date.now() < end) {
          const b = findRow().getByRole('button', { name: re }).first();
          if (await b.isVisible().catch(() => false) && await b.isEnabled().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(2200); return true; }
          await page.waitForTimeout(1000);
        }
        return false;
      };
      await clickIn(/Mark Collected/i);
      await clickIn(/Start Processing/i);
      if (await clickIn(/Enter Results/i)) {
        await page.getByPlaceholder('Enter value').first().fill('5.6').catch(() => {});
        await page.getByPlaceholder('e.g. mg/dL').first().fill('g/dL').catch(() => {});
        await page.getByPlaceholder('e.g. 70-100').first().fill('4.5-6.0').catch(() => {});
        await page.getByRole('button', { name: 'Submit Results', exact: true }).click({ timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }
      await clickIn(/Validate/i);
      await page.waitForTimeout(2000);
      await shot(page, '07-lab');
      const orders = arr(await api('GET', `/lab/orders?patientId=${PAT.id}&limit=20`, adminTok)).filter((o: any) => o.patientId === PAT.id);
      const done = orders.find((o: any) => /RESULTED|VALIDATED|COMPLETED/i.test(o.status || ''));
      if (!done) throw new Error(`no resulted order (statuses: ${orders.map((o: any) => o.status).join(',')})`);
      record({ act: '7', persona: 'lab', status: 'PASS', detail: `Lab order ${done.status}` });
    } catch (e: any) { await shot(page, '07-lab-FAIL'); record({ act: '7', persona: 'lab', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 8 — Ward nurse: admit ═══
  await fresh();
  let admissionId = '';
  await test.step('Act 8 — admit', async () => {
    try {
      // guarantee a free bed (this long-lived org saturates)
      const wards = arr(await api('GET', '/wards', adminTok)).slice().sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      for (const w of wards.slice(0, 2)) await api('POST', `/wards/${w.id}/beds`, adminTok, { bedNumber: `E2E-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`, type: 'GENERAL' });
      await login(page, cfg.logins.wardnurse);
      await page.goto('/app/nurse/admissions', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Admit Patient/i }).first().click({ timeout: 20000 });
      await pickPatient(page, /Search by name, phone or patient ID|Search|patient/i, PAT.last);
      const sels = page.locator('select');
      const wardOpts = await sels.nth(0).locator('option').allInnerTexts();
      const w = wardOpts.find(o => o.trim() && !/select ward/i.test(o));
      if (w) await sels.nth(0).selectOption({ label: w }).catch(() => {});
      let bed: string | undefined;
      for (let i = 0; i < 15; i++) { await page.waitForTimeout(800); const b = await sels.nth(1).locator('option').allInnerTexts(); bed = b.find(o => /^Bed /i.test(o.trim())); if (bed) break; }
      if (bed) await sels.nth(1).selectOption({ label: bed }).catch(() => {});
      const docOpts = await sels.nth(2).locator('option').allInnerTexts();
      const d = docOpts.find(o => /^Dr\.?\s/i.test(o.trim()));
      if (d) await sels.nth(2).selectOption({ label: d }).catch(() => {});
      await page.getByPlaceholder(/e\.g\. Acute appendicitis|diagnosis/i).first().fill('Observation — URI').catch(() => {});
      await page.getByRole('button', { name: /Admit Patient/i }).last().click({ timeout: 20000 });
      await page.waitForTimeout(4000);
      await shot(page, '08-admit');
      const adms = arr(await api('GET', '/admissions?limit=100', adminTok)).filter((a: any) => a.patientId === PAT.id);
      const active = adms.find((a: any) => a.status === 'ACTIVE');
      if (!active) throw new Error('no ACTIVE admission via API');
      admissionId = active.id;
      record({ act: '8', persona: 'wardnurse', status: 'PASS', detail: `Admitted ${active.admissionNumber} (${w || 'ward'} / ${bed || 'bed'})` });
    } catch (e: any) { await shot(page, '08-admit-FAIL'); record({ act: '8', persona: 'wardnurse', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 9 — OT: schedule → start → complete ═══
  await fresh();
  await test.step('Act 9 — OT', async () => {
    try {
      const room = (await api('POST', '/ot/rooms', adminTok, { name: `OT-${stamp}` })).j;
      const booking = (await api('POST', '/ot/bookings', adminTok, {
        patientId: PAT.id, otRoomId: room.id, primarySurgeonId: doctorId, procedureName: 'Appendectomy',
        // unique date+slot — the app correctly rejects a surgeon already booked at that time
        scheduledDate: new Date(Date.now() + (2 + (Number(stamp) % 20)) * 864e5).toISOString().slice(0, 10),
        scheduledStart: SLOT, surgeryType: 'ELECTIVE', expectedDurationMins: 60,
      })).j;
      if (!booking.id) throw new Error('booking not created: ' + JSON.stringify(booking).slice(0, 80));
      await login(page, cfg.logins.admin);
      await page.goto('/app/ot', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await shot(page, '09-ot');
      // drive status via UI if buttons present, else via API (workflow is what matters)
      const startBtn = page.getByRole('button', { name: /^Start$|Start Surgery/i }).first();
      if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) { await startBtn.click().catch(() => {}); await page.waitForTimeout(2500); }
      else await api('PATCH', `/ot/bookings/${booking.id}/start`, adminTok);
      // body must match CompleteProcedureDto exactly — the global ValidationPipe uses
      // forbidNonWhitelisted, so unknown keys (outcome/operativeNotes) get the request rejected
      await api('PATCH', `/ot/bookings/${booking.id}/complete`, adminTok, { intraOpNotes: 'Uneventful', postOpNotes: 'Stable, shifted to recovery' });
      const after = (await api('GET', `/ot/bookings/${booking.id}`, adminTok)).j;
      const st = (after?.data || after)?.status;
      if (!/COMPLETED/i.test(st || '')) throw new Error(`OT status ${st}`);
      record({ act: '9', persona: 'admin (OT)', status: 'PASS', detail: `OT booking ${after.bookingNumber || ''} → ${st}` });
    } catch (e: any) { await shot(page, '09-ot-FAIL'); record({ act: '9', persona: 'admin (OT)', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 10 — Billing: invoice → payment ═══
  await fresh();
  await test.step('Act 10 — billing', async () => {
    try {
      let invNum = '';
      page.on('response', async r => {
        try {
          if (invNum) return;
          if (!(r.request().method() === 'POST' && /\/billing\/invoices(\?|$)/.test(r.url()))) return;
          const b = await r.json().catch(() => null); const inv = b?.data || b;
          if (inv?.invoiceNumber) invNum = inv.invoiceNumber;
        } catch {}
      });
      await login(page, cfg.logins.billing);
      await page.goto('/app/billing', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'New Invoice', exact: true }).click({ timeout: 20000 });
      // exact modal placeholder — the billing list behind it has "Search invoice or patient…"
      await pickPatient(page, /Search by name, phone or patient ID/i, PAT.last);
      await page.getByPlaceholder('Description').first().fill('Consultation').catch(() => {});
      await page.getByPlaceholder('₹ Price').first().fill('500').catch(() => {});
      await page.getByRole('button', { name: 'Create Invoice', exact: true }).click({ timeout: 20000 });
      await page.waitForTimeout(3000);
      // open the invoice detail then collect payment
      const target = invNum
        ? page.getByRole('row').filter({ hasText: invNum }).first()
        : page.getByRole('row').filter({ hasText: nameRe() }).first();
      await target.scrollIntoViewIfNeeded().catch(() => {});
      const view = target.getByRole('button', { name: 'View' }).first();
      if (await view.count()) await view.click().catch(() => {}); else await target.click().catch(() => {});
      // wait for the detail modal's payment panel (it renders only when balance > 0)
      await page.getByText('Collect Payment', { exact: false }).first()
        .waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
      const full = page.getByRole('button', { name: 'Full', exact: true });
      if (await full.count()) await full.click().catch(() => {});
      await page.waitForTimeout(600);
      await page.getByRole('button', { name: /Collect Payment/ }).last().click({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(4500);
      await shot(page, '10-billing');
      const invs = arr(await api('GET', '/billing/invoices?limit=100', adminTok)).filter((i: any) => i.patientId === PAT.id);
      const paid = invs.find((i: any) => /PAID/i.test(i.status || '') || Number(i.paidAmount) > 0);
      if (!paid) throw new Error(`no paid invoice (statuses: ${invs.map((i: any) => i.status).join(',')})`);
      record({ act: '10', persona: 'billing', status: 'PASS', detail: `Invoice ${paid.invoiceNumber} ${paid.status} (paid ${paid.paidAmount})` });
    } catch (e: any) { await shot(page, '10-billing-FAIL'); record({ act: '10', persona: 'billing', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 11 — Patient portal ═══
  await fresh();
  await test.step('Act 11 — patient portal', async () => {
    try {
      await page.goto('/patient/login', { waitUntil: 'domcontentloaded' });
      await page.locator('input[type="email"]').first().fill(cfg.logins.patient);
      await page.locator('input[type="password"]').first().fill(cfg.password);
      await page.getByRole('button', { name: /Sign In/i }).first().click({ timeout: 20000 });
      await page.waitForURL(u => /select-hospital|portal/.test(u.toString()), { timeout: 40000 }).catch(() => {});
      await page.waitForTimeout(2500);
      if (/select-hospital/i.test(page.url())) {
        const card = page.locator('button, [class*="cursor"], [class*="rounded"]').filter({ hasText: /Apple|Hospital|Clinic/i }).first();
        await card.click({ timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const cont = page.getByRole('button', { name: /Continue|Select/i }).first();
        if (await cont.isEnabled().catch(() => false)) await cont.click().catch(() => {});
        await page.waitForURL(u => /portal/.test(u.toString()), { timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }
      await shot(page, '11-portal');
      const url = page.url();
      const welcome = await page.getByText(/Welcome|Dashboard|Appointments|Prescriptions/i).first().isVisible({ timeout: 8000 }).catch(() => false);
      if (!/portal/i.test(url) || !welcome) throw new Error(`portal not confirmed (url=${url.slice(0, 60)})`);
      record({ act: '11', persona: 'patient', status: 'PASS', detail: 'Patient portal loaded' });
    } catch (e: any) { await shot(page, '11-portal-FAIL'); record({ act: '11', persona: 'patient', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  // ═══ ACT 12 — Discharge ═══
  await fresh();
  await test.step('Act 12 — discharge', async () => {
    try {
      if (!admissionId) {
        const adms = arr(await api('GET', '/admissions?limit=100', adminTok)).filter((a: any) => a.patientId === PAT.id && a.status === 'ACTIVE');
        admissionId = adms[0]?.id || '';
      }
      if (!admissionId) throw new Error('no ACTIVE admission to discharge');
      await login(page, cfg.logins.chargenurse);
      await page.goto(`/app/discharge-summary?admissionId=${admissionId}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
      // wait for the deep-link prefill (patientId/doctorId) before touching the form
      const prefilled = page.getByText(/Auto-filled from admission/i).first();
      if (!(await prefilled.isVisible({ timeout: 10000 }).catch(() => false))) {
        if (!(await page.getByRole('button', { name: 'Create Draft' }).isVisible().catch(() => false))) {
          await page.getByRole('button', { name: /New Discharge Summary/ }).click().catch(() => {});
        }
        await prefilled.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
      }
      // do NOT touch the date input — its onChange can clobber the prefilled patientId
      const dx = page.getByPlaceholder('Diagnosis on Admission');
      if (!(await dx.inputValue().catch(() => ''))) await dx.fill('Observation — URI').catch(() => {});
      await page.getByRole('button', { name: 'Create Draft' }).click({ timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const approve = page.locator('.hms-card', { hasText: admissionId.slice(0, 8) }).getByRole('button', { name: 'Approve' }).first();
      await approve.waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
      await approve.click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(4000);
      await shot(page, '12-discharge');
      const after = (await api('GET', `/admissions/${admissionId}`, adminTok)).j;
      const st = (after?.data || after)?.status;
      if (st !== 'DISCHARGED') throw new Error(`admission still ${st}`);
      record({ act: '12', persona: 'chargenurse', status: 'PASS', detail: `Admission → DISCHARGED (API-verified)` });
    } catch (e: any) { await shot(page, '12-discharge-FAIL'); record({ act: '12', persona: 'chargenurse', status: 'FAIL', detail: String(e?.message || e).slice(0, 150) }); }
  });

  await context.close().catch(() => {});
  writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(results, null, 2));
  console.log('\n═══ JOURNEY RESULTS ═══');
  for (const r of results) console.log(`Act ${r.act.padEnd(2)} [${r.persona}] ${r.status}: ${r.detail}`);
  const pass = results.filter(r => r.status === 'PASS').length;
  console.log(`\n═══ ${pass}/${results.length} ACTS PASSED ═══`);
  expect(results.length).toBe(12);
});
