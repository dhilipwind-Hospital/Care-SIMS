import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PalliativeCareService {
  constructor(private prisma: PrismaService) {}

  async createRecord(tenantId: string, dto: any, userId: string) { return this.prisma.palliativeCareRecord.create({ data: { tenantId, patientId: dto.patientId || null, admissionId: dto.admissionId || null, recordType: dto.recordType || 'ASSESSMENT', patientName: dto.patientName || null, diagnosis: dto.diagnosis || null, supportType: dto.supportType || 'MEDICAL', primaryNurse: dto.primaryNurse || null, carePlan: dto.carePlan || null, status: dto.status || 'ACTIVE', painScore: dto.painScore, painType: dto.painType, symptoms: dto.symptoms || [], goalsOfCare: dto.goalsOfCare, advanceDirective: dto.advanceDirective, familyMeetingNotes: dto.familyMeetingNotes, medications: dto.medications, assessedById: userId || null, nextFollowUp: dto.nextFollowUp ? new Date(dto.nextFollowUp) : null, notes: dto.notes } }); }

  async getRecords(tenantId: string, query: any) { const { patientId, type, page = 1, limit = 20 } = query; const where: any = { tenantId }; if (patientId) where.patientId = patientId; if (type) where.recordType = type; const [data, total] = await Promise.all([this.prisma.palliativeCareRecord.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { assessedAt: 'desc' } }), this.prisma.palliativeCareRecord.count({ where })]); return { data, meta: { total, page: Number(page), limit: Number(limit) } }; }

  async getOne(tenantId: string, id: string) { const r = await this.prisma.palliativeCareRecord.findFirst({ where: { id, tenantId } }); if (!r) throw new NotFoundException('Not found'); return r; }

  async dashboard(tenantId: string) { const total = await this.prisma.palliativeCareRecord.count({ where: { tenantId } }); const byType = await this.prisma.palliativeCareRecord.groupBy({ by: ['recordType'], where: { tenantId }, _count: true }); return { total, byType }; }
}
