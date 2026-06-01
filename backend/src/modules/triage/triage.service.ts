import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';

@Injectable()
export class TriageService {
  constructor(private prisma: PrismaService, private ws: WsGateway) {}

  async list(tenantId: string, query: any) {
    const where: any = { tenantId };
    if (query.triageLevel) where.triageLevel = query.triageLevel;
    if (query.patientId) where.patientId = query.patientId;
    if (query.dateFrom || query.dateTo) {
      where.triageTime = {};
      if (query.dateFrom) where.triageTime.gte = new Date(query.dateFrom);
      if (query.dateTo) where.triageTime.lte = new Date(query.dateTo);
    }
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, parseInt(query.limit || '20', 10));
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.triageRecord.findMany({
        where,
        orderBy: { triageTime: 'desc' },
        skip,
        take: limit,
        include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true } } },
      }),
      this.prisma.triageRecord.count({ where }),
    ]);
    // Flatten vitalsOnArrival back into top-level fields so the lookup panels
    // and print card can keep reading r.systolicBp / r.heartRate / etc.
    const flat = data.map(r => ({ ...r, ...((r.vitalsOnArrival as any) || {}) }));
    return { data: flat, meta: { total, page, limit } };
  }

  async create(tenantId: string, dto: any, triagedById: string) {
    // Auto-resolve locationId from user's primary location if not provided
    let locationId = dto.locationId;
    if (!locationId) {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: triagedById }, select: { primaryLocationId: true } });
      locationId = user?.primaryLocationId;
    }

    // Frontend sends vitals as flat top-level fields. Pack them into the JSON
    // column the schema expects, so nothing gets dropped silently.
    const vitalsOnArrival = dto.vitalsOnArrival ?? {
      systolicBp: dto.systolicBp,
      diastolicBp: dto.diastolicBp,
      heartRate: dto.heartRate,
      temperatureC: dto.temperatureC,
      spo2: dto.spo2,
      respiratoryRate: dto.respiratoryRate,
      weightKg: dto.weightKg,
      heightCm: dto.heightCm,
    };

    // Frontend collects briefHistory / knownAllergies / currentMedications /
    // nurseNotes in separate fields but the schema only has `notes`. Stitch
    // them into a single labelled blob so nothing is lost.
    const notesParts: string[] = [];
    if (dto.briefHistory) notesParts.push(`History: ${dto.briefHistory}`);
    if (dto.knownAllergies) notesParts.push(`Allergies: ${dto.knownAllergies}`);
    if (dto.currentMedications) notesParts.push(`Current meds: ${dto.currentMedications}`);
    if (dto.nurseNotes) notesParts.push(`Nurse notes: ${dto.nurseNotes}`);
    if (dto.notes) notesParts.push(dto.notes);
    const notes = notesParts.length ? notesParts.join('\n') : undefined;

    // Map triage acuity to queue priority so callNext picks the sickest patient first.
    const priority =
      dto.triageLevel === 'RED'    ? 'EMERGENCY' :
      dto.triageLevel === 'ORANGE' ? 'EMERGENCY' :
      dto.triageLevel === 'YELLOW' ? 'URGENT'    :
      'NORMAL';

    const result = await this.prisma.$transaction(async (tx) => {
      // Resolve a queue token for the doctor's "Call Next" to find:
      //   1. If the nurse triaged off an existing token, use that.
      //   2. Else if the patient already has a live token today at this location, reuse it.
      //   3. Else mint a fresh one.
      let queueTokenId: string | undefined = dto.queueTokenId;
      let queueTokenChanged = false;
      const today = new Date(); today.setHours(0, 0, 0, 0);

      if (!queueTokenId && locationId) {
        const existing = await tx.queueToken.findFirst({
          where: {
            tenantId, locationId, patientId: dto.patientId, queueDate: today,
            status: { in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (existing) {
          queueTokenId = existing.id;
          await tx.queueToken.update({
            where: { id: existing.id },
            data: {
              priority,
              ...(dto.assignedDoctorId ? { doctorId: dto.assignedDoctorId } : {}),
              ...(dto.assignedDeptId ? { departmentId: dto.assignedDeptId } : {}),
              ...(existing.status === 'WAITING' ? {} : { status: 'WAITING' }),
            },
          });
          queueTokenChanged = true;
        } else {
          const last = await tx.queueToken.findFirst({
            where: { tenantId, locationId, queueDate: today },
            orderBy: { tokenNumber: 'desc' },
          });
          const created = await tx.queueToken.create({
            data: {
              tenantId,
              tokenNumber: (last?.tokenNumber || 0) + 1,
              locationId,
              queueDate: today,
              patientId: dto.patientId,
              doctorId: dto.assignedDoctorId,
              departmentId: dto.assignedDeptId,
              visitType: 'NEW',
              priority,
              status: 'WAITING',
              notes: dto.chiefComplaint,
              createdById: triagedById,
            },
          });
          queueTokenId = created.id;
          queueTokenChanged = true;
        }
      }

      const triage = await tx.triageRecord.create({
        data: {
          tenantId, locationId, patientId: dto.patientId,
          queueTokenId, chiefComplaint: dto.chiefComplaint,
          triageLevel: dto.triageLevel,
          symptoms: dto.symptoms || [],
          vitalsOnArrival,
          painScore: dto.painScore !== undefined && dto.painScore !== null ? Number(dto.painScore) : undefined,
          gcs: dto.gcs,
          assignedDoctorId: dto.assignedDoctorId,
          assignedDeptId: dto.assignedDeptId,
          notes, triagedById,
        },
      });
      return { triage, queueTokenChanged };
    });

    // Nudge any listening doctor queue pages to refresh — otherwise they only
    // pick up the new token on their next 30s poll.
    if (result.queueTokenChanged) {
      this.ws.emitToTenant(tenantId, 'queue:updated', { action: 'triage_completed', patientId: dto.patientId });
    }
    return result.triage;
  }

  async getByToken(tenantId: string, tokenId: string) {
    const r = await this.prisma.triageRecord.findFirst({
      where: { tenantId, queueTokenId: tokenId },
      include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true } } },
    });
    return r ? { ...r, ...((r.vitalsOnArrival as any) || {}) } : null;
  }

  async getByPatient(tenantId: string, patientId: string) {
    const rows = await this.prisma.triageRecord.findMany({
      where: { tenantId, patientId },
      orderBy: { triageTime: 'desc' },
      take: 10,
      include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true } } },
    });
    return rows.map(r => ({ ...r, ...((r.vitalsOnArrival as any) || {}) }));
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.triageRecord.findFirst({ where: { id, tenantId } });
      if (!t) throw new NotFoundException('Triage not found');
      const data: any = {};
      if (dto.triageLevel !== undefined) data.triageLevel = dto.triageLevel;
      if (dto.chiefComplaint !== undefined) data.chiefComplaint = dto.chiefComplaint;
      if (dto.symptoms !== undefined) data.symptoms = dto.symptoms;
      if (dto.vitalsOnArrival !== undefined) data.vitalsOnArrival = dto.vitalsOnArrival;
      if (dto.painScore !== undefined) data.painScore = dto.painScore;
      if (dto.gcs !== undefined) data.gcs = dto.gcs;
      if (dto.assignedDoctorId !== undefined) data.assignedDoctorId = dto.assignedDoctorId;
      if (dto.assignedDeptId !== undefined) data.assignedDeptId = dto.assignedDeptId;
      if (dto.notes !== undefined) data.notes = dto.notes;
      return tx.triageRecord.update({ where: { id }, data });
    });
  }
}
