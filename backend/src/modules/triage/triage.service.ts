import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TriageService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: any) {
    const where: any = { tenantId };
    if (query.triageLevel) where.triageLevel = query.triageLevel;
    if (query.patientId) where.patientId = query.patientId;
    return this.prisma.triageRecord.findMany({
      where,
      orderBy: { triageTime: 'desc' },
      take: query.limit ? parseInt(query.limit) : 50,
    });
  }

  async create(tenantId: string, dto: any, triagedById: string) {
    // Auto-resolve locationId from user's primary location if not provided
    let locationId = dto.locationId;
    if (!locationId) {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: triagedById }, select: { primaryLocationId: true } });
      locationId = user?.primaryLocationId;
    }
    return this.prisma.triageRecord.create({
      data: {
        tenantId, locationId, patientId: dto.patientId,
        queueTokenId: dto.queueTokenId, chiefComplaint: dto.chiefComplaint,
        triageLevel: dto.triageLevel,
        symptoms: dto.symptoms || [],
        vitalsOnArrival: dto.vitalsOnArrival,
        painScore: dto.painScore, gcs: dto.gcs,
        assignedDoctorId: dto.assignedDoctorId,
        assignedDeptId: dto.assignedDeptId,
        notes: dto.notes, triagedById,
      },
    });
  }

  async getByToken(tenantId: string, tokenId: string) {
    return this.prisma.triageRecord.findFirst({
      where: { tenantId, queueTokenId: tokenId },
    });
  }

  async getByPatient(tenantId: string, patientId: string) {
    return this.prisma.triageRecord.findMany({
      where: { tenantId, patientId },
      orderBy: { triageTime: 'desc' },
      take: 10,
    });
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
