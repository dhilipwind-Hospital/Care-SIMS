import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ShiftHandoverService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, filters: { locationId?: string; wardId?: string; date?: string; status?: string }) {
    const where: any = { tenantId };
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.wardId) where.wardId = filters.wardId;
    if (filters.status) where.status = filters.status;
    if (filters.date) where.shiftDate = new Date(filters.date);
    return this.prisma.shiftHandover.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.shiftHandover.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        wardId: dto.wardId,
        departmentId: dto.departmentId,
        shiftDate: new Date(dto.shiftDate),
        shiftType: dto.shiftType,
        handoverFromId: userId,
        handoverFromName: dto.handoverFromName,
        handoverToId: dto.handoverToId,
        handoverToName: dto.handoverToName,
        patientSummary: dto.patientSummary,
        criticalAlerts: dto.criticalAlerts || [],
        pendingTasks: dto.pendingTasks,
        medicationNotes: dto.medicationNotes,
        equipmentIssues: dto.equipmentIssues,
        generalNotes: dto.generalNotes,
        status: 'DRAFT',
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const rec = await tx.shiftHandover.findFirst({ where: { id, tenantId } });
      if (!rec) throw new NotFoundException('Shift handover not found');
      if (rec.status === 'ACKNOWLEDGED') throw new BadRequestException('Cannot edit acknowledged handover');
      const data: any = {};
      if (dto.patientSummary !== undefined) data.patientSummary = dto.patientSummary;
      if (dto.criticalAlerts !== undefined) data.criticalAlerts = dto.criticalAlerts;
      if (dto.pendingTasks !== undefined) data.pendingTasks = dto.pendingTasks;
      if (dto.medicationNotes !== undefined) data.medicationNotes = dto.medicationNotes;
      if (dto.equipmentIssues !== undefined) data.equipmentIssues = dto.equipmentIssues;
      if (dto.generalNotes !== undefined) data.generalNotes = dto.generalNotes;
      if (dto.handoverToId !== undefined) data.handoverToId = dto.handoverToId;
      if (dto.handoverToName !== undefined) data.handoverToName = dto.handoverToName;
      if (dto.status !== undefined) data.status = dto.status;
      return tx.shiftHandover.update({ where: { id }, data });
    });
  }

  async acknowledge(tenantId: string, id: string, userId: string, userName: string) {
    return this.prisma.$transaction(async (tx) => {
      const rec = await tx.shiftHandover.findFirst({ where: { id, tenantId } });
      if (!rec) throw new NotFoundException('Shift handover not found');
      return tx.shiftHandover.update({
        where: { id },
        data: { handoverToId: userId, handoverToName: userName, status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
      });
    });
  }

  async getOne(tenantId: string, id: string) {
    const rec = await this.prisma.shiftHandover.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Shift handover not found');
    return rec;
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const rec = await tx.shiftHandover.findFirst({ where: { id, tenantId } });
      if (!rec) throw new NotFoundException('Shift handover not found');
      if (rec.status !== 'DRAFT') throw new BadRequestException('Only draft handovers can be deleted');
      return tx.shiftHandover.delete({ where: { id } });
    });
  }
}
