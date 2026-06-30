import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';
import { generateSequentialId } from '../../common/utils/id-generator';
import { sendEmail } from '../../common/utils/mailer';

// Same shell as triage/admissions — kept inline to avoid a shared dependency.
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
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);
  constructor(private prisma: PrismaService, private ws: WsGateway) {}

  async register(tenantId: string, dto: any, createdById: string) {
    const visit = await generateSequentialId(this.prisma, {
      table: 'EmergencyVisit',
      idColumn: 'visitNumber',
      prefix: `ED-${new Date().getFullYear()}-`,
      tenantId,
      padLength: 5,
      callback: async (tx, visitNumber) => {
        const created = await tx.emergencyVisit.create({
          data: {
            tenantId, visitNumber, locationId: dto.locationId || '', patientId: dto.patientId,
            triageCategory: dto.triageCategory || 'GREEN',
            chiefComplaint: dto.chiefComplaint,
            arrivalMode: dto.arrivalMode || 'WALK_IN',
            arrivalTime: dto.arrivalTime ? new Date(dto.arrivalTime) : new Date(),
            vitalsOnArrival: dto.vitalsOnArrival || null,
            gcsOnArrival: dto.gcsOnArrival || null,
            isMlc: dto.isMlc || false,
            mlcNumber: dto.mlcNumber || null,
            policeStation: dto.policeStation || null,
            broughtBy: dto.broughtBy || null,
            broughtByRelation: dto.broughtByRelation || null,
            broughtByPhone: dto.broughtByPhone || null,
            status: 'WAITING', createdById,
          },
          include: { patient: { select: { firstName: true, lastName: true, patientId: true, gender: true, ageYears: true } } },
        });
        this.ws.emitToTenant(tenantId, 'ed:new-patient', { visit: created });
        return created;
      },
    });

    // Fire-and-forget patient confirmation email with visit number, triage
    // category, and next-steps. Non-blocking — registration itself must never
    // fail because SMTP is down.
    this.sendEmergencyEmails(tenantId, visit).catch((err) => {
      this.logger.error(`Emergency registration email dispatch failed: ${err?.message || err}`);
    });

    return visit;
  }

  // Compose + send patient confirmation email for a new ED registration.
  // Non-blocking. Skips silently if the patient has no email on file.
  private async sendEmergencyEmails(tenantId: string, visit: any): Promise<void> {
    const [patient, doctor, tenant] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: visit.patientId },
        select: { firstName: true, lastName: true, patientId: true, email: true },
      }),
      visit.assignedDoctorId
        ? this.prisma.doctorRegistry.findUnique({
            where: { id: visit.assignedDoctorId },
            select: { firstName: true, lastName: true, pgSpecialization: true },
          })
        : null,
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tradeName: true, legalName: true },
      }),
    ]);

    const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
    const patientName = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || '(unnamed)';
    const triage = (visit.triageCategory || 'GREEN').toUpperCase();

    const badge =
      triage === 'RED'    ? '🚨 RED — IMMEDIATE'      :
      triage === 'YELLOW' ? '🟡 YELLOW — URGENT'      :
      triage === 'BLACK'  ? '⚫ BLACK — NON-URGENT'   :
                            '🟢 GREEN — STABLE';

    const nextSteps =
      triage === 'RED'
        ? 'You are being seen immediately by our emergency team. Please stay with the staff member assisting you.'
        : triage === 'YELLOW'
        ? 'A doctor will see you shortly. Please remain in the waiting area and alert a staff member if your condition worsens.'
        : 'Please remain in the waiting area. You will be called for assessment in turn. Inform a nurse if your symptoms change.';

    // Patient confirmation — only if we have an email on file.
    if (patient?.email) {
      const subject = `🏥 ED Registration Confirmed — ${patientName} — ${orgName}`;
      const body = `Dear ${patient.firstName || ''},<br/><br/>
Your visit to the Emergency Department at <strong>${orgName}</strong> has been registered.<br/><br/>
<strong>Visit Number:</strong> ${visit.visitNumber}<br/>
<strong>Patient:</strong> ${patientName} (MRN ${patient.patientId || '—'})<br/>
<strong>Chief Complaint:</strong> ${visit.chiefComplaint || '—'}<br/>
<strong>Triage Category:</strong> ${badge}<br/>
${doctor ? `<strong>Assigned Doctor:</strong> Dr ${doctor.firstName || ''} ${doctor.lastName || ''}${doctor.pgSpecialization ? ` (${doctor.pgSpecialization})` : ''}<br/>` : ''}
<br/>
<strong>What to do next:</strong><br/>
${nextSteps}<br/><br/>
Please keep your visit number handy for any follow-up.`;
      sendEmail(patient.email, subject, emailTemplate('Emergency Registration Confirmed', body, orgName))
        .catch((err) => this.logger.error(`Emergency patient confirm email failed: ${err?.message || err}`));
    }
  }

  async getActive(tenantId: string, locationId?: string) {
    const where: any = { tenantId, status: { notIn: ['DISCHARGED', 'ADMITTED', 'TRANSFERRED', 'EXPIRED'] } };
    if (locationId) where.locationId = locationId;
    return this.prisma.emergencyVisit.findMany({
      where,
      orderBy: [{ triageCategory: 'asc' }, { arrivalTime: 'asc' }],
      include: { patient: { select: { firstName: true, lastName: true, patientId: true, gender: true, ageYears: true, mobile: true } } },
    });
  }

  async getAll(tenantId: string, query: any) {
    const { status, triage, from, to, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (status) where.status = status;
    if (triage) where.triageCategory = triage;
    if (from || to) { where.arrivalTime = {}; if (from) where.arrivalTime.gte = new Date(from); if (to) where.arrivalTime.lte = new Date(to); }
    const [data, total] = await Promise.all([
      this.prisma.emergencyVisit.findMany({ where, skip, take: Number(limit), orderBy: { arrivalTime: 'desc' }, include: { patient: { select: { firstName: true, lastName: true, patientId: true, gender: true } } } }),
      this.prisma.emergencyVisit.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getOne(tenantId: string, id: string) {
    const visit = await this.prisma.emergencyVisit.findFirst({ where: { id, tenantId }, include: { patient: true } });
    if (!visit) throw new NotFoundException('Emergency visit not found');
    return visit;
  }

  async triage(tenantId: string, id: string, dto: any) {
    const visit = await this.prisma.emergencyVisit.findFirst({ where: { id, tenantId } });
    if (!visit) throw new NotFoundException('Emergency visit not found');
    const updated = await this.prisma.emergencyVisit.update({
      where: { id },
      data: {
        triageCategory: dto.triageCategory,
        vitalsOnArrival: dto.vitalsOnArrival || visit.vitalsOnArrival,
        gcsOnArrival: dto.gcsOnArrival ?? visit.gcsOnArrival,
      },
    });
    this.ws.emitToTenant(tenantId, 'ed:triage-updated', { visit: updated });
    return updated;
  }

  async assignDoctor(tenantId: string, id: string, dto: any) {
    const visit = await this.prisma.emergencyVisit.findFirst({ where: { id, tenantId } });
    if (!visit) throw new NotFoundException('Emergency visit not found');
    return this.prisma.emergencyVisit.update({
      where: { id },
      data: {
        assignedDoctorId: dto.doctorId,
        assignedBedId: dto.bedId || null,
        status: 'BEING_SEEN',
      },
    });
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const visit = await this.prisma.emergencyVisit.findFirst({ where: { id, tenantId } });
    if (!visit) throw new NotFoundException('Emergency visit not found');
    return this.prisma.emergencyVisit.update({ where: { id }, data: { status } });
  }

  async disposition(tenantId: string, id: string, dto: any) {
    const visit = await this.prisma.emergencyVisit.findFirst({ where: { id, tenantId } });
    if (!visit) throw new NotFoundException('Emergency visit not found');
    return this.prisma.emergencyVisit.update({
      where: { id },
      data: {
        disposition: dto.disposition,
        dispositionTime: new Date(),
        admissionId: dto.admissionId || null,
        status: dto.disposition,
        notes: dto.notes || visit.notes,
      },
    });
  }

  async dashboard(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    const active = await this.prisma.emergencyVisit.findMany({
      where: { ...where, status: { notIn: ['DISCHARGED', 'ADMITTED', 'TRANSFERRED', 'EXPIRED'] } },
    });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayTotal = await this.prisma.emergencyVisit.count({ where: { ...where, arrivalTime: { gte: today } } });

    return {
      activeCount: active.length,
      todayTotal,
      byTriage: {
        RED: active.filter(v => v.triageCategory === 'RED').length,
        YELLOW: active.filter(v => v.triageCategory === 'YELLOW').length,
        GREEN: active.filter(v => v.triageCategory === 'GREEN').length,
        BLACK: active.filter(v => v.triageCategory === 'BLACK').length,
      },
      byStatus: {
        WAITING: active.filter(v => v.status === 'WAITING').length,
        BEING_SEEN: active.filter(v => v.status === 'BEING_SEEN').length,
        UNDER_OBSERVATION: active.filter(v => v.status === 'UNDER_OBSERVATION').length,
      },
      avgWaitMins: active.length > 0 ? Math.round(active.reduce((s, v) => s + (Date.now() - v.arrivalTime.getTime()) / 60000, 0) / active.length) : 0,
    };
  }
}
