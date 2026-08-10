import { test, expect, Page } from '@playwright/test';

// Drives the Operation Theatre station of the demo script in the REAL UI and
// screenshots each step. Confirms (a) the seeded board/tiles/live-monitor render,
// and (b) captures the real Schedule-Surgery form so the script's field labels
// match what's actually on screen.
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
  await page.waitForTimeout(1500);
}

test('Operation Theatre — perform the station in the UI', async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  await login(page, 'admin@simsbox.demo');

  // --- Operation Theatre board ---
  await page.goto('/app/ot', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/ot-1-board.png', fullPage: true });

  const bodyText = await page.locator('body').innerText();
  const has = (s: string) => bodyText.includes(s);
  console.log('BOARD CHECK:',
    'Rohan=', has('Rohan'), '| Karthik=', has('Karthik'), '| Ananya=', has('Ananya'),
    '| Meera=', has('Meera'), '| Rahul=', has('Rahul'),
    '| Appendectomy=', has('Appendectomy'), '| Hernia=', has('Hernia'), '| Knee=', has('Knee'));

  // --- Op Note on the completed booking ---
  const opNote = page.getByRole('button', { name: /Op Note/i }).first();
  if (await opNote.isVisible().catch(() => false)) {
    await opNote.click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'shots/ot-2-opnote.png', fullPage: true });
    console.log('OP NOTE opened. arthroplasty text present=', (await page.locator('body').innerText()).toLowerCase().includes('arthro'));
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
  } else {
    console.log('OP NOTE button not found on board');
  }

  // --- Schedule Surgery: open the modal, capture its REAL fields ---
  await page.goto('/app/ot', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const schedBtn = page.getByRole('button', { name: /Schedule Surgery/i }).first();
  await schedBtn.click().catch(() => {});
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'shots/ot-3-schedule-form.png', fullPage: true });

  // Log the real form structure so the script can match on-screen labels exactly.
  const labels = await page.locator('label').allInnerTexts().catch(() => []);
  const placeholders = await page.locator('input,textarea').evaluateAll(
    els => els.map(e => (e as HTMLInputElement).placeholder).filter(Boolean)).catch(() => []);
  const selectLabels = await page.locator('select').count().catch(() => 0);
  const btns = await page.getByRole('button').allInnerTexts().catch(() => []);
  console.log('FORM LABELS:', JSON.stringify(labels));
  console.log('FORM PLACEHOLDERS:', JSON.stringify(placeholders));
  console.log('FORM <select> count:', selectLabels);
  console.log('FORM BUTTONS:', JSON.stringify([...new Set(btns)].slice(0, 20)));

  // Best-effort live create (won't fail the run if the modal shape differs).
  let created = false;
  try {
    const dlg = page.locator('[role="dialog"], .modal, form').last();
    // Procedure text
    const proc = dlg.locator('input[placeholder*="rocedure" i], input[name*="procedure" i]').first();
    if (await proc.isVisible().catch(() => false)) await proc.fill('Cataract Surgery (Phaco)');
    // Try selects (patient/room/surgeon/anaesthesia) by option text
    const selects = dlg.locator('select');
    const n = await selects.count();
    for (let i = 0; i < n; i++) {
      const opts = await selects.nth(i).locator('option').allInnerTexts().catch(() => []);
      const pick = opts.find(o => /Fatima|OT-2|Rahul|Local/i.test(o));
      if (pick) await selects.nth(i).selectOption({ label: pick }).catch(() => {});
    }
    await page.screenshot({ path: 'shots/ot-4-form-filled.png', fullPage: true });
    const createBtn = dlg.getByRole('button', { name: /Create|Schedule|Save|Confirm/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click().catch(() => {});
      await page.waitForTimeout(2500);
      await page.screenshot({ path: 'shots/ot-5-after-create.png', fullPage: true });
      created = !(await page.locator('[role="dialog"]').first().isVisible().catch(() => false));
    }
  } catch (e: any) { console.log('live-create best-effort error:', e.message?.slice(0, 80)); }
  console.log('LIVE CREATE performed & modal closed =', created);

  // --- OT Live Monitor ---
  await page.goto('/app/ot/live', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/ot-6-live-monitor.png', fullPage: true });
  const liveText = await page.locator('body').innerText();
  console.log('LIVE MONITOR:',
    'OT-1=', liveText.includes('OT-1'), '| OT-2=', liveText.includes('OT-2'),
    '| IN OPERATION=', /IN[ _]?OPERATION/i.test(liveText), '| Appendectomy=', liveText.includes('Appendectomy'),
    '| Rohan=', liveText.includes('Rohan'));

  // Assertions on the parts that must render (the seeded data).
  expect(has('Rohan') && has('Karthik') && has('Ananya')).toBe(true);
  expect(has('Meera') && has('Rahul')).toBe(true);
});
