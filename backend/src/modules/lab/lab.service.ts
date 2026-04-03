import { Injectable, NotFoundException } from '@nestjs/common';
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
export class LabService {
  constructor(private prisma: PrismaService) {}

  async createOrder(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'LabOrder',
      idColumn: 'orderNumber',
      prefix: `LAB-${Date.now()}-`,
      tenantId,
      padLength: 5,
      callback: async (tx, orderNumber) => {
        return tx.labOrder.create({
          data: { tenantId, orderNumber, locationId: dto.locationId, consultationId: dto.consultationId, patientId: dto.patientId, doctorId: dto.doctorId, priority: dto.priority || 'ROUTINE', fastingRequired: dto.fastingRequired || false, clinicalNotes: dto.clinicalNotes, status: 'ORDERED', items: { create: dto.tests.map((t: any) => ({ testCode: t.testCode, testName: t.testName, category: t.category, urgency: t.urgency || 'ROUTINE', status: 'PENDING' })) } },
          include: { items: true, patient: { select: { patientId: true, firstName: true, lastName: true } } },
        });
      },
    });
  }

  async getOrders(tenantId: string, query: any) {
    const { patientId, locationId, status, priority, date, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (date) { const d = new Date(date); const n = new Date(d); n.setDate(d.getDate() + 1); where.orderedAt = { gte: d, lt: n }; }
    const [data, total] = await Promise.all([
      this.prisma.labOrder.findMany({ where, skip, take: Number(limit), orderBy: { orderedAt: 'desc' }, include: { items: true, patient: { select: { patientId: true, firstName: true, lastName: true } } } }),
      this.prisma.labOrder.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getOrder(tenantId: string, id: string) {
    const o = await this.prisma.labOrder.findFirst({ where: { id, tenantId }, include: { items: true, results: { include: { items: true } }, patient: true } });
    if (!o) throw new NotFoundException('Lab order not found');
    return o;
  }

  async updateOrderStatus(tenantId: string, id: string, status: string) {
    await this.getOrder(tenantId, id);
    return this.prisma.labOrder.update({ where: { id }, data: { status } });
  }

  async enterResult(tenantId: string, orderId: string, dto: any, techId: string) {
    const order = await this.getOrder(tenantId, orderId);
    const hasCritical = dto.items?.some((i: any) => i.flag === 'CRITICAL' || i.flag === 'CRITICAL_HIGH' || i.flag === 'CRITICAL_LOW' || i.flag === 'PANIC');
    const result = await this.prisma.labResult.create({
      data: { tenantId, labOrderId: orderId, locationId: dto.locationId, notes: dto.notes, isCritical: hasCritical || false, status: 'PENDING_VALIDATION', items: { create: dto.items.map((i: any, idx: number) => ({ testName: i.testName, resultValue: i.resultValue, resultUnit: i.resultUnit, refRangeLow: i.refRangeLow, refRangeHigh: i.refRangeHigh, refRangeText: i.refRangeText, flag: i.flag, method: i.method, analyzer: i.analyzer, sortOrder: idx })) } },
      include: { items: true },
    });

    // Non-blocking: if any result is critical, email the ordering doctor
    if (hasCritical) {
      const criticalItems = dto.items.filter((i: any) => ['CRITICAL', 'CRITICAL_HIGH', 'CRITICAL_LOW', 'PANIC'].includes(i.flag));
      const patientName = order.patient ? `${(order.patient as any).firstName} ${(order.patient as any).lastName}` : 'Unknown Patient';
      this.prisma.labOrder.findFirst({ where: { id: orderId }, select: { doctorId: true } })
        .then(async (labOrder) => {
          if (!labOrder?.doctorId) return;
          const doctor = await this.prisma.doctorRegistry.findUnique({ where: { id: labOrder.doctorId }, select: { email: true, firstName: true } });
          if (doctor?.email) {
            const criticalList = criticalItems.map((i: any) => `<strong>${i.testName}:</strong> ${i.resultValue} ${i.resultUnit || ''} (${i.flag})`).join('<br>');
            sendEmail(
              doctor.email,
              'CRITICAL Lab Result Alert - Ayphen HMS',
              emailTemplate('CRITICAL Lab Result Alert', `Dear Dr. ${doctor.firstName},<br><br>A critical lab result has been entered that requires your immediate attention.<br><br><strong>Patient:</strong> ${patientName}<br><strong>Order:</strong> ${order.orderNumber}<br><br>${criticalList}<br><br>Please review these results at your earliest convenience.`),
            ).catch((err) => console.error('Failed to send critical lab result email:', err));
          }
        })
        .catch((err) => console.error('Failed to look up doctor for critical lab email:', err));
    }

    return result;
  }

  async validateResult(tenantId: string, resultId: string, validatedById: string) {
    const result = await this.prisma.labResult.findFirst({ where: { id: resultId, tenantId } });
    if (!result) throw new NotFoundException('Lab result not found');
    const updated = await this.prisma.labResult.update({ where: { id: resultId }, data: { status: 'VALIDATED', validatedById, validatedAt: new Date() } });
    await this.prisma.labOrder.update({ where: { id: result.labOrderId }, data: { status: 'RESULTED' } });
    return updated;
  }

  async getResults(tenantId: string, query: any) {
    const { patientId, orderId, status } = query;
    const where: any = { tenantId };
    if (patientId) {
      const orders = await this.prisma.labOrder.findMany({ where: { tenantId, patientId }, select: { id: true } });
      where.labOrderId = { in: orders.map(o => o.id) };
    }
    if (orderId) where.labOrderId = orderId;
    if (status) where.status = status;
    return this.prisma.labResult.findMany({ where, orderBy: { createdAt: 'desc' }, include: { items: true, labOrder: { select: { orderNumber: true, patientId: true, orderedAt: true } } } });
  }

  async printResult(tenantId: string, resultId: string) {
    const result = await this.prisma.labResult.findFirst({
      where: { id: resultId, tenantId },
      include: { items: { orderBy: { sortOrder: 'asc' } }, labOrder: { include: { patient: { select: { patientId: true, firstName: true, lastName: true, gender: true, ageYears: true, mobile: true } } } } },
    });
    if (!result) throw new NotFoundException('Result not found');
    return { ...result, printedAt: new Date() };
  }
}
