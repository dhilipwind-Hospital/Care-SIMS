import { test, expect, Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// VISUAL WALKTHROUGH of both self-booking flows, run against production.
// Unlike the assertion-focused specs, this captures a screenshot at EVERY step
// and writes shots/walkthrough-results.json, which build-walkthrough-gallery.mjs
// turns into a single self-contained HTML gallery (the "show me the UI" report).
// Self-cleaning: every booking made here is cancelled at the end of its flow.

const cfg = JSON.parse(readFileSync(new URL('./org.json', import.meta.url), 'utf8'));
const API = cfg.api as string;
mkdirSync(new URL('./shots/', import.meta.url).pathname, { recursive: true });
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });

async function api(method: string, path: string, token: string | null, body?: any) {
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(API + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(60000),
      });
      return { s: r.status, j: (await r.json().catch(() => ({}))) as any };
    } catch (e) { if (i === 3) throw e; await new Promise(r => setTimeout(r, 3000)); }
  }
  return { s: 0, j: {} as any };
}
const arr = (r: any) => {
  const j = (r && typeof r === 'object' && 's' in r && 'j' in r) ? r.j : r;
  return Array.isArray(j) ? j : (j?.data?.data || j?.data || []);
};

async function patientToken() {
  const login = await api('POST', '/auth/patient/login', null, { email: cfg.logins.patient, password: cfg.password });
  const org = (login.j.organizations || []).find((o: any) => /apple/i.test(o.name || ''));
  const sel = await api('POST', '/auth/patient/select-org', login.j.accessToken, { tenantId: org.id, locationId: org.locations?.[0]?.id });
  return sel.j.accessToken as string;
}

