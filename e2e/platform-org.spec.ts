import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });

// Reads the platform credentials from backend/.env — never hard-coded here.
function platformCreds() {
  // Relative to the Playwright config dir; new URL().pathname percent-encodes
  // the space in the repo path and blows up.
  const env = fs.readFileSync('../backend/.env', 'utf8');
  const pick = (k: string) => (env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, '');
  return { email: pick('PLATFORM_ADMIN_EMAIL'), password: pick('PLATFORM_ADMIN_PASSWORD') };
}

test('platform — create an organization through the wizard', async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  const { email, password } = platformCreds();
  expect(email).toBeTruthy();

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
  await page.waitForTimeout(2500);
  console.log('landed:', page.url().split('vercel.app')[1]);
  await page.screenshot({ path: 'shots/pf-01-dashboard.png', fullPage: true });

  await page.goto('/app/platform/organizations', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'shots/pf-02-orgs.png', fullPage: true });

  const newBtn = page.getByRole('button', { name: /register organization|new organization|\+ ?organization/i }).first();
  await expect(newBtn).toBeVisible({ timeout: 30000 });
  await newBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/pf-03-wizard-step1.png', fullPage: true });

  const dlg = page.locator('[role="dialog"]').first();
  const scope = (await dlg.count()) ? dlg : page;

  // STEP 1 — Organization Details. Next stays disabled until legalName is set.
  await scope.getByPlaceholder('ABC Healthcare Pvt. Ltd.').fill('Runbook Check Hospital Pvt Ltd');
  await scope.getByPlaceholder('ABC Hospital').fill('Runbook Check');
  const next = scope.getByRole('button', { name: /^next$/i }).first();
  await expect(next).toBeEnabled({ timeout: 15000 });
  console.log('STEP 1 ok — Next enabled once legal name is set');
  await page.screenshot({ path: 'shots/pf-03-step1.png', fullPage: true });
  await next.click(); await page.waitForTimeout(1000);

  // STEP 2 — Location & Contact
  const emails = scope.locator('input[type="email"]');
  const n = await emails.count();
  for (let i = 0; i < n; i++) await emails.nth(i).fill(`runbook.check${i}@example.test`);
  console.log('STEP 2 — email fields filled:', n);
  await page.screenshot({ path: 'shots/pf-04-step2.png', fullPage: true });
  await next.click(); await page.waitForTimeout(1000);

  // STEP 3 — Subscription & Features
  console.log('STEP 3 — selects:', await scope.locator('select').count(), '| checkboxes:', await scope.locator('input[type="checkbox"]').count());
  await page.screenshot({ path: 'shots/pf-05-step3.png', fullPage: true });
  await next.click(); await page.waitForTimeout(1200);

  // STEP 4 — Review & Register
  await page.screenshot({ path: 'shots/pf-06-review.png', fullPage: true });
  const submit = scope.getByRole('button', { name: /register|create/i }).last();
  await expect(submit).toBeEnabled({ timeout: 15000 });
  console.log('STEP 4 — submit enabled');
  await submit.click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: 'shots/pf-07-created.png', fullPage: true });
  const body = await page.locator('body').innerText();
  console.log('org appears in the list:', /Runbook Check/i.test(body));
});
