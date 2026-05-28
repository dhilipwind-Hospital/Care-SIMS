import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
import { sendEmail } from '../../common/utils/mailer';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    const validity = new Date(); validity.setDate(validity.getDate() + 30);
    const rx: any = await generateSequentialId(this.prisma, {
      table: 'Prescription',
      idColumn: 'rxNumber',
      prefix: `RX-${Date.now()}-`,
      tenantId,
      padLength: 5,
      callback: async (tx, rxNumber) => {
        return tx.prescription.create({
          data: { tenantId, rxNumber, locationId: dto.locationId, consultationId: dto.consultationId, patientId: dto.patientId, doctorId: dto.doctorId, validityDate: validity, notes: dto.notes, status: 'PENDING', items: { create: dto.items.map((item: any, i: number) => ({ drugName: item.drugName, genericName: item.genericName, dosageForm: item.dosageForm, strength: item.strength, dosage: item.dosage, frequency: item.frequency, durationDays: item.durationDays, route: item.route, instructions: item.instructions, quantity: item.quantity, refillsAllowed: item.refillsAllowed || 0, isControlled: item.isControlled || false, status: 'PENDING', sortOrder: i })) } },
          include: { items: true, patient: { select: { patientId: true, firstName: true, lastName: true, email: true } } },
        });
      },
    });

    const patientEmail = rx?.patient?.email;
    if (patientEmail) {
      try {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } });
        const orgName = tenant?.tradeName || tenant?.legalName || 'your hospital';
        const doctor = dto.doctorId ? await this.prisma.tenantUser.findFirst({ where: { id: dto.doctorId, tenantId }, select: { firstName: true, lastName: true } }) : null;
        const doctorName = doctor ? `Dr. ${doctor.firstName} ${doctor.lastName || ''}`.trim() : 'your doctor';
        const itemsHtml = (rx.items || []).map((it: any) =>
          `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${it.drugName}${it.strength ? ' ' + it.strength : ''}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${it.dosage || '-'}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${it.frequency || '-'}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${it.durationDays ? it.durationDays + ' days' : '-'}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${it.quantity}</td></tr>`
        ).join('');
        const validityStr = new Date(validity).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:20px;">${orgName}</h1>
            </div>
            <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
              <h2 style="color:#1f2937;margin:0 0 16px;">Your prescription is ready</h2>
              <p style="color:#4b5563;line-height:1.6;">
                Dear ${rx.patient?.firstName || ''} ${rx.patient?.lastName || ''},<br/><br/>
                ${doctorName} has issued a prescription for you. Please collect your medications from our pharmacy or any partner pharmacy of your choice.
              </p>
              <p style="color:#4b5563;font-size:13px;">
                <strong>Prescription #:</strong> ${rx.rxNumber}<br/>
                <strong>Valid until:</strong> ${validityStr}
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
                <thead><tr style="background:#f3f4f6;"><th style="padding:6px 8px;text-align:left;">Medication</th><th style="padding:6px 8px;text-align:left;">Dosage</th><th style="padding:6px 8px;text-align:left;">Frequency</th><th style="padding:6px 8px;text-align:left;">Duration</th><th style="padding:6px 8px;text-align:right;">Qty</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              ${dto.notes ? `<p style="color:#4b5563;font-size:13px;margin-top:12px;"><strong>Doctor's Notes:</strong> ${dto.notes}</p>` : ''}
              <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Please follow the dosage instructions strictly. If you experience side effects, contact your doctor immediately.</p>
            </div>
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">This is an automated message from ${orgName}. Do not reply.</p>
          </div>
        `;
        sendEmail(patientEmail, `Prescription Ready - ${rx.rxNumber} - ${orgName}`, html).catch((err) =>
          this.logger.error(`Failed to send prescription email to ${patientEmail}`, err),
        );
      } catch (err) {
        this.logger.error('Error preparing prescription email', err as any);
      }
    }

    return rx;
  }

  async findAll(tenantId: string, query: any) {
    const { patientId, doctorId, status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({ where, skip, take: Number(limit), orderBy: { issuedAt: 'desc' }, include: { items: true, patient: { select: { patientId: true, firstName: true, lastName: true } } } }),
      this.prisma.prescription.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const rx = await this.prisma.prescription.findFirst({ where: { id, tenantId }, include: { items: true, patient: true } });
    if (!rx) throw new NotFoundException('Prescription not found');
    return rx;
  }

  async sendToPharmacy(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.findFirst({ where: { id, tenantId } });
      if (!rx) throw new NotFoundException('Prescription not found');
      return tx.prescription.update({ where: { id }, data: { status: 'SENT_TO_PHARMACY', sentToPharmacyAt: new Date() } });
    });
  }

  async cancel(tenantId: string, id: string, reason: string, cancelledById: string) {
    return this.prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.findFirst({ where: { id, tenantId } });
      if (!rx) throw new NotFoundException('Prescription not found');
      return tx.prescription.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById, cancellationReason: reason } });
    });
  }

  async updatePrescriptionStatus(tenantId: string, id: string, status: string) {
    return this.prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.findFirst({ where: { id, tenantId } });
      if (!rx) throw new NotFoundException('Prescription not found');
      return tx.prescription.update({ where: { id }, data: { status } });
    });
  }
}