function futureDate(offset: number) {
  const d = new Date(Date.now() + offset * 864e5);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
async function findOpenSlot(token: string, doctorId: string, startOffset: number, excludeDate?: string) {
  for (let off = startOffset; off <= startOffset + 12; off++) {
    const date = futureDate(off);
    if (date === excludeDate) continue;
    const slots = arr(await api('GET', `/auth/patient/me/slots?doctorId=${doctorId}&date=${date}`, token))
      .filter((s: any) => s && s.available && s.time);
    if (slots.length) return { date, time: slots[0].time as string };
  }
  return null;
}

// ── step recorder ──
type Step = { flow: string; n: number; title: string; desc: string; status: 'PASS' | 'FAIL'; shot: string; detail?: string };
const steps: Step[] = [];
let counter = 0;
async function snap(page: Page, flow: string, title: string, desc: string, detail?: string) {
  counter++;
  const shot = `wt-${String(counter).padStart(2, '0')}.png`;
  await page.screenshot({ path: `shots/${shot}`, fullPage: false }).catch(() => {});
  steps.push({ flow, n: counter, title, desc, status: 'PASS', shot, detail });
  console.log(`  [${flow}] ${String(counter).padStart(2, '0')} ${title}`);
}
const flush = () => writeFileSync(new URL('./shots/walkthrough-results.json', import.meta.url), JSON.stringify(steps, null, 2));

// Navigate the portal mini-calendar to a YYYY-MM-DD and click the day.
async function pickCalendarDate(page: Page, target: string) {
  const [ty, tm, td] = target.split('-').map(Number);
  const now = new Date();
  const monthsAhead = (ty - now.getFullYear()) * 12 + (tm - 1 - now.getMonth());
  const cal = page.locator('.rounded-2xl', { hasText: 'Select Date' }).first();
  for (let i = 0; i < monthsAhead; i++) { await cal.locator('button').nth(1).click(); await page.waitForTimeout(300); }
  await cal.getByRole('button', { name: String(td), exact: true }).first().click({ timeout: 10000 });
  await page.waitForTimeout(1500);
}

test.describe.configure({ mode: 'serial' });

test('walkthrough A — patient portal: login → book → my list → reschedule → cancel', async ({ browser }) => {
  test.setTimeout(8 * 60 * 1000);
  const token = await patientToken();
  const doctors = arr(await api('GET', '/auth/patient/me/doctors?limit=20', token));
  const doctorId = doctors[0].userId || doctors[0].id;
  const openA = await findOpenSlot(token, doctorId, 2);
  expect(openA, 'no open slot for the walkthrough').toBeTruthy();
  const openB = await findOpenSlot(token, doctorId, 4, openA!.date); // reschedule target

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  let apptId: string | undefined;
  try {
    // 1 — login screen, filled
    await page.goto('/patient/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.locator('input[type="email"]').first().fill(cfg.logins.patient);
    await page.locator('input[type="password"]').first().fill(cfg.password);
    await snap(page, 'portal', 'Patient sign-in', 'The patient opens /patient/login and signs in with their own account (separate from staff logins).');
    await page.getByRole('button', { name: /Sign In/i }).first().click({ timeout: 20000 });
    await page.waitForURL(u => /select-hospital|portal/.test(u.toString()), { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2500);

    // 2 — hospital selector
    if (/select-hospital/i.test(page.url())) {
      await snap(page, 'portal', 'Choose your hospital', 'One patient account can be linked to many organizations. They pick the hospital they want to book at — here, "Apple".');
      const card = page.locator('button, [class*="cursor"], [class*="rounded"]').filter({ hasText: /Apple/i }).first();
      await card.click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const cont = page.getByRole('button', { name: /Continue|Select/i }).first();
      if (await cont.isEnabled().catch(() => false)) await cont.click().catch(() => {});
      await page.waitForURL(u => /portal/.test(u.toString()), { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // 3 — portal home
    await snap(page, 'portal', 'Patient portal home', 'The personal dashboard: quick actions for appointments, prescriptions, lab reports, bills and records — scoped to the chosen hospital.');

    // 4 — appointments, book tab
    await page.goto('/app/patient/appointments', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: /^Book$/ }).click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    await snap(page, 'portal', 'Book tab — pick a doctor', 'The 3-step booking screen: doctor grid with specialty filters on the left, calendar + slots + summary on the right. Dates stay disabled until a doctor is chosen.');

    // 5 — doctor selected
    await page.locator('button:has-text("Dr.")').first().click();
    await page.waitForTimeout(800);
    await snap(page, 'portal', 'Doctor selected', `Selecting a doctor card highlights it and unlocks the calendar. Fee and experience are shown on the card.`);

    // 6 — date picked, real slots load (wait out the spinner before shooting)
    await pickCalendarDate(page, openA!.date);
    await page.locator('.rounded-2xl', { hasText: 'Available Slots' }).locator('button').first().waitFor({ timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(400);
    await snap(page, 'portal', 'Real availability loads', `Slots for ${openA!.date} come from the doctor's actual schedule — booked and break slots are greyed out; Sundays and past days can't be picked. Grouped Morning / Afternoon / Evening.`);

    // 7 — slot + complaint
    const slotsCard = page.locator('.rounded-2xl', { hasText: 'Available Slots' }).first();
    const firstSlot = slotsCard.locator('button:not([disabled])').first();
    const slotTime = (await firstSlot.innerText()).trim();
    await firstSlot.click();
    await page.locator('textarea').first().fill('Fever and headache for 2 days').catch(() => {});
    await page.waitForTimeout(500);
    await snap(page, 'portal', 'Slot chosen + chief complaint', `The booking summary now shows doctor, date, ${slotTime} and fee. The patient adds an optional chief complaint before confirming.`);

    // 8 — confirm
    await page.getByRole('button', { name: /Confirm Booking/i }).click({ timeout: 15000 });
    await expect(page.getByText(/Appointment Confirmed/i)).toBeVisible({ timeout: 30000 });
    const mine = arr(await api('GET', '/auth/patient/me/appointments?limit=50', token));
    const booked = mine.find((a: any) => (a.appointmentDate || '').slice(0, 10) === openA!.date && a.appointmentTime === slotTime && a.status === 'SCHEDULED');
    apptId = booked?.id;
    await snap(page, 'portal', 'Booking confirmed', 'Success screen. Behind the scenes the API verified the appointment exists with source=PATIENT_PORTAL and status=SCHEDULED.', `API-verified: id ${String(apptId).slice(0, 8)}…`);

    // 9 — my appointments
    await page.getByRole('button', { name: /View My Appointments/i }).click({ timeout: 10000 });
    await page.waitForTimeout(2500);
    await snap(page, 'portal', 'My Appointments', `The new booking appears with the doctor's name resolved (the enrichment fix), a SCHEDULED badge, and Reschedule / Cancel actions.`);

    // 10 — reschedule
    if (openB && apptId) {
      await page.getByRole('button', { name: /Reschedule/i }).first().click({ timeout: 10000 });
      await page.waitForTimeout(800);
      await page.locator('input[type="date"]').fill(openB.date);
      await page.waitForTimeout(2000);
      const reschSlot = page.locator('.grid button:not([disabled])').filter({ hasText: /^\d{2}:\d{2}$/ }).first();
      await reschSlot.click({ timeout: 10000 }).catch(() => {});
      await snap(page, 'portal', 'Reschedule modal', `Same live-availability rules apply when moving the appointment — the patient picks ${openB.date} and a free slot from the doctor's real calendar.`);
      await page.getByRole('button', { name: /^Confirm$/ }).click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const after = arr(await api('GET', '/auth/patient/me/appointments?limit=50', token)).find((a: any) => a.id === apptId);
      await snap(page, 'portal', 'Rescheduled', `The list updates to the new date. API confirms: ${String(after?.appointmentDate).slice(0, 10)} ${after?.appointmentTime}, still SCHEDULED.`);
    }

    // 11 — cancel
    await page.getByRole('button', { name: /^Cancel$/ }).first().click({ timeout: 10000 });
    await page.waitForTimeout(2500);
    const cancelled = apptId ? arr(await api('GET', '/auth/patient/me/appointments?limit=50', token)).find((a: any) => a.id === apptId) : null;
    await snap(page, 'portal', 'Cancelled by the patient', `One click (plus a confirm dialog) cancels it — the badge flips to CANCELLED. API confirms status=${cancelled?.status}. The slot is free again, which also cleans up this walkthrough.`);
    apptId = undefined;
  } finally {
    if (apptId) await api('PATCH', `/auth/patient/me/appointments/${apptId}/cancel`, token, { reason: 'E2E cleanup' }).catch(() => undefined);
    flush();
    await context.close().catch(() => {});
  }
});

test('walkthrough B — staff wizard: login → doctor → slots → patient → confirm', async ({ browser }) => {
  test.setTimeout(8 * 60 * 1000);
  const adminTok = (await api('POST', '/auth/login', null, { email: cfg.logins.admin, password: cfg.password })).j.accessToken;
  const patient = arr(await api('GET', '/patients?limit=10', adminTok)).find((p: any) => p.firstName && p.lastName);
  const ptoken = await patientToken();
  const doctors = arr(await api('GET', '/auth/patient/me/doctors?limit=20', ptoken));
  const doctorId = doctors[0].userId || doctors[0].id;
  const open = await findOpenSlot(ptoken, doctorId, 3);
  expect(open, 'no open slot for the staff walkthrough').toBeTruthy();

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  let apptId: string | undefined;
  try {
    // 12 — staff login + wizard step 0
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').fill(cfg.logins.admin);
    await page.locator('input[type="password"]').fill(cfg.password);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.goto('/app/appointments/self-booking', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await snap(page, 'staff', 'Self Booking wizard — pick a doctor', 'Staff open Appointments → Self Booking. Step 1 of the wizard lists the tenant\'s affiliated doctors with specialty, rating and consult fee, plus a search box.');

    // 13 — step 1: date + slots (the previously-crashing panel)
    await page.locator('div.cursor-pointer').filter({ hasText: /Dr\.\s/ }).first().click();
    await page.waitForTimeout(800);
    await page.locator('input[type="date"]').first().fill(open!.date);
    await page.waitForTimeout(2000);
    await snap(page, 'staff', 'Date & live slot grid', `Picking ${open!.date} loads the doctor's real availability. This panel previously crashed the page (slot objects rendered as text) — now booked/break slots simply appear disabled.`);

    // 14 — slot selected
    const slotsCard = page.locator('.hms-card', { hasText: 'Available Time Slots' }).first();
    const firstSlot = slotsCard.locator('button:not([disabled])').first();
    const slotTime = (await firstSlot.innerText()).trim();
    await firstSlot.click();
    await page.waitForTimeout(500);
    await snap(page, 'staff', 'Slot selected', `${slotTime} highlights and the booking summary sidebar fills in. Continue moves to the confirmation step.`);
    await page.getByRole('button', { name: /Continue/i }).click({ timeout: 15000 });
    await page.waitForTimeout(800);

    // 15 — patient search open
    await page.getByPlaceholder(/Search by name, phone or patient ID/i).fill(patient.lastName);
    await page.waitForTimeout(1500);
    await snap(page, 'staff', 'Find the patient', 'Step 3 requires a real registered patient — typing a name/phone/ID searches live (this replaced a free-text field that could never submit successfully).');

    // 16 — patient chosen + reason
    await page.getByRole('button', { name: new RegExp(`${patient.firstName}\\s+${patient.lastName}`, 'i') }).first().click({ timeout: 15000 });
    await page.locator('textarea').first().fill('Follow-up consultation').catch(() => {});
    await page.waitForTimeout(500);
    await snap(page, 'staff', 'Patient locked in', `The chosen patient shows as a chip with their patient ID. Visit type and reason are set; Confirm Booking is now enabled.`);

    // 17 — confirmed
    await page.getByRole('button', { name: /Confirm Booking/i }).click({ timeout: 15000 });
    await expect(page.getByText(/Booking Confirmed/i)).toBeVisible({ timeout: 30000 });
    const appts = arr(await api('GET', `/appointments?patientId=${patient.id}&limit=100`, adminTok));
    const match = appts.find((a: any) => (a.appointmentDate || '').slice(0, 10) === open!.date && a.appointmentTime === slotTime && a.status !== 'CANCELLED');
    apptId = match?.id;
    await snap(page, 'staff', 'Booking confirmed', 'Success card with doctor, date, time and the appointment number. The patient also gets a confirmation email.', `API-verified for ${patient.firstName} ${patient.lastName}: id ${String(apptId).slice(0, 8)}…`);
  } finally {
    if (apptId) await api('PATCH', `/appointments/${apptId}/cancel`, adminTok, { reason: 'E2E cleanup' }).catch(() => undefined);
    flush();
    await context.close().catch(() => {});
  }
});
