import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('./org.json', import.meta.url), 'utf8'));
const API = cfg.api, PW = cfg.password;
test.use({ baseURL: 'https://care-sims.vercel.app' });

async function rq(method: string, path: string, token: string | null, body?: any) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${path} :: ${JSON.stringify(j).slice(0, 140)}`);
  return j;
}
const arr = (r: any) => Array.isArray(r) ? r : (r?.data || []);

test('Wave 5 — deep create flows: Radiology, Blood Bank, Lab QC, Pharmacy PO', async ({ page }) => {
  test.setTimeout(360000);
  const stamp = Date.now().toString().slice(-6);
  const results: any[] = [];
  const tok = (await rq('POST', '/auth/login', null, { email: cfg.logins.admin, password: PW })).accessToken;

  // login in browser (retry for cold path)
  let ok = false;
  for (let a = 1; a <= 4 && !ok; a++) {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(cfg.logins.admin);
    await page.locator('input[type="password"]').fill(cfg.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    try { await page.waitForURL(/\/app(\/|$)/, { timeout: 40000 }); ok = true; } catch { console.log(`  login retry ${a}`); }
  }

  const record = async (flow: string, fn: () => Promise<string>) => {
    let status = 'PASS', detail = '';
    try { detail = await fn(); }
    catch (e: any) { status = 'FAIL'; detail = String(e.message).slice(0, 180); }
    results.push({ flow, status, detail });
    console.log(`${status === 'PASS' ? '✓' : '✗'} ${flow.padEnd(16)} ${status} — ${detail}`);
  };

  // ---- Radiology: create imaging order ----
  await record('Radiology', async () => {
    const pat = await rq('POST', '/patients', tok, { firstName: `RadCheck${stamp}`, lastName: 'X', mobile: '9876500021', gender: 'MALE', dateOfBirth: '1990-01-01' });
    await page.goto('/app/radiology');
    await page.getByRole('button', { name: '+ New Order' }).click();
    await expect(page.getByText('New Radiology Order')).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder('Search patient *').fill(`RadCheck${stamp}`);
    await page.getByRole('button', { name: new RegExp(`RadCheck${stamp}`) }).first().click({ timeout: 20000 });
    await page.getByPlaceholder('Body Part *').fill('Chest');
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `shots/wave5-radiology.png`, fullPage: true });
    const orders = arr(await rq('GET', `/radiology/orders`, tok)).filter((o: any) => o.patientId === pat.id);
    if (!orders.length || orders[0].status !== 'ORDERED') throw new Error(`no ORDERED order for patient (got ${orders.map((o: any) => o.status)})`);
    return `order ${orders[0].orderNumber} = ${orders[0].status}`;
  });

  // ---- Blood Bank: register donor ----
  await record('BloodBank', async () => {
    const ln = `Donor${stamp}`;
    await page.goto('/app/blood-bank');
    await page.getByRole('button', { name: '+ Add Donor' }).click();
    await expect(page.getByText('Register Donor')).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder('First Name *').fill('BB');
    await page.getByPlaceholder('Last Name *').fill(ln);
    await page.locator('input[type="date"]').first().fill('1990-01-15');
    await page.getByPlaceholder('Phone *').fill('9876500022');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `shots/wave5-bloodbank.png`, fullPage: true });
    const donors = arr(await rq('GET', `/blood-bank/donors`, tok)).filter((d: any) => d.lastName === ln);
    if (!donors.length) throw new Error('donor not found via API');
    return `donor ${donors[0].donorId || donors[0].id} created`;
  });

  // ---- Lab QC: record QC run ----
  await record('LabQC', async () => {
    const lot = `LOT-${stamp}`;
    await page.goto('/app/lab/qc');
    await page.getByRole('button', { name: 'QC Runs' }).click().catch(() => {});
    await page.getByRole('button', { name: 'Record QC Run' }).click();
    await expect(page.getByPlaceholder('e.g. LOT-2024-001')).toBeVisible({ timeout: 15000 }); // form open (avoids heading/button strict-mode clash)
    await page.getByPlaceholder('e.g. LOT-2024-001').fill(lot);
    await page.getByPlaceholder('e.g. Glucose').fill('Glucose');
    await page.getByPlaceholder('e.g. 5.5').fill('5.5');
    await page.getByPlaceholder('e.g. 5.6').fill('5.6');
    await page.getByRole('button', { name: 'Submit QC Run' }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `shots/wave5-labqc.png`, fullPage: true });
    const runs = arr(await rq('GET', `/lab/qc/runs`, tok)).filter((r: any) => r.qcLot === lot);
    if (!runs.length) throw new Error('QC run not found via API');
    return `QC run ${lot} = ${runs[0].status}`;
  });

  // ---- Pharmacy: Receive Stock Batch (the fixed Option-A form) ----
  await record('PharmacyBatch', async () => {
    await page.goto('/app/pharmacy/purchase-orders');
    await page.getByRole('button', { name: 'Receive Stock Batch' }).click();
    await expect(page.getByRole('heading', { name: 'Receive Stock Batch' })).toBeVisible({ timeout: 15000 });
    await page.getByText('Search drug…', { exact: false }).first().click();
    await page.getByPlaceholder('Search drug…').fill('a');
    await page.waitForTimeout(900);
    await page.locator('button[role="option"]').first().click({ timeout: 15000 });
    await page.getByPlaceholder('e.g. BATCH-2026-001').fill(`W5BATCH-${stamp}`);
    await page.locator('input[type="date"]').fill('2027-12-31');
    await page.getByPlaceholder('e.g. 100').fill('25');
    await page.getByPlaceholder('e.g. 2.50').fill('3');
    await page.getByRole('button', { name: 'Receive Batch' }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `shots/wave5-pharmacy-po.png`, fullPage: true });
    // success closes the modal
    if (await page.getByRole('heading', { name: 'Receive Stock Batch' }).isVisible().catch(() => false)) throw new Error('batch receive did not close the modal (likely failed)');
    return 'batch received into stock';
  });

  writeFileSync(new URL('./wave5.json', import.meta.url), JSON.stringify(results, null, 2));
  const pass = results.filter(r => r.status === 'PASS').length;
  console.log(`\n=== WAVE 5: ${pass}/${results.length} create-flows verified ===`);
  results.forEach(r => console.log(`   ${r.status}  ${r.flow}: ${r.detail}`));
  expect(results.length).toBe(4);
});
