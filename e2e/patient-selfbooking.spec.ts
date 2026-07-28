import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';

// Patient-portal SELF-BOOKING coverage — the gap left by journey.spec Act 11,
// which only confirms the portal *loads*. Every test books then cancels, so the
// suite is self-cleaning and safe to re-run. Runs live against the deployed
// stack (Vercel FE + Render BE) via the git-ignored e2e/org.json. See README.
//
//   1. API contract  — account login → select org → doctors → open slot → book
//                       → shows in My Appointments → staff sees source=PATIENT_PORTAL
//                       → cancel.  (Green against current production.)
//   2. Doctor name    — regression guard for the getPatientAppointments enrichment
//                       fix (DoctorRegistry vs TenantUser).  FAILS until the backend
//                       fix is DEPLOYED, then goes green.
//   3. UI             — the same booking driven through the real portal page.

const cfg = JSON.parse(readFileSync(new URL('./org.json', import.meta.url), 'utf8'));
const API = cfg.api as string;
mkdirSync(new URL('./shots/', import.meta.url).pathname, { recursive: true });
// Frontend under test. Defaults to the deployed Vercel app; override with FE_URL
// (e.g. FE_URL=http://localhost:5555) to verify local/preview builds before deploy.
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });

// ── robust API helper (retries; tolerates Render cold-start) ──
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
// Unwrap the several list shapes the API returns ([], {data}, {data:{data}}).
const arr = (r: any) => {
  const j = (r && typeof r === 'object' && 's' in r && 'j' in r) ? r.j : r;
  return Array.isArray(j) ? j : (j?.data?.data || j?.data || []);
};
const pick = (r: any, k: string) => (r?.j?.[k] ?? r?.j?.data?.[k]);
const adminToken = async () => (await api('POST', '/auth/login', null, { email: cfg.logins.admin, password: cfg.password })).j.accessToken;

// Patient portal auth: account login → choose org → tenant-scoped token that the
// /auth/patient/me/* endpoints require.
async function patientPortal() {
  const login = await api('POST', '/auth/patient/login', null, { email: cfg.logins.patient, password: cfg.password });
  expect(login.s, `patient login failed (${login.s}): ${JSON.stringify(login.j).slice(0, 200)}`).toBeLessThan(400);
  const accountTok = login.j.accessToken as string;
  const orgs = login.j.organizations || [];
  expect(orgs.length, 'patient account can select no organizations').toBeGreaterThan(0);
  const org = orgs.find((o: any) => /apple/i.test(o.name || '')) || orgs[0];
  const locationId = org.locations?.[0]?.id;
  const sel = await api('POST', '/auth/patient/select-org', accountTok, { tenantId: org.id, locationId });
  expect(sel.s, `select-org failed (${sel.s}): ${JSON.stringify(sel.j).slice(0, 200)}`).toBeLessThan(400);
  return { token: sel.j.accessToken as string, tenantId: sel.j.tenantId || org.id, orgName: org.name };
}

