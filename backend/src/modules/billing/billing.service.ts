import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
import { sendEmail } from '../../common/utils/mailer';

function emailTemplate(title: string, body: string, orgName?: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">${orgName || 'Ayphen HMS'}</h1>
  </div>
  <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;margin:0 0 16px;">${title}</h2>
    <p style="color:#4b5563;line-height:1.6;">${body}</p>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
    This is an automated message from ${orgName || 'Ayphen HMS'}. Do not reply.
  </p>
</div>`;
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async createInvoice(tenantId: string, dto: any, createdById: string) {
    const subtotal = dto.lineItems.reduce((s: number, i: any) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);
    const discountAmount = dto.discountAmount || 0;
    const taxAmount = dto.taxAmount || 0;
    const netTotal = subtotal - discountAmount + taxAmount;

    // Invoice.locationId is NOT NULL. Fall back: staff primary -> patient
    // home -> first active tenant location.
    let locationId = dto.locationId;
    if (!locationId) {
      const staff = await this.prisma.tenantUser.findUnique({ where: { id: createdById }, select: { primaryLocationId: true } }).catch(() => null);
      locationId = staff?.primaryLocationId;
    }
    if (!locationId && dto.patientId) {
      const pat = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId }, select: { locationId: true } });
      locationId = pat?.locationId;
    }
    if (!locationId) {
      const loc = await this.prisma.tenantLocation.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } });
      locationId = loc?.id;
    }
    if (!locationId) throw new BadRequestException('No active location for this organization');

    // Verify the patient belongs to this tenant — otherwise the FK insert
    // dies with an opaque P2003 that the generic 500 handler masks.
    const patientExists = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId }, select: { id: true } });
    if (!patientExists) throw new BadRequestException('Patient not found in this organization');

    try {
      return await generateSequentialId(this.prisma, {
        table: 'Invoice',
        idColumn: 'invoiceNumber',
        prefix: `INV-${new Date().getFullYear()}-`,
        tenantId,
        callback: async (tx, invoiceNumber) => {
          return tx.invoice.create({
            data: {
              tenantId, invoiceNumber, locationId, patientId: dto.patientId,
              admissionId: dto.admissionId, doctorId: dto.doctorId, departmentId: dto.departmentId,
              invoiceType: dto.invoiceType || 'OPD', subtotal, discountAmount, taxAmount, netTotal,
              paidAmount: 0, status: 'DRAFT',
              insuranceProvider: dto.insuranceProvider, policyNumber: dto.policyNumber,
              createdById,
              lineItems: { create: dto.lineItems.map((i: any, idx: number) => ({ description: i.description, category: i.category, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), discountPct: Number(i.discountPct || 0), taxPct: Number(i.taxPct || 0), amount: Number(i.quantity) * Number(i.unitPrice), referenceId: i.referenceId, sortOrder: idx })) },
            },
            include: { lineItems: true },
          });
        },
      });
    } catch (err: any) {
      // Log the real Prisma error so we can see it in Render logs instead of
      // a generic "Internal server error" 500 from Nest.
      // eslint-disable-next-line no-console
      console.error('[billing.createInvoice] failed:', {
        code: err?.code, message: err?.message, meta: err?.meta,
        ctx: { tenantId, patientId: dto.patientId, locationId, createdById, itemCount: dto.lineItems?.length },
      });
      // Re-throw as a 400 with the message so the frontend shows something useful.
      throw new BadRequestException(err?.message || 'Failed to create invoice');
    }
  }

  // Returns a per-patient billing summary: outstanding balance, totals,
  // breakdown by line-item category (Consultation / Lab / Pharmacy / etc),
  // and the last 5 invoices. Used by the New Invoice modal so the billing
  // user sees what the patient already owes before creating another bill.
  async getPatientBillingSummary(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, patientId: true, firstName: true, lastName: true, mobile: true, email: true, gender: true, ageYears: true, dateOfBirth: true, bloodGroup: true },
    });
    if (!patient) return null;

    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, patientId },
      orderBy: { createdAt: 'desc' },
      include: { lineItems: { select: { category: true, amount: true } } },
    });

    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.netTotal), 0);
    const totalPaid = invoices.reduce((s, i) => s + Number(i.paidAmount), 0);
    const outstanding = invoices
      .filter(i => i.status !== 'CANCELLED')
      .reduce((s, i) => s + (Number(i.netTotal) - Number(i.paidAmount)), 0);

    // Category breakdown across all non-cancelled invoices.
    const byCategory: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.status === 'CANCELLED') continue;
      for (const li of inv.lineItems) {
        const key = li.category || 'OTHER';
        byCategory[key] = (byCategory[key] || 0) + Number(li.amount);
      }
    }

    const recent = invoices.slice(0, 5).map(i => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      invoiceType: i.invoiceType,
      status: i.status,
      netTotal: Number(i.netTotal),
      paidAmount: Number(i.paidAmount),
      balance: Math.max(Number(i.netTotal) - Number(i.paidAmount), 0),
      createdAt: i.createdAt,
    }));

    return {
      patient,
      totals: {
        invoicedCount: invoices.length,
        totalInvoiced,
        totalPaid,
        outstanding,
      },
      byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })),
      recent,
    };
  }

  // Revenue split by line-item category across a date range. Used by the
  // billing Reports view to show "where the money came from" — Doctor Fee,
  // Lab, Pharmacy, etc. Only finalized/paid/partial invoices count toward
  // realized revenue; cancelled invoices are excluded.
  async getRevenueByCategory(tenantId: string, query: any) {
    const { from, to, locationId } = query;
    const where: any = { tenantId, status: { notIn: ['CANCELLED', 'DRAFT'] } };
    if (locationId) where.locationId = locationId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }
    const invoices = await this.prisma.invoice.findMany({
      where,
      select: {
        id: true, paidAmount: true, netTotal: true,
        lineItems: { select: { category: true, amount: true } },
      },
    });

    const byCategory: Record<string, { invoiced: number; collected: number }> = {};
    let totalInvoiced = 0;
    let totalCollected = 0;
    for (const inv of invoices) {
      const collectionRatio = Number(inv.paidAmount) / (Number(inv.netTotal) || 1);
      for (const li of inv.lineItems) {
        const key = li.category || 'OTHER';
        const amount = Number(li.amount);
        byCategory[key] = byCategory[key] || { invoiced: 0, collected: 0 };
        byCategory[key].invoiced += amount;
        // Distribute the invoice's collected amount across line items
        // proportional to their contribution.
        byCategory[key].collected += amount * collectionRatio;
        totalInvoiced += amount;
      }
      totalCollected += Number(inv.paidAmount);
    }

    return {
      range: { from: from || null, to: to || null },
      totals: { invoiced: totalInvoiced, collected: totalCollected, invoiceCount: invoices.length },
      categories: Object.entries(byCategory)
        .map(([category, v]) => ({ category, invoiced: v.invoiced, collected: v.collected }))
        .sort((a, b) => b.invoiced - a.invoiced),
    };
  }

  // Recent consultations, lab orders, and prescriptions for a patient,
  // surfaced as candidate invoice line items so the billing user can add
  // them with one click instead of retyping. Skips anything already auto-
  // billed by the lab/pharmacy integrations (they stamp the source id in
  // InvoiceLineItem.referenceId).
  async getPatientUnbilledItems(tenantId: string, patientId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [billedRefs, consultations, labOrders, prescriptions] = await Promise.all([
      this.prisma.invoiceLineItem.findMany({
        where: { invoice: { tenantId, patientId } },
        select: { referenceId: true },
      }),
      this.prisma.consultation.findMany({
        where: { tenantId, patientId, status: 'COMPLETED', completedAt: { gte: since } },
        orderBy: { completedAt: 'desc' },
        select: { id: true, completedAt: true, chiefComplaint: true, doctorId: true },
      }),
      this.prisma.labOrder.findMany({
        where: { tenantId, patientId, orderedAt: { gte: since } },
        orderBy: { orderedAt: 'desc' },
        select: { id: true, orderNumber: true, orderedAt: true, items: { select: { id: true, testName: true, testCode: true } } },
      }),
      this.prisma.prescription.findMany({
        where: {
          tenantId, patientId,
          issuedAt: { gte: since },
          status: { notIn: ['CANCELLED'] },
        },
        orderBy: { issuedAt: 'desc' },
        select: { id: true, rxNumber: true, issuedAt: true, items: { select: { id: true, drugName: true, quantity: true, strength: true, drugId: true } } },
      }),
    ]);

    // refSet: exact match for lab (item id) and consultation (id).
    // refPrefixSet: pharmacy uses `${rxId}:${batchId}` so we match by prefix.
    const refSet = new Set(billedRefs.map(r => r.referenceId).filter((x): x is string => !!x));

    // Pull selling-price hints for the drugs in these prescriptions so the
    // pharmacy lines land with a price already filled in instead of ₹0.
    const drugIds = Array.from(new Set(prescriptions.flatMap(rx => rx.items.map(i => i.drugId).filter((id): id is string => !!id))));
    const drugBatchPrices: Record<string, number> = {};
    if (drugIds.length) {
      const batches = await this.prisma.drugBatch.findMany({
        where: { tenantId, drugId: { in: drugIds }, unitCost: { not: null }, quantityInStock: { gt: 0 } },
        select: { drugId: true, unitCost: true },
      });
      for (const b of batches) {
        if (!drugBatchPrices[b.drugId] && b.unitCost != null) {
          drugBatchPrices[b.drugId] = Math.round(Number(b.unitCost) * 1.3 * 100) / 100;
        }
      }
    }

    const items: Array<{
      sourceType: 'CONSULTATION' | 'LAB' | 'PHARMACY';
      sourceId: string;
      description: string;
      category: string;
      quantity: number;
      unitPrice: number;
      occurredAt: Date | null;
    }> = [];

    for (const c of consultations) {
      if (refSet.has(c.id)) continue;
      items.push({
        sourceType: 'CONSULTATION',
        sourceId: c.id,
        description: `Consultation${c.chiefComplaint ? ` — ${c.chiefComplaint}` : ''}`,
        category: 'CONSULTATION',
        quantity: 1,
        unitPrice: 0,
        occurredAt: c.completedAt,
      });
    }
    for (const lo of labOrders) {
      for (const li of lo.items) {
        if (refSet.has(li.id)) continue;
        items.push({
          sourceType: 'LAB',
          sourceId: li.id,
          description: `Lab — ${li.testName}${li.testCode ? ` (${li.testCode})` : ''}`,
          category: 'LAB',
          quantity: 1,
          unitPrice: 200, // matches lab.service.ts DEFAULT_LAB_TEST_PRICE
          occurredAt: lo.orderedAt,
        });
      }
    }
    for (const rx of prescriptions) {
      // Pharmacy auto-bill uses `${rxId}:${batchId}` — if ANY ref starts with
      // `${rx.id}:`, dispensing already happened and we don't surface this Rx.
      const dispensedRefPrefix = `${rx.id}:`;
      const alreadyDispensed = Array.from(refSet).some(r => r.startsWith(dispensedRefPrefix));
      if (alreadyDispensed) continue;
      for (const it of rx.items) {
        const unitPrice = it.drugId && drugBatchPrices[it.drugId] != null
          ? drugBatchPrices[it.drugId]
          : 50; // matches pharmacy.service.ts DEFAULT_DRUG_PRICE
        items.push({
          sourceType: 'PHARMACY',
          sourceId: rx.id,
          description: `Pharmacy — ${it.drugName}${it.strength ? ` ${it.strength}` : ''}`,
          category: 'PHARMACY',
          quantity: it.quantity ? Number(it.quantity) : 1,
          unitPrice,
          occurredAt: rx.issuedAt,
        });
      }
    }

    return { items, since };
  }

  // Patients with at least one non-cancelled invoice whose paidAmount < netTotal.
  // Used by the New Invoice modal to surface "who still owes us money" the
  // moment the patient picker is focused — before the user types anything.
  async getOutstandingPatients(tenantId: string, limit = 10) {
    const liveInvoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: { in: ['DRAFT', 'FINALIZED', 'PARTIAL'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        patientId: true,
        netTotal: true,
        paidAmount: true,
        createdAt: true,
        patient: { select: { id: true, patientId: true, firstName: true, lastName: true, mobile: true } },
      },
    });

    const byPatient = new Map<string, { patient: any; outstanding: number; lastInvoiceAt: Date; bills: number }>();
    for (const inv of liveInvoices) {
      const balance = Number(inv.netTotal) - Number(inv.paidAmount);
      if (balance <= 0) continue;
      const prev = byPatient.get(inv.patientId);
      if (prev) {
        prev.outstanding += balance;
        prev.bills += 1;
        if (inv.createdAt > prev.lastInvoiceAt) prev.lastInvoiceAt = inv.createdAt;
      } else {
        byPatient.set(inv.patientId, {
          patient: inv.patient,
          outstanding: balance,
          lastInvoiceAt: inv.createdAt,
          bills: 1,
        });
      }
    }

    return Array.from(byPatient.values())
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, limit)
      .map(r => ({
        ...r.patient,
        outstanding: r.outstanding,
        unpaidBills: r.bills,
        lastInvoiceAt: r.lastInvoiceAt,
      }));
  }

  async getInvoices(tenantId: string, query: any) {
    const { patientId, locationId, status, type, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (type) where.invoiceType = type;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' }, include: { lineItems: true, patient: { select: { patientId: true, firstName: true, lastName: true } } } }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getInvoice(tenantId: string, id: string) {
    const inv = await this.prisma.invoice.findFirst({ where: { id, tenantId }, include: { lineItems: true, payments: true, patient: true } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async finalizeInvoice(tenantId: string, id: string) {
    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({ where: { id, tenantId }, include: { lineItems: true, payments: true, patient: true } });
      if (!inv) throw new NotFoundException('Invoice not found');
      const updated = await tx.invoice.update({ where: { id }, data: { status: 'FINALIZED' }, include: { patient: true } });
      return updated;
    });

    // Non-blocking email notification to patient
    const patient = invoice.patient as any;
    if (patient?.email) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } });
      const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
      const invDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      sendEmail(
        patient.email,
        `Invoice #${invoice.invoiceNumber} - ${orgName}`,
        emailTemplate('Invoice Generated', `Dear ${patient.firstName} ${patient.lastName},<br><br>Your invoice at <strong>${orgName}</strong> has been finalized with the following details:<br><br><strong>Invoice Number:</strong> ${invoice.invoiceNumber}<br><strong>Amount:</strong> ₹${Number(invoice.netTotal).toFixed(2)}<br><strong>Date:</strong> ${invDate}<br><br>Please contact the billing desk for payment options or any queries regarding this invoice.`, orgName),
      ).catch((err) => console.error('Failed to send invoice email:', err));
    }

    return invoice;
  }

  async recordPayment(tenantId: string, invoiceId: string, dto: any, recordedById: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId }, include: { lineItems: true, payments: true, patient: true } });
      if (!inv) throw new NotFoundException('Invoice not found');
      if (inv.status === 'CANCELLED') throw new BadRequestException('Cannot pay cancelled invoice');
      const payment = await tx.payment.create({
        data: { tenantId, invoiceId, amount: dto.amount, paymentMethod: dto.paymentMethod, referenceNumber: dto.referenceNumber, bankName: dto.bankName, notes: dto.notes, recordedById },
      });
      const newPaid = Number(inv.paidAmount) + dto.amount;
      const balance = Number(inv.netTotal) - newPaid;
      const status = balance <= 0 ? 'PAID' : 'PARTIAL';
      await tx.invoice.update({ where: { id: invoiceId }, data: { paidAmount: newPaid, status } });
      return { payment, inv, newPaid, balance, status };
    });

    const { payment, inv, newPaid, balance, status } = result;
    const patient = inv.patient as any;
    if (patient?.email) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } });
      const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
      const paidOn = new Date(payment.paymentDate).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
      const body = `Dear ${patient.firstName || ''} ${patient.lastName || ''},<br><br>
        We have received your payment. Thank you.<br><br>
        <strong>Receipt Details</strong><br>
        Invoice Number: ${inv.invoiceNumber}<br>
        Payment Amount: ₹${Number(dto.amount).toFixed(2)}<br>
        Payment Method: ${dto.paymentMethod}${dto.referenceNumber ? ` (Ref: ${dto.referenceNumber})` : ''}<br>
        Paid On: ${paidOn}<br><br>
        <strong>Invoice Summary</strong><br>
        Net Total: ₹${Number(inv.netTotal).toFixed(2)}<br>
        Total Paid: ₹${Number(newPaid).toFixed(2)}<br>
        Balance Due: ₹${Math.max(0, balance).toFixed(2)}<br>
        Status: ${status}<br><br>
        ${balance <= 0 ? 'Your invoice is fully settled.' : 'A balance remains on your account. Please contact the billing desk.'}`;
      sendEmail(patient.email, `Payment Received - Invoice #${inv.invoiceNumber} - ${orgName}`, emailTemplate('Payment Receipt', body, orgName)).catch((err) =>
        // eslint-disable-next-line no-console
        console.error(`Failed to send payment receipt email to ${patient.email}:`, err),
      );
    }

    return payment;
  }

  async cancelInvoice(tenantId: string, id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({ where: { id, tenantId }, include: { lineItems: true, payments: true, patient: true } });
      if (!inv) throw new NotFoundException('Invoice not found');
      if (inv.status === 'PAID') throw new BadRequestException('Cannot cancel a fully paid invoice');
      return tx.invoice.update({ where: { id }, data: { status: 'CANCELLED', notes: reason } });
    });
  }

  async emailInvoice(tenantId: string, id: string, overrideEmail?: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { lineItems: true, patient: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const patient = invoice.patient as any;
    const to = overrideEmail || patient?.email;
    if (!to) throw new BadRequestException('No email address available for this patient');

    const invDate = new Date(invoice.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const itemsHtml = (invoice.lineItems || []).map((li: any) =>
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${li.description}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${li.quantity}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${Number(li.unitPrice).toFixed(2)}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${Number(li.amount).toFixed(2)}</td></tr>`
    ).join('');
    const body = `Dear ${patient?.firstName || ''} ${patient?.lastName || ''},<br><br>Please find your invoice details below:<br><br>
      <strong>Invoice Number:</strong> ${invoice.invoiceNumber}<br>
      <strong>Date:</strong> ${invDate}<br>
      <strong>Status:</strong> ${invoice.status}<br><br>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f3f4f6;"><th style="padding:6px 8px;text-align:left;">Item</th><th style="padding:6px 8px;text-align:right;">Qty</th><th style="padding:6px 8px;text-align:right;">Rate</th><th style="padding:6px 8px;text-align:right;">Amount</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="margin-top:12px;text-align:right;">
        <div>Subtotal: ₹${Number(invoice.subtotal).toFixed(2)}</div>
        <div>Discount: ₹${Number(invoice.discountAmount).toFixed(2)}</div>
        <div>Tax: ₹${Number(invoice.taxAmount).toFixed(2)}</div>
        <div style="font-size:16px;font-weight:bold;color:#0F766E;margin-top:6px;">Net Total: ₹${Number(invoice.netTotal).toFixed(2)}</div>
        <div>Paid: ₹${Number(invoice.paidAmount).toFixed(2)}</div>
        <div>Balance: ₹${(Number(invoice.netTotal) - Number(invoice.paidAmount)).toFixed(2)}</div>
      </div>
      <br>Please contact the billing desk for any queries.`;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } });
    const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
    const ok = await sendEmail(to, `Invoice #${invoice.invoiceNumber} - ${orgName}`, emailTemplate('Your Invoice', body, orgName));
    if (!ok) throw new BadRequestException('Email service is not configured. Contact administrator.');
    return { sent: true, to };
  }

  async addLineItem(tenantId: string, invoiceId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId }, include: { lineItems: true, payments: true, patient: true } });
      if (!inv) throw new NotFoundException('Invoice not found');
      const item = await tx.invoiceLineItem.create({
        data: { invoiceId, description: dto.description, category: dto.category, quantity: dto.quantity, unitPrice: dto.unitPrice, discountPct: dto.discountPct || 0, taxPct: dto.taxPct || 0, amount: Number(dto.quantity) * Number(dto.unitPrice), referenceId: dto.referenceId },
      });
      const allItems = await tx.invoiceLineItem.findMany({ where: { invoiceId } });
      const subtotal = allItems.reduce((s, i) => s + Number(i.amount), 0);
      await tx.invoice.update({ where: { id: invoiceId }, data: { subtotal, netTotal: subtotal } });
      return item;
    });
  }

  // Append a charge to the patient's current OPD visit invoice. Used by lab
  // (charges for ordered tests) and pharmacy (charges for dispensed drugs)
  // to roll their fees into the same draft bill the consultation created.
  //
  // - Idempotent: if a line item with this referenceId already exists for
  //   any of the patient's open invoices, the call is a no-op (so dispensing
  //   the same Rx twice or re-ordering the same lab won't double-bill).
  // - If no draft invoice exists yet (rare — patient was lab/pharma-charged
  //   before a consult was opened), creates a fresh OPD draft.
  // - Failures throw so the caller can decide whether to swallow; both
  //   integrations call this with try/catch to avoid blocking the primary
  //   workflow on a billing hiccup.
  async addChargeToOpenVisit(
    tenantId: string,
    patientId: string,
    lineItem: { description: string; category: string; quantity: number; unitPrice: number; referenceId: string },
    opts?: { locationId?: string; doctorId?: string; consultationId?: string },
  ) {
    // Idempotency: skip if any line item with this referenceId already exists
    // for this patient at this tenant.
    const existing = await this.prisma.invoiceLineItem.findFirst({
      where: {
        referenceId: lineItem.referenceId,
        invoice: { tenantId, patientId },
      },
      select: { id: true, invoiceId: true },
    });
    if (existing) return { skipped: true, invoiceId: existing.invoiceId, itemId: existing.id };

    // Find the most recent open invoice (DRAFT/PENDING) for this patient.
    // Prefer one already tied to the same consultation via a referenceId on
    // any of its line items.
    let invoice: { id: string; locationId: string } | null = null;
    if (opts?.consultationId) {
      const byConsult = await this.prisma.invoice.findFirst({
        where: {
          tenantId,
          patientId,
          status: { in: ['DRAFT', 'PENDING'] },
          lineItems: { some: { referenceId: opts.consultationId } },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, locationId: true },
      });
      invoice = byConsult;
    }
    if (!invoice) {
      invoice = await this.prisma.invoice.findFirst({
        where: { tenantId, patientId, status: { in: ['DRAFT', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, locationId: true },
      });
    }

    // No open invoice — create one with just this line item.
    if (!invoice) {
      const created = await this.createInvoice(
        tenantId,
        {
          patientId,
          locationId: opts?.locationId,
          doctorId: opts?.doctorId,
          invoiceType: 'OPD',
          lineItems: [{
            description: lineItem.description,
            category: lineItem.category,
            quantity: lineItem.quantity,
            unitPrice: lineItem.unitPrice,
            referenceId: lineItem.referenceId,
          }],
        },
        opts?.doctorId || 'system',
      );
      return { created: true, invoiceId: (created as any).id };
    }

    // Append the line item to the existing invoice and recompute totals.
    return this.addLineItem(tenantId, invoice.id, lineItem);
  }
}
