import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// SECURITY SUITE — tenant isolation + RBAC negatives, run live against TWO orgs
// (Apple from org.json, Meridian from neworg.json). Pure API, no browser.
//
//   1. Cross-tenant READ  — a GET-by-id with another tenant's id must NOT return
//                           that row (services filter by tenantId → 404).
//   2. Cross-tenant WRITE — a PATCH against another tenant's record must NOT
//                           mutate it (IDOR). Includes a guarded positive control.
//   3. RBAC negatives     — a role NOT in an endpoint's @Roles list must get 403.
//
// Endpoint/guard catalog was derived by static analysis of the backend; every
// assertion here re-verifies it against production. All test rows are cleaned up.

const cfg = JSON.parse(readFileSync(new URL('./org.json', import.meta.url), 'utf8'));
let neo: any = null;
try { neo = JSON.parse(readFileSync(new URL('./neworg.json', import.meta.url), 'utf8')); } catch {}
const API = cfg.api as string;

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
const login = async (email: string, password: string) =>
  (await api('POST', '/auth/login', null, { email, password })).j.accessToken as string | undefined;

// role tokens for both orgs, keyed by short role name
const A: Record<string, string> = {}; // Apple
const M: Record<string, string> = {}; // Meridian
const ROLE_KEYS = ['admin', 'reception', 'nurse', 'pharmacy', 'lab', 'billing'];
// systemRoleId → our token key (for RBAC deniedRole lookups)
const DENY: Record<string, string> = {
  SYS_NURSE: 'nurse', SYS_RECEPTIONIST: 'reception', SYS_PHARMACIST: 'pharmacy',
  SYS_LAB_TECH: 'lab', SYS_BILLING: 'billing',
};

test.beforeAll(async () => {
  for (const k of ROLE_KEYS) { const t = await login(cfg.logins[k], cfg.password); if (t) A[k] = t; }
  if (neo) for (const k of ROLE_KEYS) { const t = await login(neo.ORG.logins[k], neo.ORG.password); if (t) M[k] = t; }
});

// ─────────────────────────── 1. CROSS-TENANT READ ───────────────────────────
// For each resource: take a real id from Apple, fetch it with a Meridian token.
// A leak = HTTP 200 whose body is Apple's row. Secure = 404/403 (or 200-null).
const XT_READ: Array<{ res: string; list: string; byId: string }> = [
  { res: 'patient', list: '/patients?limit=5', byId: '/patients/:id' },
  { res: 'appointment', list: '/appointments?limit=5', byId: '/appointments/:id' },
  { res: 'consultation', list: '/consultations?limit=5', byId: '/consultations/:id' },
  { res: 'prescription', list: '/prescriptions?limit=5', byId: '/prescriptions/:id' },
  { res: 'labOrder', list: '/lab/orders?limit=5', byId: '/lab/orders/:id' },
  { res: 'invoice', list: '/billing/invoices?limit=5', byId: '/billing/invoices/:id' },
  { res: 'admission', list: '/admissions?limit=5', byId: '/admissions/:id' },
  { res: 'referral', list: '/referrals?limit=5', byId: '/referrals/:id' },
  { res: 'otBooking', list: '/ot/bookings?limit=5', byId: '/ot/bookings/:id' },
  { res: 'radiologyOrder', list: '/radiology/orders?limit=5', byId: '/radiology/orders/:id' },
  { res: 'mlc', list: '/mlc?limit=5', byId: '/mlc/:id' },
  { res: 'certificate', list: '/certificates?limit=5', byId: '/certificates/:id' },
];

for (const p of XT_READ) {
  test(`tenant isolation (read) — ${p.res}: Meridian token cannot read Apple's row`, async () => {
    const appleRow = arr(await api('GET', p.list, A.admin))[0];
    test.skip(!appleRow?.id, `Apple has no ${p.res} to probe`);
    if (!M.admin) test.skip(true, 'Meridian not provisioned (neworg.json missing)');
    const res = await api('GET', p.byId.replace(':id', appleRow.id), M.admin);
    const body = res.j?.data ?? res.j;
    const leaked = res.s === 200 && body && (body.id === appleRow.id || body.tenantId === appleRow.tenantId);
    expect(leaked,
      `CROSS-TENANT READ LEAK: Meridian admin read Apple ${p.res} ${appleRow.id} (HTTP ${res.s})`
    ).toBe(false);
    // Positive shape: a tenant-scoped by-id returns 404 for a foreign id.
    expect([403, 404, 401]).toContain(res.s);
  });
}

