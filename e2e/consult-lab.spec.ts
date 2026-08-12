import { test, expect, Page } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const PW = 'Demo@1234';

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
  await page.waitForTimeout(2500);
}

test('station 6 — doctor queue, consult, order a lab test', async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  await login(page, 'doctor@simsbox.demo');
  await page.goto('/app/doctor/queue', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'shots/dc-01-queue.png', fullPage: true });
  const q = await page.locator('body').innerText();
  console.log('queue has our triaged patient:', /Runbook/.test(q));
  console.log('URGENT shown in queue:', /URGENT/i.test(q));

  // Open the consultation for that patient
  const row = page.locator('tr, div').filter({ hasText: /Runbook Walkthrough/ }).first();
  const consult = page.getByRole('button', { name: /consult/i }).first();
  if (await consult.isVisible().catch(() => false)) { await consult.click(); }
  else { await page.goto('/app/doctor/consultation', { waitUntil: 'domcontentloaded' }); }
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'shots/dc-02-consult.png', fullPage: true });

  // What does this screen offer?
  const btns = [...new Set((await page.getByRole('button').allInnerTexts()).map(b => b.trim().replace(/\s+/g,' ')).filter(Boolean))];
  console.log('consultation buttons:', btns.slice(0, 20).join(' · '));
  const fields = await page.locator('input, textarea, select').evaluateAll(els =>
    els.map((e: any) => e.placeholder || e.getAttribute('aria-label') || '').filter(Boolean));
  console.log('consultation fields :', fields.slice(0, 14).join(' | '));

  // Lab order panel
  const labBtn = page.getByRole('button', { name: /lab|order test/i }).first();
  if (await labBtn.isVisible().catch(() => false)) {
    console.log('lab entry point:', (await labBtn.innerText()).trim());
    await labBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'shots/dc-03-lab-panel.png', fullPage: true });
    const lf = await page.locator('input, select').evaluateAll(els =>
      els.map((e: any) => e.placeholder || e.name || e.type).filter(Boolean));
    console.log('lab panel fields:', lf.slice(0, 12).join(' | '));
  } else { console.log('no lab button visible on this screen'); }
});
