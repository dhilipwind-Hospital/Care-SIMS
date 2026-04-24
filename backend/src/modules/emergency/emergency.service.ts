import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class EmergencyService {
  constructor(private prisma: PrismaService, private ws: WsGateway) {}

  async register(tenantId: string, dto: any, createdById: string) {
    return generateSequentialId(this.prisma, {
      table: 'EmergencyVisit',
      idColumn: 'visitNumber',
      prefix: `ED-${new Date().getFullYear()}-`,
      tenantId,
      padLength: 5,
      callback: async (tx, visitNumber) => {
        const visit = await tx.emergencyVisit.create({
          data: {
            tenantId, visitNumber, locationId: dto.locationId, patientId: dto.patientId,
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
        this.ws.emitToTenant(tenantId, 'ed:new-patient', { visit });
        return visit;
      },
    });
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