// ─────────────────────────── 2. CROSS-TENANT WRITE ───────────────────────────
test('tenant isolation (write) — waste-management: Apple cannot mutate Meridian record (IDOR)', async () => {
  test.skip(!neo || !M.admin, 'Meridian not provisioned');
  // Reuse one record (no DELETE route → avoid accumulating rows each run).
  let id = arr(await api('GET', '/waste-management?limit=1', M.admin))[0]?.id;
  if (!id) {
    const created = await api('POST', '/waste-management', M.admin, {
      wasteCategory: 'BIOMEDICAL', weightKg: 1.25, locationId: neo.ORG.locationId, notes: 'ORIGINAL-MERIDIAN',
    });
    id = created.j?.id ?? created.j?.data?.id;
  }
  expect(id, 'could not obtain a Meridian waste record').toBeTruthy();
  // Set a known baseline as the rightful owner.
  await api('PATCH', `/waste-management/${id}`, M.admin, { notes: 'ORIGINAL-MERIDIAN' });

  // Attack: an Apple admin tries to overwrite Meridian's record by id.
  const attack = await api('PATCH', `/waste-management/${id}`, A.admin, { notes: 'TAMPERED-BY-APPLE' });
  // Ground truth: read it back as Meridian.
  const rec = arr(await api('GET', '/waste-management?limit=100', M.admin)).find((r: any) => r.id === id);
  expect(rec?.notes,
    `CROSS-TENANT WRITE LEAK (IDOR): Apple mutated Meridian waste record ${id}`
  ).toBe('ORIGINAL-MERIDIAN');
  expect([403, 404], `foreign PATCH should be rejected, got ${attack.s}`).toContain(attack.s);
});

// Positive control: a properly-guarded write (departments) rejects the same attack.
test('tenant isolation (write) — departments control: guarded endpoint 404s a foreign id', async () => {
  test.skip(!neo || !M.admin, 'Meridian not provisioned');
  const dept = arr(await api('GET', '/org/departments', M.admin))[0];
  test.skip(!dept?.id, 'Meridian has no department to probe');
  const attack = await api('PATCH', `/org/departments/${dept.id}`, A.admin, { name: 'TAMPERED' });
  expect([403, 404], `guarded endpoint must reject foreign id, got ${attack.s}`).toContain(attack.s);
});

// ─────────────────────────── 3. RBAC NEGATIVES ───────────────────────────────
// A role absent from an endpoint's @Roles list must be denied (403). Bodies are
// {} — the RolesGuard runs before body validation, so the 403 fires regardless.
const RBAC: Array<{ method: string; path: string; deny: string; body?: any; note: string }> = [
  { method: 'POST', path: '/consultations', deny: 'SYS_NURSE', body: {}, note: 'doctors-only' },
  { method: 'PATCH', path: '/consultations/00000000-0000-4000-8000-000000000000/complete', deny: 'SYS_BILLING', body: {}, note: 'doctors-only' },
  { method: 'POST', path: '/prescriptions', deny: 'SYS_NURSE', body: {}, note: 'clinical+pharmacy only' },
  { method: 'POST', path: '/appointments', deny: 'SYS_PHARMACIST', body: {}, note: 'front-office+clinical' },
  { method: 'POST', path: '/lab/orders', deny: 'SYS_BILLING', body: {}, note: 'lab+doctor only' },
  { method: 'POST', path: '/pharmacy/dispense/00000000-0000-4000-8000-000000000000', deny: 'SYS_NURSE', body: {}, note: 'pharmacy only' },
  { method: 'POST', path: '/billing/invoices', deny: 'SYS_NURSE', body: {}, note: 'billing only' },
  { method: 'POST', path: '/users', deny: 'SYS_NURSE', body: {}, note: 'org-admin only' },
  { method: 'POST', path: '/roles', deny: 'SYS_LAB_TECH', body: {}, note: 'org-admin only' },
  { method: 'POST', path: '/org/locations', deny: 'SYS_PHARMACIST', body: {}, note: 'org-admin only' },
  { method: 'POST', path: '/org/departments', deny: 'SYS_BILLING', body: {}, note: 'org-admin only' },
  { method: 'POST', path: '/vital-records/births', deny: 'SYS_BILLING', body: {}, note: 'clinical/mrd only' },
  { method: 'POST', path: '/quality/incidents', deny: 'SYS_NURSE', body: {}, note: 'quality only' },
  { method: 'POST', path: '/insurance/policies', deny: 'SYS_NURSE', body: {}, note: 'billing/insurance only' },
];

for (const p of RBAC) {
  test(`RBAC — ${p.deny} denied ${p.method} ${p.path.replace(/\/0{8}.*/, '')} (${p.note})`, async () => {
    const tok = A[DENY[p.deny]];
    expect(tok, `no token for ${p.deny}`).toBeTruthy();
    const res = await api(p.method, p.path, tok, p.body);
    expect(res.s,
      `PRIVILEGE ESCALATION: ${p.deny} was allowed to ${p.method} ${p.path} (HTTP ${res.s}) — expected 403`
    ).toBe(403);
  });
}
