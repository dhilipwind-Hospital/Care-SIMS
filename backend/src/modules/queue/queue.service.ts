import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';
import { sendEmail } from '../../common/utils/mailer';
import { startOfDayUtc, nextQueueTokenNumber, findLiveToken, normalizePriority, normalizeVisitType, byUrgency, priorityRank, resolveDepartmentId } from '../../common/utils/queue-token';

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
    const queueDate = startOfDayUtc(date);
    // A patient removed via soft delete must drop off the live board; without
    // this their cancelled tokens keep appearing in today's queue.
    const where: any = { tenantId, locationId, queueDate, patient: { is: { isDeleted: false } } };
    if (doctorId) where.doctorId = doctorId;
    const tokens = await this.prisma.queueToken.findMany({
      where,
      include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true, gender: true, ageYears: true, dateOfBirth: true, mobile: true, allergies: true } } },
      // Chronological fetch; urgency ordering applied in memory because a
      // String `priority` column sorts alphabetically (see byUrgency).
      orderBy: [{ tokenNumber: 'asc' }],
      take: 500,
    });
    tokens.sort(byUrgency);
    const stats = {
      total: tokens.length,
      waiting: tokens.filter(t => t.status === 'WAITING').length,
      inConsultation: tokens.filter(t => t.status === 'IN_CONSULTATION').length,
      completed: tokens.filter(t => t.status === 'COMPLETED').length,
      skipped: tokens.filter(t => t.status === 'SKIPPED').length,
    };
    return { tokens: await this.withDoctor(tenantId, tokens), stats };
  }

  // QueueToken.doctorId has no relation and may point at a TenantUser or a
  // DoctorRegistry row, so the dashboard's Doctor column rendered "—" for every
  // token. Resolve names here, and derive the wait time the table shows.
  private async withDoctor(tenantId: string, tokens: any[]) {
    if (!tokens.length) return tokens;
    const doctorIds = [...new Set(tokens.map(t => t.doctorId).filter(Boolean))] as string[];
    const [users, registry] = await Promise.all([
      doctorIds.length
        ? this.prisma.tenantUser.findMany({ where: { id: { in: doctorIds }, tenantId }, select: { id: true, firstName: true, lastName: true } })
        : [],
      doctorIds.length
        ? this.prisma.doctorRegistry.findMany({ where: { id: { in: doctorIds } }, select: { id: true, firstName: true, lastName: true } })
        : [],
    ]);
    const map = new Map<string, any>([...registry, ...users].map(d => [d.id, d] as [string, any]));

    // QueueToken has no chiefComplaint column — the doctor's queue rendered "—"
    // for every patient even though reception and the nurse had both recorded
    // one. The nurse's assessment is the better source when it exists; the
    // token's `notes` is what reception wrote at check-in.
    const triage = await this.prisma.triageRecord.findMany({
      where: { tenantId, queueTokenId: { in: tokens.map(t => t.id) } },
      select: { queueTokenId: true, chiefComplaint: true, triageLevel: true },
    });
    const triageMap = new Map<string, any>(
      triage.filter(r => r.queueTokenId).map(r => [r.queueTokenId as string, r] as [string, any]),
    );

    const now = Date.now();
    return tokens.map(t => {
      // Waiting patients accrue time; once called/consulting the clock stops.
      const until = t.completedAt || t.consultStart || t.calledTime;
      const end = until ? new Date(until).getTime() : now;
      const tr = triageMap.get(t.id);
      return {
        ...t,
        doctor: t.doctorId ? map.get(t.doctorId) || null : null,
        chiefComplaint: tr?.chiefComplaint || t.notes || null,
        triageLevel: tr?.triageLevel || null,
        waitMins: t.checkInTime ? Math.max(0, Math.round((end - new Date(t.checkInTime).getTime()) / 60000)) : null,
      };
    });
  }

  async issueToken(tenantId: string, dto: any, createdById: string) {
    const queueDate = startOfDayUtc();

    // Token numbering runs under an advisory lock inside the transaction —
    // see nextQueueTokenNumber. The create MUST stay in the same transaction
    // or the lock is released before the row lands and the race reopens.
    const token = await this.prisma.$transaction(async (tx) => {
      // Never mint a second live token for a patient already in today's queue;
      // reception, triage and appointment check-in can all fire for the same
      // person. Reuse and update instead, matching triage.create's behaviour.
      const existing = await findLiveToken(tx, {
        tenantId, locationId: dto.locationId, patientId: dto.patientId, queueDate,
      });
      if (existing) {
        return tx.queueToken.update({
          where: { id: existing.id },
          data: {
            ...(dto.doctorId ? { doctorId: dto.doctorId } : {}),
            ...(dto.departmentId ? { departmentId: dto.departmentId } : {}),
            ...(dto.priority ? { priority: normalizePriority(dto.priority) } : {}),
            ...(dto.appointmentId ? { appointmentId: dto.appointmentId } : {}),
            ...(dto.notes ? { notes: dto.notes } : {}),
          },
          include: { patient: { select: { patientId: true, firstName: true, lastName: true, mobile: true } } },
        });
      }

      const tokenNumber = await nextQueueTokenNumber(tx, {
        tenantId, locationId: dto.locationId, queueDate,
      });
      const departmentId = await resolveDepartmentId(tx, tenantId, {
        departmentId: dto.departmentId, doctorId: dto.doctorId,
      });
      return tx.queueToken.create({
        data: {
          tenantId, tokenNumber,
          locationId: dto.locationId,
          queueDate,
          patientId: dto.patientId,
          appointmentId: dto.appointmentId,
          doctorId: dto.doctorId,
          departmentId,
          visitType: normalizeVisitType(dto.visitType),
          priority: normalizePriority(dto.priority),
          status: 'WAITING',
          notes: dto.notes,
          createdById,
        },
        include: { patient: { select: { patientId: true, firstName: true, lastName: true, mobile: true } } },
      });
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

  /**
   * Manually reorder the queue.
   *
   * Accepts the token ids in the order the user dragged them. Positions are
   * assigned per priority band, NOT across the whole list — so a nurse can
   * sequence the routine patients however they like, but cannot drag a routine
   * patient above an urgent one. Acuity always wins; `byUrgency` compares
   * `sortOrder` only after `priority`.
   *
   * Rejects ids that aren't in the same location-day, so one queue's reorder
   * can't reach into another's.
   */
  async reorder(tenantId: string, orderedIds: string[], actorId: string) {
    if (!Array.isArray(orderedIds) || !orderedIds.length) {
      throw new BadRequestException('orderedIds must be a non-empty array');
    }
    const tokens = await this.prisma.queueToken.findMany({
      where: { id: { in: orderedIds }, tenantId },
      select: { id: true, priority: true, locationId: true, queueDate: true, tokenNumber: true },
    });
    if (tokens.length !== orderedIds.length) {
      throw new BadRequestException('One or more tokens were not found in this tenant');
    }
    const scopes = new Set(tokens.map(t => `${t.locationId}|${t.queueDate.toISOString().slice(0, 10)}`));
    if (scopes.size > 1) {
      throw new BadRequestException('All tokens must belong to the same location and day');
    }

    const byId = new Map(tokens.map(t => [t.id, t] as [string, any]));
    // Walk the user's order, numbering each priority band independently.
    const seen = new Map<number, number>();
    const updates: { id: string; sortOrder: number }[] = [];
    for (const id of orderedIds) {
      const t = byId.get(id);
      if (!t) continue;
      const band = priorityRank(t.priority);
      const next = (seen.get(band) ?? 0) + 1;
      seen.set(band, next);
      updates.push({ id, sortOrder: next });
    }

    await this.prisma.$transaction(
      updates.map(u => this.prisma.queueToken.update({ where: { id: u.id }, data: { sortOrder: u.sortOrder } })),
    );
    this.logger.log(`Queue reordered by ${actorId}: ${updates.map(u => `${u.id.slice(0, 8)}#${u.sortOrder}`).join(' ')}`);
    this.ws.emitToTenant(tenantId, 'queue:updated', { action: 'reordered', by: actorId });
    return { updated: updates.length, order: updates };
  }

  async callNext(tenantId: string, locationId: string, doctorId: string) {
    const called = await this.prisma.$transaction(async (tx) => {
      // findFirst with orderBy cannot express clinical urgency, and the old
      // alphabetical sort made Call Next reach for a NORMAL patient ahead of an
      // URGENT one — disagreeing with the list the doctor was looking at.
      const waiting = await tx.queueToken.findMany({
        where: { tenantId, locationId, doctorId, status: 'WAITING' },
        orderBy: [{ tokenNumber: 'asc' }],
        include: { patient: true },
      });
      const next = [...waiting].sort(byUrgency)[0];
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
    const today = startOfDayUtc();
    const [waiting, inConsult, completed, total] = await Promise.all([
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today, status: 'WAITING' } }),
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today, status: { in: ['CALLED', 'IN_CONSULTATION'] } } }),
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today, status: 'COMPLETED' } }),
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today } }),
    ]);
    return { waiting, inConsultation: inConsult, completed, total };
  }

  async getDoctorQueue(tenantId: string, doctorId: string, limit?: number) {
    const today = startOfDayUtc();
    const tokens = await this.prisma.queueToken.findMany({
      where: { tenantId, doctorId, queueDate: today },
      include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true, gender: true, ageYears: true, dateOfBirth: true, mobile: true, allergies: true } } },
      orderBy: [{ tokenNumber: 'asc' }],
      take: limit ? Number(limit) : 50,
    });
    tokens.sort(byUrgency);
    const stats = {
      total: tokens.length,
      waiting: tokens.filter(t => t.status === 'WAITING').length,
      inConsultation: tokens.filter(t => t.status === 'IN_CONSULTATION').length,
      completed: tokens.filter(t => t.status === 'COMPLETED').length,
    };
    return { tokens: await this.withDoctor(tenantId, tokens), stats };
  }
}
