import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('./org.json', import.meta.url), 'utf8'));
const API = cfg.api, PW = cfg.password;
test.use({ baseURL: 'https://care-sims.vercel.app' });

async function rq(method: string, path: string, token: string | null, body?: any) {
  let r: any, j: any;
  for (let i = 1; i <= 4; i++) {
    try {
      r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
      j = await r.json().catch(() => ({}));
      break; // got an HTTP response (retry only on network/socket errors)
    } catch (e) { if (i === 4) throw e; await new Promise(res => setTimeout(res, 3000)); }
  }
  if (!r.ok) throw new Error(`${r.status} ${path} :: ${JSON.stringify(j).slice(0, 140)}`);
  return j;
}
const arr = (r: any) => Array.isArray(r) ? r : (r?.data?.data || r?.data || []);
async function pickCombo(page: any, placeholder: string, query: string) {
  await page.getByText(placeholder, { exact: false }).first().click();
  await page.getByPlaceholder(placeholder).fill(query);
  await page.waitForTimeout(900);
  await page.locator('button[role="option"]').first().click({ timeout: 15000 });
}

test('Wave 8 fixes verified on production: Referral, Birth, Consent, MLC', async ({ page }) => {
  test.setTimeout(360000);
  const stamp = Date.now().toString().slice(-6);
  const results: any[] = [];
  const tok = (await rq('POST', '/auth/login', null, { email: cfg.logins.admin, password: PW })).accessToken;
  const pname = `FixV${stamp}`;
  const pat = await rq('POST', '/patients', tok, { firstName: pname, lastName: 'Rec', mobile: '9876500051', gender: 'FEMALE', dateOfBirth: '1992-02-02' });

  let ok = false;
  for (let a = 1; a <= 5 && !ok; a++) {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(cfg.logins.admin);
    await page.locator('input[type="password"]').fill(PW);
    await page.getByRole('button', { name: 'Sign In' }).click();
    try { await page.waitForURL(/\/app(\/|$)/, { timeout: 40000 }); ok = true; } catch {}
  }
  const record = async (flow: string, fn: () => Promise<string>) => {
    let status = 'PASS', detail = '';
    try { detail = await fn(); } catch (e: any) { status = 'FAIL'; detail = String(e.message).slice(0, 170); }
    results.push({ flow, status, detail });
    console.log(`${status === 'PASS' ? '✓' : '✗'} ${flow.padEnd(12)} ${status} — ${detail}`);
  };

  // Referral — dropdowns now resolve, payload maps to backend schema
  await record('Referral', async () => {
    await page.goto('/app/referral');
    await page.getByRole('button', { name: '+ New Referral' }).click();
    await pickCombo(page, 'Search patient…', pname);
    await pickCombo(page, 'Select department…', 'a');
    await page.getByPlaceholder('Reason *').fill('Cardiology eval');
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'shots/fix-referral.png', fullPage: true });
    const refs = arr(await rq('GET', '/referrals', tok)).filter((r: any) => r.patientId === pat.id);
    if (!refs.length) throw new Error('no referral created');
    if (!refs[0].referredToDeptId) throw new Error('referral created but referredToDeptId still null');
    return `${refs[0].referralNumber} dept=${refs[0].referredToDeptName || refs[0].referredToDeptId.slice(0,8)}`;
  });

  // Birth — leave Weight/APGAR BLANK (the old 500 case)
  await record('Birth(blank#)', async () => {
    await page.goto('/app/birth-death');
    await page.getByRole('button', { name: 'Birth Registry' }).click();
    await page.getByRole('button', { name: 'Register Birth' }).click();
    await expect(page.getByRole('heading', { name: 'Register Birth' })).toBeVisible({ timeout: 15000 });
    await pickCombo(page, 'Search mother patient…', pname);
    await page.locator('input[type="date"]').first().fill('2026-06-20');
    await page.getByRole('button', { name: 'Register Birth' }).last().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'shots/fix-birth.png', fullPage: true });
    const births = arr(await rq('GET', '/vital-records/births?page=1&limit=20', tok)).filter((b: any) => b.motherPatientId === pat.id);
    if (!births.length) throw new Error('no birth record (blank numerics still failing)');
    return `birth ${births[0].id?.slice(0, 8)} (no weight/apgar)`;
  });

  // Consent — was 100% broken (doctorId stripped)
  await record('Consent', async () => {
    await page.goto('/app/consent');
    await page.getByRole('button', { name: '+ New Consent' }).click();
    await expect(page.getByText('Record Consent')).toBeVisible({ timeout: 15000 });
    await pickCombo(page, 'Search patient *', pname);
    await page.getByPlaceholder('Procedure Name').fill('Appendectomy');
    await page.getByPlaceholder('Consent Given By *').fill('John Doe');
    await page.getByPlaceholder('Doctor Name *').fill('Dr. Smith');
    await page.getByPlaceholder('Description *').fill('Consent for appendectomy.');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'shots/fix-consent.png', fullPage: true });
    const consents = arr(await rq('GET', '/consents', tok)).filter((c: any) => c.patientId === pat.id);
    if (!consents.length) throw new Error('consent still failing');
    return `consent ${consents[0].id?.slice(0, 8)} type=${consents[0].consentType}`;
  });

  // MLC — register WITHOUT a patient (the old 500 case)
  await record('MLC(noPat)', async () => {
    const nat = `NoPat-${stamp}`;
    await page.goto('/app/mlc');
    await page.getByRole('button', { name: 'Register MLC' }).click();
    await expect(page.getByRole('heading', { name: 'Register MLC Case' })).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder('e.g. Road traffic accident, assault, fall...').fill(nat);
    await page.getByRole('button', { name: 'Register Case' }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'shots/fix-mlc.png', fullPage: true });
    const rows = arr(await rq('GET', '/mlc?page=1&limit=20', tok)).filter((r: any) => r.natureOfInjury === nat);
    if (!rows.length) throw new Error('MLC without patient still failing');
    return `${rows[0].mlcNumber} (no patient)`;
  });

  writeFileSync(new URL('./wave8-fixes.json', import.meta.url), JSON.stringify(results, null, 2));
  const pass = results.filter(r => r.status === 'PASS').length;
  console.log(`\n=== WAVE 8 FIXES: ${pass}/${results.length} now working on production ===`);
  expect(pass).toBe(4);
});
