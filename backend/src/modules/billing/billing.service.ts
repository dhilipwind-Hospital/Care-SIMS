import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
import { sendEmail } from '../../common/utils/mailer';

function emailTemplate(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Ayphen HMS</h1>
  </div>
  <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;margin:0 0 16px;">${title}</h2>
    <p style="color:#4b5563;line-height:1.6;">${body}</p>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
    This is an automated message from Ayphen HMS. Do not reply.
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
    return generateSequentialId(this.prisma, {
      table: 'Invoice',
      idColumn: 'invoiceNumber',
      prefix: `INV-${new Date().getFullYear()}-`,
      tenantId,
      callback: async (tx, invoiceNumber) => {
        return tx.invoice.create({
          data: {
            tenantId, invoiceNumber, locationId: dto.locationId, patientId: dto.patientId,
            admissionId: dto.admissionId, doctorId: dto.doctorId, departmentId: dto.departmentId,
            invoiceType: dto.invoiceType || 'OPD', subtotal, discountAmount, taxAmount, netTotal,
            paidAmount: 0, status: 'DRAFT',
            insuranceProvider: dto.insuranceProvider, policyNumber: dto.policyNumber,
            createdById,
            lineItems: { create: dto.lineItems.map((i: any, idx: number) => ({ description: i.description, category: i.category, quantity: i.quantity, unitPrice: i.unitPrice, discountPct: i.discountPct || 0, taxPct: i.taxPct || 0, amount: Number(i.quantity) * Number(i.unitPrice), referenceId: i.referenceId, sortOrder: idx })) },
          },
          include: { lineItems: true },
        });
      },
    });
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
      const invDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      sendEmail(
        patient.email,
        `Invoice #${invoice.invoiceNumber} - Ayphen HMS`,
        emailTemplate('Invoice Generated', `Dear ${patient.firstName} ${patient.lastName},<br><br>Your invoice has been finalized with the following details:<br><br><strong>Invoice Number:</strong> ${invoice.invoiceNumber}<br><strong>Amount:</strong> ₹${Number(invoice.netTotal).toFixed(2)}<br><strong>Date:</strong> ${invDate}<br><br>Please contact the billing desk for payment options or any queries regarding this invoice.`),
      ).catch((err) => console.error('Failed to send invoice email:', err));
    }

    return invoice;
  }

  async recordPayment(tenantId: string, invoiceId: string, dto: any, recordedById: string) {
    return this.prisma.$transaction(async (tx) => {
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
      return payment;
    });
  }

  async cancelInvoice(tenantId: string, id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({ where: { id, tenantId }, include: { lineItems: true, payments: true, patient: true } });
      if (!inv) throw new NotFoundException('Invoice not found');
      if (inv.status === 'PAID') throw new BadRequestException('Cannot cancel a fully paid invoice');
      return tx.invoice.update({ where: { id }, data: { status: 'CANCELLED', notes: reason } });
    });
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
}
