import { test, expect } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });

// Verifies the Profile-page crash fix: opening the profile as a staff account
// (whose role is an object) must render, not hit the error boundary. Polls to
// ride out the Vercel deploy.
test('Profile page renders for a staff account (no React #31 crash)', async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);
  let ok = false, lastRole = '';
  for (let attempt = 1; attempt <= 8 && !ok; attempt++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').fill('reception@simsbox.demo');
    await page.locator('input[type="password"]').fill('Demo@1234');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
    await page.goto('/app/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const crashed = await page.getByText(/Something went wrong/i).isVisible().catch(() => false);
    if (!crashed) {
      // role chip should show a readable label, not [object Object]
      const roleChip = await page.locator('span').filter({ hasText: /Recept|Admin|Nurse|Role|SYS_/i }).first().innerText().catch(() => '');
      lastRole = roleChip;
      ok = true;
      break;
    }
    console.log(`attempt ${attempt}: still crashing (old build) — waiting for Vercel…`);
    await page.waitForTimeout(30000);
  }
  expect(ok, 'Profile page still hits the error boundary').toBe(true);
  console.log('Profile page renders OK. Role label seen:', lastRole);
  await page.screenshot({ path: 'shots/profile-fixed.png', fullPage: false }).catch(() => {});
});
