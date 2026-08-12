import { test, expect, Page } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const PW = 'Demo@1234';
const ORDER = 'LAB-1786513735588-00012';

test('station 7 — walk the lab order through its lifecycle', async ({ page }) => {
  test.setTimeout(9 * 60 * 1000);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('lab@simsbox.demo');
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });

  await page.goto('/app/lab', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(ORDER).first()).toBeVisible({ timeout: 45000 });
  await page.screenshot({ path: 'shots/lb-01-worklist.png', fullPage: true });

  const row = page.locator('tr', { hasText: ORDER });
  console.log('row now:', (await row.innerText()).replace(/\s+/g, ' ').slice(0, 140));
  const actions = (await row.getByRole('button').allInnerTexts()).map(t => t.trim()).filter(Boolean);
  console.log('actions on an ORDERED row:', actions.join(' · '));

  // Walk each state as far as the UI allows
  for (let step = 0; step < 4; step++) {
    const r = page.locator('tr', { hasText: ORDER });
    const btns = (await r.getByRole('button').allInnerTexts()).map(t => t.trim()).filter(Boolean);
    const next = btns.find(b => /collect|receive|process|result|enter|validate/i.test(b));
    if (!next) { console.log('no further action available; buttons =', btns.join(' · ')); break; }
    console.log(`step ${step + 1}: clicking "${next}"`);
    await r.getByRole('button', { name: new RegExp(next.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first().click();
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `shots/lb-0${step + 2}-after-${next.replace(/\W+/g, '-').toLowerCase()}.png`, fullPage: true });
    const state = await page.locator('tr', { hasText: ORDER }).innerText().catch(() => '');
    console.log(`   -> ${state.replace(/\s+/g, ' ').slice(0, 110)}`);
    if (/dialog|modal/i.test(await page.locator('body').innerText())) { /* fallthrough */ }
  }
});
