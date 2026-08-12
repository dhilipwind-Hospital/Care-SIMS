import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
test.use({ baseURL: process.env.FE_URL || 'https://care-sims.vercel.app' });
const PW = 'Demo@1234';

async function login(page: Page, email: string, password = PW) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 60000 });
  await page.waitForTimeout(2000);
}

test('station 3 — admin creates and removes a department and a location', async ({ page }) => {
  test.setTimeout(9 * 60 * 1000);
  await login(page, 'admin@simsbox.demo');

  for (const [url, addBtn, nameVal, shot] of [
    ['/app/admin/departments', 'Add Department', 'Runbook Dept', 'ad-01-departments'],
    ['/app/admin/locations',   'Add Location',   'Runbook Site', 'ad-03-locations'],
  ] as const) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `shots/${shot}.png`, fullPage: true });

    await page.getByRole('button', { name: new RegExp(addBtn, 'i') }).click();
    await page.waitForTimeout(1500);
    const fields = await page.locator('input, select, textarea').evaluateAll(els =>
      els.map((e: any) => e.placeholder || e.name || '').filter(Boolean));
    console.log(`${addBtn} fields:`, fields.slice(0, 10).join(' | '));
    await page.screenshot({ path: `shots/${shot}-modal.png`, fullPage: true });

    // Fill every visible text input in the modal
    const dlg = page.locator('[role="dialog"]').first();
    const scope = (await dlg.count()) ? dlg : page;
    const inputs = scope.locator('input[type="text"], input:not([type])');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const ph = (await inputs.nth(i).getAttribute('placeholder')) || '';
      if (/search/i.test(ph)) continue;
      await inputs.nth(i).fill(/code/i.test(ph) ? 'RBK' : nameVal).catch(() => {});
    }
    const save = scope.getByRole('button', { name: /^(save|create|add)\b/i }).last();
    console.log('  save button:', (await save.innerText().catch(() => '?')).trim());
    await save.click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `shots/${shot}-created.png`, fullPage: true });
    const created = (await page.locator('body').innerText()).includes(nameVal);
    console.log(`  "${nameVal}" now listed:`, created);

    // Remove it again
    if (created) {
      const row = page.locator('tr', { hasText: nameVal }).first();
      const del = row.getByRole('button', { name: /delete/i }).first();
      if (await del.isVisible().catch(() => false)) {
        page.once('dialog', d => d.accept());
        await del.click();
        await page.waitForTimeout(4500);
        console.log('  removed:', !(await page.locator('body').innerText()).includes(nameVal));
      } else console.log('  no Delete button on the row');
    }
  }
});

test('station 2 — platform doctor registry (read-only)', async ({ page }) => {
  test.setTimeout(7 * 60 * 1000);
  const env = fs.readFileSync('../backend/.env', 'utf8');
  const pick = (k: string) => (env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, '');
  await login(page, pick('PLATFORM_ADMIN_EMAIL'), pick('PLATFORM_ADMIN_PASSWORD'));

  await page.goto('/app/platform/doctors', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'shots/ad-05-doctor-registry.png', fullPage: true });
  const body = await page.locator('body').innerText();
  console.log('registry lists Meera Iyer:', /Meera/.test(body));
  console.log('status values on screen:', [...new Set((body.match(/VERIFIED|PENDING|REJECTED/g) || []))].join(', '));
  const btns = [...new Set((await page.getByRole('button').allInnerTexts()).map(b => b.trim()).filter(Boolean))];
  console.log('actions available:', btns.slice(0, 12).join(' · '));
  console.log('NOTE: register/verify/affiliate NOT executed — the registry is global and has no delete route.');
});