// `offset` days out, rolled off Sunday (the portal calendar disables Sundays), YYYY-MM-DD.
function futureDate(offset: number) {
  const d = new Date(Date.now() + offset * 864e5);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Find a (date, slot) the first patient-facing doctor actually has open soon.
async function findOpenSlot(token: string, doctorId: string, startOffset = 2) {
  for (let off = startOffset; off <= startOffset + 12; off++) {
    const date = futureDate(off);
    const slots = arr(await api('GET', `/auth/patient/me/slots?doctorId=${doctorId}&date=${date}`, token))
      .filter((s: any) => s && s.available && s.time);
    if (slots.length) return { date, time: slots[Math.floor(slots.length / 2)].time as string };
  }
  return null;
}

// Book one appointment via the API and return the ids/echo. Assertions here are
// the shared preconditions every self-booking test needs.
async function bookOpenSlot(token: string) {
  const doctors = arr(await api('GET', '/auth/patient/me/doctors?limit=20', token));
  expect(doctors.length, 'no patient-facing doctors returned').toBeGreaterThan(0);
  const doc = doctors[0];
  const doctorId = doc.userId || doc.id;
  const open = await findOpenSlot(token, doctorId);
  expect(open, `no open slot for ${doc.name || doctorId} in the next fortnight`).toBeTruthy();
  const booked = await api('POST', '/auth/patient/me/appointments', token, {
    doctorId, appointmentDate: open!.date, appointmentTime: open!.time, chiefComplaint: 'E2E self-booking check',
  });
  expect(booked.s, `booking failed (${booked.s}): ${JSON.stringify(booked.j).slice(0, 200)}`).toBeLessThan(400);
  const apptId = pick(booked, 'id');
  expect(apptId, 'booking returned no appointment id').toBeTruthy();
  return { apptId: apptId as string, date: open!.date, time: open!.time, doctorId, booked };
}
const cancelQuietly = (token: string, apptId?: string) =>
  apptId ? api('PATCH', `/auth/patient/me/appointments/${apptId}/cancel`, token, { reason: 'E2E cleanup' }).catch(() => undefined) : Promise.resolve(undefined);

test('patient self-booking — API contract (book → list → cancel)', async () => {
  const { token } = await patientPortal();
  let apptId: string | undefined;
  try {
    const b = await bookOpenSlot(token); apptId = b.apptId;
    expect(pick(b.booked, 'source')).toBe('PATIENT_PORTAL');
    expect(pick(b.booked, 'status')).toBe('SCHEDULED');

    // Appears in the patient's own list at the booked time.
    const mine = arr(await api('GET', '/auth/patient/me/appointments?limit=50', token));
    const found = mine.find((a: any) => a.id === apptId);
    expect(found, 'booked appointment absent from My Appointments').toBeTruthy();
    expect(found.appointmentTime).toBe(b.time);

    // Staff view sees it tagged as a portal booking.
    const admin = await adminToken();
    if (admin && found.patientId) {
      const adminView = arr(await api('GET', `/appointments?patientId=${found.patientId}&limit=100`, admin))
        .find((a: any) => a.id === apptId);
      if (adminView) expect(adminView.source).toBe('PATIENT_PORTAL');
    }

    // Cancel path + free the slot.
    const cancelled = await api('PATCH', `/auth/patient/me/appointments/${apptId}/cancel`, token, { reason: 'E2E cleanup' });
    expect(cancelled.s, `cancel failed (${cancelled.s})`).toBeLessThan(400);
    const after = arr(await api('GET', '/auth/patient/me/appointments?limit=50', token)).find((a: any) => a.id === apptId);
    expect(after?.status).toBe('CANCELLED');
    apptId = undefined; // already cancelled — nothing for the finally to do
  } finally {
    await cancelQuietly(token, apptId);
  }
});

// Regression guard for the enrichment fix in auth.service.getPatientAppointments.
// Portal bookings store a DoctorRegistry id in doctorId; before the fix the name
// lookup only queried TenantUser, so doctorName came back null and "My
// Appointments" showed a bare "Doctor". EXPECTED TO FAIL until the backend fix
// is deployed — the failure message says exactly that.
test('patient self-booking — My Appointments resolves the doctor name', async () => {
  const { token } = await patientPortal();
  let apptId: string | undefined;
  try {
    const b = await bookOpenSlot(token); apptId = b.apptId;
    const found = arr(await api('GET', '/auth/patient/me/appointments?limit=50', token)).find((a: any) => a.id === apptId);
    expect(found, 'booked appointment absent from My Appointments').toBeTruthy();
    expect(found.doctorName, 'doctorName is null — deploy the auth.service getPatientAppointments enrichment fix').toBeTruthy();
    expect(String(found.doctorName)).toMatch(/^Dr\.?\s/);
  } finally {
    await cancelQuietly(token, apptId);
  }
});

test('patient self-booking — UI (book via portal, API-verified)', async ({ browser }) => {
  test.setTimeout(6 * 60 * 1000);
  const { token } = await patientPortal();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  let matchId: string | undefined;
  try {
    // ── Portal login (UI) ──
    await page.goto('/patient/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').first().fill(cfg.logins.patient);
    await page.locator('input[type="password"]').first().fill(cfg.password);
    await page.getByRole('button', { name: /Sign In/i }).first().click({ timeout: 20000 });
    await page.waitForURL(u => /select-hospital|portal/.test(u.toString()), { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2500);
    if (/select-hospital/i.test(page.url())) {
      const card = page.locator('button, [class*="cursor"], [class*="rounded"]').filter({ hasText: /Apple|Hospital|Clinic/i }).first();
      await card.click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const cont = page.getByRole('button', { name: /Continue|Select/i }).first();
      if (await cont.isEnabled().catch(() => false)) await cont.click().catch(() => {});
      await page.waitForURL(u => /portal/.test(u.toString()), { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // ── Book tab ──
    await page.goto('/app/patient/appointments', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: /^Book$/ }).click({ timeout: 10000 }).catch(() => {});

    // Pick the first doctor.
    const docCard = page.locator('button:has-text("Dr.")').first();
    await docCard.waitFor({ state: 'visible', timeout: 30000 });
    await docCard.click();
    await page.waitForTimeout(800);

    // Navigate the calendar to a target future day (skip Sundays — the picker disables them).
    const target = futureDate(4);
    const [ty, tm, td] = target.split('-').map(Number);
    const now = new Date();
    const monthsAhead = (ty - now.getFullYear()) * 12 + (tm - 1 - now.getMonth());
    const cal = page.locator('.rounded-2xl', { hasText: 'Select Date' }).first();
    for (let i = 0; i < monthsAhead; i++) { await cal.locator('button').nth(1).click(); await page.waitForTimeout(300); } // nth(1) = next-month chevron
    await cal.getByRole('button', { name: String(td), exact: true }).first().click({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // Pick the first available (non-disabled) slot and remember its time.
    const slotsCard = page.locator('.rounded-2xl', { hasText: 'Available Slots' }).first();
    const firstSlot = slotsCard.locator('button:not([disabled])').first();
    await firstSlot.waitFor({ state: 'visible', timeout: 20000 });
    const slotTime = (await firstSlot.innerText()).trim();
    await firstSlot.click();
    await page.waitForTimeout(500);

    // Confirm.
    await page.getByRole('button', { name: /Confirm Booking/i }).click({ timeout: 15000 });
    await expect(page.getByText(/Appointment Confirmed/i)).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: 'shots/selfbooking-ui.png', fullPage: true }).catch(() => {});

    // ── Authoritative verification via the patient's own API ──
    const mine = arr(await api('GET', '/auth/patient/me/appointments?limit=50', token));
    const match = mine.find((a: any) =>
      (a.appointmentDate || '').slice(0, 10) === target &&
      a.appointmentTime === slotTime &&
      a.status === 'SCHEDULED' &&
      a.source === 'PATIENT_PORTAL');
    expect(match, `no PATIENT_PORTAL appointment for ${target} ${slotTime} after UI booking`).toBeTruthy();
    matchId = match.id;
  } finally {
    await cancelQuietly(token, matchId);
    await context.close().catch(() => {});
  }
});

// Double-booking race: two SIMULTANEOUS bookings for the same open slot must
// yield exactly one winner. The findFirst pre-check can't stop this (both
// requests pass it before either row exists) — the appointments_active_slot_uniq
// partial unique DB index + P2002 handling is what makes this pass.
test('patient self-booking — concurrent bookings for one slot: exactly one wins', async () => {
  const { token } = await patientPortal();
  const doctors = arr(await api('GET', '/auth/patient/me/doctors?limit=20', token));
  const doc = doctors[0];
  const doctorId = doc.userId || doc.id;
  const open = await findOpenSlot(token, doctorId, 5);
  expect(open, 'no open slot for the race test').toBeTruthy();

  const book = () => api('POST', '/auth/patient/me/appointments', token, {
    doctorId, appointmentDate: open!.date, appointmentTime: open!.time, chiefComplaint: 'E2E race check',
  });
  const [a, b] = await Promise.all([book(), book()]);
  const wins = [a, b].filter(r => r.s < 300);
  const losses = [a, b].filter(r => r.s === 400);
  try {
    expect(wins.length, `expected exactly 1 winner, got ${wins.length} (statuses ${a.s}/${b.s})`).toBe(1);
    expect(losses.length, `loser must get a clean 400, got statuses ${a.s}/${b.s}`).toBe(1);
    expect(String(losses[0].j?.message || '')).toMatch(/no longer available/i);
  } finally {
    for (const w of wins) {
      const id = pick(w, 'id');
      if (id) await api('PATCH', `/auth/patient/me/appointments/${id}/cancel`, token, { reason: 'E2E cleanup' }).catch(() => undefined);
    }
  }
});

// Doctor search must filter in the DB (before `take`), and match full names.
test('patient self-booking — doctor search filters correctly', async () => {
  const { token } = await patientPortal();
  const all = arr(await api('GET', '/auth/patient/me/doctors?limit=20', token));
  expect(all.length).toBeGreaterThan(0);
  const doc = all[0];

  // Single-term (last name) and full-name ("first last") queries both hit.
  for (const q of [doc.lastName, `${doc.firstName} ${doc.lastName}`]) {
    const hits = arr(await api('GET', `/auth/patient/me/doctors?limit=20&q=${encodeURIComponent(q)}`, token));
    expect(hits.some((d: any) => d.id === doc.id), `q="${q}" should find ${doc.name}`).toBe(true);
  }
  // A nonsense query returns nothing.
  const none = arr(await api('GET', '/auth/patient/me/doctors?limit=20&q=zzznotadoctor', token));
  expect(none.length).toBe(0);
});

// Staff-side self-booking (SelfBookingPage at /app/appointments/self-booking).
// Deploy guard for the FRONTEND fixes: the deployed page (a) crashed rendering
// slot objects as React children and (b) had a free-text patient field that
// could never satisfy the NOT-NULL patientId, so Confirm always failed. Passes
// against a build that has the fix (local / preview / prod-after-deploy).
test('staff self-booking — UI (SelfBookingPage books for a patient, API-verified)', async ({ browser }) => {
  test.setTimeout(6 * 60 * 1000);
  const admin = await adminToken();
  expect(admin, 'admin login failed').toBeTruthy();
  const patient = arr(await api('GET', '/patients?limit=10', admin)).find((p: any) => p.firstName && p.lastName);
  expect(patient, 'no existing patient to book for').toBeTruthy();

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  let apptId: string | undefined;
  try {
    // Staff login.
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').first().fill(cfg.logins.admin);
    await page.locator('input[type="password"]').first().fill(cfg.password);
    await page.getByRole('button', { name: /Sign In/i }).first().click({ timeout: 20000 });
    await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
    await page.waitForTimeout(1500);

    await page.goto('/app/appointments/self-booking', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Step 0 — pick the first doctor (cards are clickable divs, not buttons).
    const docCard = page.locator('div.cursor-pointer').filter({ hasText: /Dr\.\s/ }).first();
    await docCard.waitFor({ state: 'visible', timeout: 30000 });
    await docCard.click();
    await page.waitForTimeout(800);

    // Step 1 — date, then the first available slot. (This is where the old page crashed.)
    const date = futureDate(6);
    await page.locator('input[type="date"]').first().fill(date);
    await page.waitForTimeout(1800);
    const slotsCard = page.locator('.hms-card', { hasText: 'Available Time Slots' }).first();
    const firstSlot = slotsCard.locator('button:not([disabled])').first();
    await firstSlot.waitFor({ state: 'visible', timeout: 25000 });
    const slotTime = (await firstSlot.innerText()).trim();
    await firstSlot.click();
    await page.getByRole('button', { name: /Continue/i }).click({ timeout: 15000 });
    await page.waitForTimeout(800);

    // Step 2 — patient picker (the new search) + confirm.
    await page.getByPlaceholder(/Search by name, phone or patient ID/i).fill(patient.lastName);
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: new RegExp(`${patient.firstName}\\s+${patient.lastName}`, 'i') }).first().click({ timeout: 15000 });
    await page.getByRole('button', { name: /Confirm Booking/i }).click({ timeout: 15000 });
    await expect(page.getByText(/Booking Confirmed/i)).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: 'shots/staff-selfbooking.png', fullPage: true }).catch(() => {});

    // Authoritative check: the appointment exists for this patient at that slot.
    const appts = arr(await api('GET', `/appointments?patientId=${patient.id}&limit=100`, admin));
    const match = appts.find((a: any) =>
      (a.appointmentDate || '').slice(0, 10) === date && a.appointmentTime === slotTime && a.status !== 'CANCELLED');
    expect(match, `no appointment for ${patient.patientId || patient.id} on ${date} ${slotTime}`).toBeTruthy();
    apptId = match.id;
  } finally {
    if (apptId) await api('PATCH', `/appointments/${apptId}/cancel`, admin, { reason: 'E2E cleanup' }).catch(() => undefined);
    await context.close().catch(() => {});
  }
});
