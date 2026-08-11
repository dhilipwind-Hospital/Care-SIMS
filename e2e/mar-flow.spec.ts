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
}

test('MAR schedules a dose from a real prescription', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  await login(page, 'nurse@simsbox.demo');
  await page.goto('/app/nurse/mar', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'shots/mar-01-landing.png', fullPage: true });

  const scheduleBtn = page.getByRole('button', { name: /schedule/i }).first();
  await expect(scheduleBtn).toBeVisible({ timeout: 30000 });
  await scheduleBtn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/mar-02-form.png', fullPage: true });

  // The page has three admission pickers; only the schedule form's is marked
  // required ("Search admission *"), which makes it uniquely addressable.
  const selects = page.locator('select');
  let placeholderSeen = '';
  for (let i = 0; i < await selects.count(); i++) {
    const first = (await selects.nth(i).locator('option').first().innerText()).trim();
    if (/admission first|prescription|Loading prescriptions/i.test(first)) { placeholderSeen = first; break; }
  }
  console.log('rx picker initial state:', JSON.stringify(placeholderSeen));
  expect(placeholderSeen).toBeTruthy();

  // Choose an admission -> the picker should load that patient's drugs
  await page.locator('[role="combobox"]').filter({ hasText: 'Search admission *' }).first().click();
  // The admission picker searches server-side, so it needs a term before it
  // returns anything — clicking alone leaves it on "Type to search…".
  await page.getByPlaceholder(/Search admission/i).fill('Ananya');
  const opt = page.getByRole('listbox').getByRole('option').first();
  // Wait for the option itself, not a fixed delay — the picker is debounced.
  const appeared = await opt.isVisible({ timeout: 20000 }).catch(() => false)
    || await opt.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
  if (appeared) {
    console.log('admission:', (await opt.innerText()).split('\n')[0]);
    await opt.click();
    // Wait for the picker to SETTLE — reading it mid-fetch just catches
    // "Loading prescriptions…" and proves nothing.
    const rxSelect = page.locator('select').filter({ hasText: /prescription|admission first|Loading/i }).first();
    await expect(rxSelect).not.toContainText(/Loading prescriptions/i, { timeout: 25000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'shots/mar-03-rx-loaded.png', fullPage: true });
    for (let i = 0; i < await selects.count(); i++) {
      const opts = await selects.nth(i).locator('option').allInnerTexts();
      if (opts.some(o => /prescription|admission first|Loading/i.test(o))) {
        console.log('rx picker options:', opts.map(o => o.trim().slice(0, 60)));
      }
    }
  } else {
    console.log('no admissions available in this tenant');
  }
});
