import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
import { sendEmail } from '../../common/utils/mailer';
@Injectable()
export class RadiologyService {
  private readonly logger = new Logger(RadiologyService.name);
  constructor(private prisma: PrismaService) {}
  async listOrders(tenantId: string, status?: string, modality?: string) {
    const where: any = { tenantId }; if (status) where.status = status; if (modality) where.modality = modality;
    return this.prisma.radiologyOrder.findMany({ where, include: { results: true }, orderBy: { createdAt: 'desc' } });
  }
  async createOrder(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'RadiologyOrder',
      idColumn: 'orderNumber',
      prefix: 'RAD-',
      tenantId,
      callback: async (tx, orderNumber) => {
        return tx.radiologyOrder.create({ data: { tenantId, orderNumber, locationId: dto.locationId, patientId: dto.patientId, doctorId: dto.doctorId, consultationId: dto.consultationId, admissionId: dto.admissionId, modality: dto.modality, examType: dto.examType, bodyPart: dto.bodyPart, laterality: dto.laterality, priority: dto.priority||'ROUTINE', clinicalHistory: dto.clinicalHistory, contrast: dto.contrast||false, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null, status: 'ORDERED' } });
      },
    });
  }
  async getOrder(tenantId: string, id: string) {
    const o = await this.prisma.radiologyOrder.findFirst({ where: { id, tenantId }, include: { results: true } });
    if (!o) throw new NotFoundException('Order not found'); return o;
  }
  async updateOrder(tenantId: string, id: string, dto: any) {
    const order = await this.prisma.radiologyOrder.findFirst({ where: { id, tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'ORDERED') throw new BadRequestException('Can only edit orders in ORDERED status');
    return this.prisma.radiologyOrder.update({ where: { id, tenantId }, data: { modality: dto.modality, examType: dto.examType, bodyPart: dto.bodyPart, laterality: dto.laterality, priority: dto.priority, clinicalHistory: dto.clinicalHistory, contrast: dto.contrast, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : order.scheduledAt } });
  }

  async addResult(tenantId: string, userId: string, dto: any) {
    const order = await this.prisma.radiologyOrder.findFirst({ where: { id: dto.orderId, tenantId } }); if (!order) throw new NotFoundException('Radiology order not found');
    await this.prisma.radiologyOrder.update({ where: { id: dto.orderId, tenantId }, data: { status: 'REPORTED' } });
    const result = await this.prisma.radiologyResult.create({ data: { tenantId, orderId: dto.orderId, locationId: dto.locationId, findings: dto.findings, impression: dto.impression, recommendation: dto.recommendation, isCritical: dto.isCritical||false, imageUrls: dto.imageUrls||[], reportedById: userId, reportedAt: new Date(), status: 'REPORTED' } });
    this.notifyOnReport(tenantId, order, result).catch((err) => this.logger.error('Failed to send radiology report email', err as any));
    return result;
  }

  private async notifyOnReport(tenantId: string, order: any, result: any) {
    const [patient, doctor, tenant] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: order.patientId, tenantId }, select: { firstName: true, lastName: true, email: true } }),
      order.doctorId ? this.prisma.tenantUser.findFirst({ where: { id: order.doctorId, tenantId }, select: { firstName: true, lastName: true, email: true } }) : Promise.resolve(null),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } }),
    ]);
    const orgName = tenant?.tradeName || tenant?.legalName || 'your hospital';
    const examLabel = [order.modality, order.examType, order.bodyPart, order.laterality].filter(Boolean).join(' · ');
    const reportedAt = new Date(result.reportedAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
    const criticalBanner = result.isCritical
      ? `<div style="background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:10px 12px;border-radius:8px;margin-bottom:12px;font-weight:600;">⚠ Critical finding — please contact your doctor as soon as possible.</div>`
      : '';

    const wrap = (title: string, intro: string) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">${orgName}</h1>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          ${criticalBanner}
          <h2 style="color:#1f2937;margin:0 0 16px;">${title}</h2>
          <p style="color:#4b5563;line-height:1.6;">${intro}</p>
          <p style="color:#4b5563;font-size:13px;margin-top:12px;">
            <strong>Order #:</strong> ${order.orderNumber}<br/>
            <strong>Exam:</strong> ${examLabel || '-'}<br/>
            <strong>Reported:</strong> ${reportedAt}
          </p>
          ${result.impression ? `<h3 style="color:#0F766E;font-size:15px;margin:20px 0 0;">Impression</h3><p style="color:#4b5563;white-space:pre-line;margin:8px 0 0;">${result.impression}</p>` : ''}
          ${result.recommendation ? `<h3 style="color:#0F766E;font-size:15px;margin:20px 0 0;">Recommendation</h3><p style="color:#4b5563;white-space:pre-line;margin:8px 0 0;">${result.recommendation}</p>` : ''}
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Please contact your doctor to discuss this report.</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">This is an automated message from ${orgName}. Do not reply.</p>
      </div>`;

    if (patient?.email) {
      const subj = result.isCritical
        ? `URGENT: Your radiology report is ready - ${order.orderNumber} - ${orgName}`
        : `Your radiology report is ready - ${order.orderNumber} - ${orgName}`;
      sendEmail(patient.email, subj, wrap('Your radiology report is ready', `Dear ${patient.firstName || ''} ${patient.lastName || ''},<br/><br/>The report for your recent ${examLabel || 'imaging'} examination is now available.`)).catch((err) =>
        this.logger.error(`Failed to send radiology email to ${patient.email}`, err),
      );
    }
    if (result.isCritical && doctor?.email) {
      const subj = `CRITICAL Radiology Finding - ${order.orderNumber} - ${orgName}`;
      sendEmail(doctor.email, subj, wrap('Critical radiology finding', `A radiology report you ordered (#${order.orderNumber}) has been flagged as critical. Please review it immediately.`)).catch((err) =>
        this.logger.error(`Failed to send critical radiology email to ${doctor.email}`, err),
      );
    }
  }
  async validateResult(tenantId: string, id: string, userId: string) {
    const result = await this.prisma.radiologyResult.findFirst({ where: { id, tenantId } }); if (!result) throw new NotFoundException('Radiology result not found');
    return this.prisma.radiologyResult.update({ where: { id, tenantId }, data: { validatedById: userId, validatedAt: new Date(), status: 'VALIDATED' } });
  }

  async remove(tenantId: string, id: string) {
    const order = await this.prisma.radiologyOrder.findFirst({ where: { id, tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'COMPLETED' || order.status === 'VALIDATED') throw new BadRequestException('Cannot delete completed or validated orders');
    return this.prisma.radiologyOrder.delete({ where: { id } });
  }
}
