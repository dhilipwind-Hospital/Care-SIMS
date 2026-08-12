import { test, expect, Page } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const PW = 'Demo@1234';
const FIRST = 'Runbook', LAST = 'Walkthrough';

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
}

test('station 4 — reception registers a patient and queues them', async ({ page }) => {
  test.setTimeout(7 * 60 * 1000);
  await login(page, 'reception@simsbox.demo');
  await page.goto('/app/patients/register', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('Enter first name')).toBeVisible({ timeout: 40000 });

  await page.getByPlaceholder('Enter first name').fill(FIRST);
  await page.getByPlaceholder('Enter middle name').fill('Kumar');
  await page.getByPlaceholder('Enter last name').fill(LAST);
  await page.getByPlaceholder('+91 XXXXX XXXXX').first().fill('9800011122');
  await page.getByPlaceholder('Enter city').fill('Chennai');
  await page.getByPlaceholder(/Describe the reason for visit/i).fill('Fever and cough for two days');
  // gender / marital / id-type selects
  const sels = page.locator('select');
  for (let i = 0; i < await sels.count(); i++) {
    const opts = await sels.nth(i).locator('option').allInnerTexts();
    const male = opts.findIndex(o => /^male$/i.test(o.trim()));
    if (male > -1) { await sels.nth(i).selectOption({ index: male }); break; }
  }
  await page.screenshot({ path: 'shots/jz-01-register-filled.png', fullPage: true });

  await page.getByRole('button', { name: /Register Patient & Generate Token/i }).click();
  await page.waitForTimeout(7000);
  await page.screenshot({ path: 'shots/jz-02-registered.png', fullPage: true });
  const body = await page.locator('body').innerText();
  console.log('token/registered confirmation on screen:', /token|registered|success/i.test(body));

  // The patient must now be findable and pushable to triage
  await page.goto('/app/patients', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/Search by name, phone, ID/i).fill(FIRST);
  const row = page.locator('tr', { hasText: FIRST }).first();
  await expect(row).toBeVisible({ timeout: 30000 });
  console.log('row:', (await row.innerText()).replace(/\s+/g, ' ').slice(0, 120));
  await page.screenshot({ path: 'shots/jz-03-in-list.png', fullPage: true });

  // Registering with "Generate Token" already places the patient in the queue,
  // so the row's Triage button is correctly disabled.
  const triage = row.getByRole('button', { name: /Triage/i }).first();
  const enabled = await triage.isEnabled().catch(() => false);
  const title = await triage.getAttribute('title').catch(() => '');
  console.log('Triage button enabled:', enabled, '| title:', title);
  expect(enabled).toBeFalsy();
  expect((await row.innerText())).toMatch(/Awaiting triage/i);
  await page.screenshot({ path: 'shots/jz-04-queued.png', fullPage: true });
});

test('station 5 — nurse triages the patient', async ({ page }) => {
  test.setTimeout(7 * 60 * 1000);
  await login(page, 'nurse@simsbox.demo');
  await page.goto('/app/nurse/triage', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'shots/jz-06-triage-worklist.png', fullPage: true });

  const list = await page.locator('body').innerText();
  console.log('worklist mentions our patient:', list.includes('Runbook'));

  const card = page.locator('*', { hasText: new RegExp(FIRST) }).last();
  const pick = page.getByText(new RegExp(`${FIRST}\\s+${LAST}`)).first();
  if (await pick.isVisible().catch(() => false)) { await pick.click(); await page.waitForTimeout(2500); }
  await page.screenshot({ path: 'shots/jz-07-triage-open.png', fullPage: true });

  // Acuity — the five buttons discovery found
  const acuity = page.getByRole('button', { name: /Semi-Urgent/i }).first();
  await expect(acuity).toBeVisible({ timeout: 25000 });
  await acuity.click();
  console.log('acuity set to Semi-Urgent');

  // Vitals: fill the numeric inputs that have visible labels near them
  const nums = page.locator('input[type="number"]');
  const count = await nums.count();
  const values = ['120', '80', '78', '37', '98', '16', '70', '170', '5'];
  for (let i = 0; i < Math.min(count, values.length); i++) {
    await nums.nth(i).fill(values[i]).catch(() => {});
  }
  console.log('numeric vitals fields filled:', Math.min(count, values.length));
  await page.getByPlaceholder(/Fever and body ache/i).fill('Fever and cough for two days').catch(() => {});
  await page.screenshot({ path: 'shots/jz-08-triage-filled.png', fullPage: true });

  const save = page.getByRole('button', { name: /Save Vitals/i }).first();
  if (await save.isVisible().catch(() => false)) { await save.click(); await page.waitForTimeout(3000); }
  const complete = page.getByRole('button', { name: /Complete Triage/i }).first();
  await expect(complete).toBeVisible({ timeout: 20000 });
  await complete.click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'shots/jz-09-triaged.png', fullPage: true });
  console.log('after complete:', (await page.locator('body').innerText()).slice(0, 160).replace(/\s+/g, ' '));
});
