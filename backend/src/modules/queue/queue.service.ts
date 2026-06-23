import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';
import { sendEmail } from '../../common/utils/mailer';

// Same shell as admissions/discharge-summary — kept inline to avoid a shared
// dependency.
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
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  constructor(private prisma: PrismaService, private ws: WsGateway) {}

  async getTodayQueue(tenantId: string, locationId: string, doctorId?: string, date?: string) {
    const queueDate = date ? new Date(date) : new Date();
    queueDate.setHours(0, 0, 0, 0);
    const where: any = { tenantId, locationId, queueDate };
    if (doctorId) where.doctorId = doctorId;
    const tokens = await this.prisma.queueToken.findMany({
      where,
      include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true, gender: true, ageYears: true, dateOfBirth: true, mobile: true, allergies: true } } },
      orderBy: [{ priority: 'asc' }, { tokenNumber: 'asc' }],
      take: 500,
    });
    const stats = {
      total: tokens.length,
      waiting: tokens.filter(t => t.status === 'WAITING').length,
      inConsultation: tokens.filter(t => t.status === 'IN_CONSULTATION').length,
      completed: tokens.filter(t => t.status === 'COMPLETED').length,
      skipped: tokens.filter(t => t.status === 'SKIPPED').length,
    };
    return { tokens, stats };
  }

  async issueToken(tenantId: string, dto: any, createdById: string) {
    const queueDate = new Date();
    queueDate.setHours(0, 0, 0, 0);

    const lastToken = await this.prisma.queueToken.findFirst({
      where: { tenantId, locationId: dto.locationId, queueDate },
      orderBy: { tokenNumber: 'desc' },
    });
    const tokenNumber = (lastToken?.tokenNumber || 0) + 1;

    const token = await this.prisma.queueToken.create({
      data: {
        tenantId, tokenNumber,
        locationId: dto.locationId,
        queueDate,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        doctorId: dto.doctorId,
        departmentId: dto.departmentId,
        visitType: dto.visitType || 'NEW',
        priority: dto.priority || 'NORMAL',
        status: 'WAITING',
        notes: dto.notes,
        createdById,
      },
      include: { patient: { select: { patientId: true, firstName: true, lastName: true, mobile: true } } },
    });
    this.ws.emitToTenant(tenantId, 'queue:updated', { action: 'token_issued', token });

    // Fire-and-forget patient confirmation email. Silent if no email on file.
    this.sendQueueTokenEmail(tenantId, token).catch((err) => {
      this.logger.error(`Queue token email dispatch failed: ${err?.message || err}`);
    });

    return token;
  }

  // Compose + send patient confirmation email for a freshly issued queue
  // token. Non-blocking — never throws.
  private async sendQueueTokenEmail(tenantId: string, token: any): Promise<void> {
    if (!token?.patientId) return;

    const [patient, doctor, department, tenant] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: token.patientId },
        select: { firstName: true, lastName: true, patientId: true, email: true },
      }),
      token.doctorId
        ? this.prisma.doctorRegistry.findUnique({
            where: { id: token.doctorId },
            select: { firstName: true, lastName: true, pgSpecialization: true },
          })
        : null,
      token.departmentId
        ? this.prisma.department.findUnique({
            where: { id: token.departmentId },
            select: { name: true },
          })
        : null,
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tradeName: true, legalName: true },
      }),
    ]);

    if (!patient?.email) return;

    const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';
    const doctorName = doctor
      ? `Dr ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
      : null;
    const deptName = department?.name || null;
    const waitLine =
      token.estimatedWaitMinutes !== undefined && token.estimatedWaitMinutes !== null
        ? `<strong>Estimated wait:</strong> ~${token.estimatedWaitMinutes} minute(s)<br/>`
        : '';
    const doctorLine = doctorName ? `<strong>Doctor:</strong> ${doctorName}<br/>` : '';
    const deptLine = deptName ? `<strong>Department:</strong> ${deptName}<br/>` : '';

    const subject = `🎫 Queue Token #${token.tokenNumber} — ${patient.firstName || ''} ${patient.lastName || ''} — ${orgName}`.trim();
    const body = `Dear ${patient.firstName || ''},<br/><br/>
Your queue token has been issued at <strong>${orgName}</strong>.<br/><br/>
<strong>Token Number:</strong> ${token.tokenNumber}<br/>
${doctorLine}${deptLine}${waitLine}<strong>Priority:</strong> ${token.priority || 'NORMAL'}<br/><br/>
Please remain in the waiting area. We will call your number shortly.<br/>
Inform a staff member if your condition worsens while you wait.`;

    sendEmail(patient.email, subject, emailTemplate('Queue Token Issued', body, orgName))
      .catch((err) => this.logger.error(`Queue patient token email failed: ${err?.message || err}`));
  }

  async callNext(tenantId: string, locationId: string, doctorId: string) {
    const called = await this.prisma.$transaction(async (tx) => {
      const next = await tx.queueToken.findFirst({
        where: { tenantId, locationId, doctorId, status: 'WAITING' },
        orderBy: [{ priority: 'asc' }, { tokenNumber: 'asc' }],
        include: { patient: true },
      });
      if (!next) throw new NotFoundException('No waiting patients');
      return tx.queueToken.update({ where: { id: next.id }, data: { status: 'CALLED', calledTime: new Date() }, include: { patient: true } });
    });
    this.ws.emitToTenant(tenantId, 'queue:updated', { action: 'token_called', token: called });
    if (doctorId) this.ws.emitToUser(doctorId, 'queue:token:called', called);
    return called;
  }

  async updateStatus(tenantId: string, tokenId: string, status: string, dto?: any) {
    const data: any = { status };
    if (status === 'IN_CONSULTATION') data.consultStart = new Date();
    if (status === 'COMPLETED') data.completedAt = new Date();
    if (dto?.notes) data.notes = dto.notes;
    const updated = await this.prisma.$transaction(async (tx) => {
      const token = await tx.queueToken.findFirst({ where: { id: tokenId, tenantId } });
      if (!token) throw new NotFoundException('Token not found');
      return tx.queueToken.update({ where: { id: tokenId }, data });
    });
    this.ws.emitToTenant(tenantId, 'queue:updated', { action: 'status_changed', token: updated });
    return updated;
  }

  async getStats(tenantId: string, locationId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [waiting, inConsult, completed, total] = await Promise.all([
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today, status: 'WAITING' } }),
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today, status: { in: ['CALLED', 'IN_CONSULTATION'] } } }),
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today, status: 'COMPLETED' } }),
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today } }),
    ]);
    return { waiting, inConsultation: inConsult, completed, total };
  }

  async getDoctorQueue(tenantId: string, doctorId: string, limit?: number) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tokens = await this.prisma.queueToken.findMany({
      where: { tenantId, doctorId, queueDate: today },
      include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true, gender: true, ageYears: true, dateOfBirth: true, mobile: true, allergies: true } } },
      orderBy: [{ priority: 'asc' }, { tokenNumber: 'asc' }],
      take: limit ? Number(limit) : 50,
    });
    const stats = {
      total: tokens.length,
      waiting: tokens.filter(t => t.status === 'WAITING').length,
      inConsultation: tokens.filter(t => t.status === 'IN_CONSULTATION').length,
      completed: tokens.filter(t => t.status === 'COMPLETED').length,
    };
    return { tokens, stats };
  }
}
