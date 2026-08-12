import { test, expect, Page } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const PW = 'Demo@1234';

test('patient portal — click every screen', async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);
  await page.goto('/patient/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/patient/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('patient@simsbox.demo');
  await page.locator('input[type="password"]').fill(PW);
  await page.screenshot({ path: 'shots/pt-01-login.png', fullPage: true });
  await page.getByRole('button', { name: /sign in|continue|login/i }).first().click();

  // Hospital chooser
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'shots/pt-02-choose-hospital.png', fullPage: true });
  console.log('after login url:', page.url().split('vercel.app')[1]);
  // The chooser is a searchable card grid — narrow it, then pick the card.
  const search = page.getByPlaceholder(/Search by hospital name/i);
  await expect(search).toBeVisible({ timeout: 30000 });
  await search.fill('Sims Box');
  const card = page.locator('div').filter({ hasText: /^Sims Box/ }).last();
  await expect(page.getByText('Sims Box', { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page.getByText('Sims Box', { exact: true }).first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/pt-02b-selected.png', fullPage: true });
  const cont = page.getByRole('button', { name: /continue/i }).first();
  await expect(cont).toBeVisible({ timeout: 20000 });
  await cont.click();
  await page.waitForURL(/\/app\/patient/, { timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/pt-03-dashboard.png', fullPage: true });
  console.log('landed:', page.url().split('vercel.app')[1]);

  for (const [label, urlPart, shot] of [
    ['Book Appointment', '/app/patient/appointments', 'pt-04-appointments'],
    ['Medical Records',  '/app/patient/records',      'pt-05-records'],
    ['Prescriptions',    '/app/patient/prescriptions','pt-06-prescriptions'],
    ['Lab Reports',      '/app/patient/lab',          'pt-07-lab'],
    ['Billing',          '/app/patient/billing',      'pt-08-billing'],
    ['Vitals History',   '/app/patient/vitals',       'pt-09-vitals'],
  ] as const) {
    const link = page.getByRole('link', { name: new RegExp(label, 'i') }).first();
    if (await link.isVisible().catch(() => false)) { await link.click(); }
    else { await page.goto(urlPart, { waitUntil: 'domcontentloaded' }); }
    await page.waitForTimeout(3500);
    const body = await page.locator('body').innerText();
    const denied = /access denied|not authori|something went wrong/i.test(body);
    console.log(`${label.padEnd(18)} ${page.url().split('vercel.app')[1].padEnd(30)} denied=${denied} chars=${body.length}`);
    await page.screenshot({ path: `shots/${shot}.png`, fullPage: true });
    expect(denied).toBeFalsy();
  }

  // Timeline is reachable from the dashboard, not the sidebar
  await page.goto('/app/patient/timeline', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const t = await page.locator('body').innerText();
  console.log('timeline has REFERRAL entry:', /referral|referred to/i.test(t));
  await page.screenshot({ path: 'shots/pt-10-timeline.png', fullPage: true });
});
