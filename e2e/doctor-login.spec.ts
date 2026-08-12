import { test, expect } from '@playwright/test';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });

test('does the doctor sign in on the normal login page?', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('doctor@simsbox.demo');
  await page.locator('input[type="password"]').fill('Demo@1234');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForTimeout(9000);
  console.log('after normal /login ->', page.url().split('vercel.app')[1]);
  await page.screenshot({ path: 'shots/dr-10-after-login.png', fullPage: true });

  // If it lands on the org selector, choose Sims Box
  if (/select-org/.test(page.url())) {
    console.log('landed on the doctor org selector');
    const sims = page.getByText(/Sims Box/i).first();
    if (await sims.isVisible().catch(() => false)) {
      await sims.click(); await page.waitForTimeout(1200);
      const cont = page.getByRole('button', { name: /continue|select|proceed/i }).first();
      if (await cont.isVisible().catch(() => false)) await cont.click();
      await page.waitForTimeout(6000);
    }
  }
  console.log('final ->', page.url().split('vercel.app')[1]);
  await page.screenshot({ path: 'shots/dr-11-doctor-home.png', fullPage: true });
  const body = await page.locator('body').innerText();
  console.log('sees a doctor menu:', /My Queue|Consultations|Prescriptions/i.test(body));
  console.log('nav items:', (body.match(/My Queue|Consultations|Prescriptions|Lab Orders|Referral|My Availability/g) || []).join(' · '));
});
