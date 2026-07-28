import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// FINANCIAL INTEGRITY — invoice math, payment-status transitions, and the
// paidAmount-vs-payments reconciliation invariant, including a concurrency
// (double-payment) race. Pure API, live against Apple (org.json).
//
// THE INVARIANT: for any non-cancelled invoice, paidAmount === Σ(payments.amount)
// and the status matches paidAmount vs netTotal. A lost update under concurrent
// payments (read-modify-write without a row lock) would break the first half.

const cfg = JSON.parse(readFileSync(new URL('./org.json', import.meta.url), 'utf8'));
const API = cfg.api as string;

async function api(method: string, path: string, token: string | null, body?: any) {
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(API + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(60000),
      });
      return { s: r.status, j: (await r.json().catch(() => ({}))) as any };
    } catch (e) { if (i === 3) throw e; await new Promise(r => setTimeout(r, 3000)); }
  }
  return { s: 0, j: {} as any };
}
const arr = (r: any) => {
  const j = (r && typeof r === 'object' && 's' in r && 'j' in r) ? r.j : r;
  return Array.isArray(j) ? j : (j?.data?.data || j?.data || []);
};
const unwrap = (r: any) => (r?.j?.data ?? r?.j);
const login = async (email: string) => (await api('POST', '/auth/login', null, { email, password: cfg.password })).j.accessToken as string;
const round2 = (n: number) => Math.round(Number(n) * 100) / 100;

let billing: string, admin: string, patientId: string;

test.beforeAll(async () => {
  billing = await login(cfg.logins.billing);
  admin = await login(cfg.logins.admin);
  patientId = arr(await api('GET', '/patients?limit=5', admin))[0]?.id;
});

async function newInvoice(net: number, note: string) {
  const created = await api('POST', '/billing/invoices', billing, {
    patientId, invoiceType: 'OPD', notes: note,
    lineItems: [{ description: note, category: 'CONSULTATION', quantity: 1, unitPrice: net }],
  });
  const inv = unwrap(created);
  expect(inv?.id, `invoice create failed (${created.s}): ${JSON.stringify(created.j).slice(0, 150)}`).toBeTruthy();
  return inv;
}
const getInvoice = async (id: string) => unwrap(await api('GET', `/billing/invoices/${id}`, admin));
const pay = (id: string, amount: number) => api('POST', `/billing/invoices/${id}/payments`, billing, { amount, paymentMethod: 'CASH' });
const sumPayments = (inv: any) => round2((inv.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0));

test('invoice math — net = subtotal − discount + tax, starts DRAFT unpaid', async () => {
  test.skip(!patientId, 'no Apple patient');
  const created = await api('POST', '/billing/invoices', billing, {
    patientId, invoiceType: 'OPD', notes: 'E2E math', discountAmount: 50, taxAmount: 90,
    lineItems: [
      { description: 'Consultation', category: 'CONSULTATION', quantity: 1, unitPrice: 500 },
      { description: 'Dressing', category: 'PROCEDURE', quantity: 2, unitPrice: 125 },
    ],
  });
  const inv = unwrap(created);
  expect(inv?.id).toBeTruthy();
  const subtotal = 1 * 500 + 2 * 125; // 750
  expect(round2(inv.subtotal)).toBe(750);
  expect(round2(inv.netTotal), 'netTotal must equal subtotal − discount + tax').toBe(750 - 50 + 90);
  expect(round2(inv.paidAmount)).toBe(0);
  expect(inv.status).toBe('DRAFT');
});

test('payment status transitions — DRAFT → PARTIAL → PAID, paidAmount reconciles at each step', async () => {
  test.skip(!patientId, 'no Apple patient');
  const inv = await newInvoice(1000, 'E2E transitions');

  const p1 = await pay(inv.id, 400);
  expect(p1.s, `first payment failed (${p1.s})`).toBeLessThan(400);
  let cur = await getInvoice(inv.id);
  expect(round2(cur.paidAmount)).toBe(400);
  expect(round2(cur.paidAmount)).toBe(sumPayments(cur));
  expect(cur.status).toBe('PARTIAL');

  await pay(inv.id, 600);
  cur = await getInvoice(inv.id);
  expect(round2(cur.paidAmount)).toBe(1000);
  expect(round2(cur.paidAmount)).toBe(sumPayments(cur));
  expect(cur.status).toBe('PAID');
});

test('payment concurrency — 4 simultaneous payments must all count (no lost update)', async () => {
  test.skip(!patientId, 'no Apple patient');
  const inv = await newInvoice(1000, 'E2E race');

  // Four ₹250 payments fired together. Each is its own request/transaction.
  const results = await Promise.all([pay(inv.id, 250), pay(inv.id, 250), pay(inv.id, 250), pay(inv.id, 250)]);
  const ok = results.filter(r => r.s < 400).length;
  expect(ok, 'all four payment requests should be accepted').toBe(4);

  const cur = await getInvoice(inv.id);
  const paid = round2(cur.paidAmount);
  const summed = sumPayments(cur);
  // THE integrity assertion: the invoice's paidAmount must equal the money it
  // actually recorded. A lost update leaves paidAmount < Σ(payments).
  expect(paid,
    `LOST UPDATE: invoice records ₹${summed} in payments but paidAmount=₹${paid} — concurrent payments were clobbered`
  ).toBe(summed);
  expect(summed, 'all four ₹250 payments should be persisted').toBe(1000);
  expect(cur.status).toBe('PAID');
});

test('audit — existing app-created invoices keep paidAmount === Σ(payments)', async () => {
  const invoices = arr(await api('GET', '/billing/invoices?limit=100', admin))
    .filter((i: any) => i.status !== 'CANCELLED');
  test.skip(invoices.length === 0, 'no invoices to audit');
  const mismatches: string[] = [];
  let audited = 0;
  for (const row of invoices.slice(0, 40)) {
    const inv = await getInvoice(row.id);
    if (!inv) continue;
    // Header math (always maintained by createInvoice) — safe to assert on all.
    expect(round2(inv.netTotal)).toBe(round2(Number(inv.subtotal) - Number(inv.discountAmount) + Number(inv.taxAmount)));
    // Reconciliation only for invoices that have recorded payments (app-created).
    if ((inv.payments || []).length > 0) {
      audited++;
      if (round2(inv.paidAmount) !== sumPayments(inv)) {
        mismatches.push(`${inv.invoiceNumber || inv.id.slice(0, 8)}: paidAmount=${round2(inv.paidAmount)} vs Σpayments=${sumPayments(inv)}`);
      }
    }
  }
  console.log(`audited ${audited} paid invoices`);
  expect(mismatches, `paidAmount/payments mismatches found:\n${mismatches.join('\n')}`).toHaveLength(0);
});
