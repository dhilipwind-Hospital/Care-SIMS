import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InfectionControlService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, status?: string, recordType?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    if (recordType) where.recordType = recordType;
    return this.prisma.infectionControlRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async create(tenantId: string, userId: string, userName: string, dto: any) {
    return this.prisma.infectionControlRecord.create({
      data: {
        tenantId, locationId: dto.locationId, recordType: dto.recordType,
        patientId: dto.patientId, admissionId: dto.admissionId, wardId: dto.wardId,
        organism: dto.organism, infectionSite: dto.infectionSite, infectionType: dto.infectionType,
        isolationType: dto.isolationType, onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : undefined,
        cultureDate: dto.cultureDate ? new Date(dto.cultureDate) : undefined,
        antibioticSensitivity: dto.antibioticSensitivity, isHai: dto.isHai || false,
        reportedById: userId, reportedByName: userName, actionsTaken: dto.actionsTaken, notes: dto.notes,
      },
    });
  }

  async get(tenantId: string, id: string) {
    const r = await this.prisma.infectionControlRecord.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Record not found');
    return r;
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.infectionControlRecord.findFirst({ where: { id, tenantId } });
      if (!r) throw new NotFoundException('Record not found');
      const data: any = {};
      if (dto.recordType !== undefined) data.recordType = dto.recordType;
      if (dto.organism !== undefined) data.organism = dto.organism;
      if (dto.infectionSite !== undefined) data.infectionSite = dto.infectionSite;
      if (dto.infectionType !== undefined) data.infectionType = dto.infectionType;
      if (dto.isolationType !== undefined) data.isolationType = dto.isolationType;
      if (dto.antibioticSensitivity !== undefined) data.antibioticSensitivity = dto.antibioticSensitivity;
      if (dto.isHai !== undefined) data.isHai = dto.isHai;
      if (dto.actionsTaken !== undefined) data.actionsTaken = dto.actionsTaken;
      if (dto.notes !== undefined) data.notes = dto.notes;
      if (dto.status !== undefined) data.status = dto.status;
      return tx.infectionControlRecord.update({ where: { id }, data });
    });
  }

  async resolve(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.infectionControlRecord.findFirst({ where: { id, tenantId } });
      if (!r) throw new NotFoundException('Record not found');
      return tx.infectionControlRecord.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date(), outcome: dto.outcome, notes: dto.notes } });
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.infectionControlRecord.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Record not found');
      await tx.infectionControlRecord.update({ where: { id }, data: { status: 'CANCELLED' } });
      return { message: 'Infection control record deleted successfully' };
    });
  }

  async dashboard(tenantId: string) {
    const [active, hai, resolved] = await Promise.all([
      this.prisma.infectionControlRecord.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.infectionControlRecord.count({ where: { tenantId, isHai: true, status: 'ACTIVE' } }),
      this.prisma.infectionControlRecord.count({ where: { tenantId, status: 'RESOLVED' } }),
    ]);
    return { active, hai, resolved, total: active + resolved };
  }
}
