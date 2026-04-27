import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WoundCareService {
  constructor(private prisma: PrismaService) {}

  async createAssessment(tenantId: string, dto: any, userId: string) { return this.prisma.woundAssessment.create({ data: { tenantId, patientId: dto.patientId, admissionId: dto.admissionId, woundType: dto.woundType, location: dto.location, stage: dto.stage, lengthCm: dto.lengthCm, widthCm: dto.widthCm, depthCm: dto.depthCm, woundBed: dto.woundBed, exudate: dto.exudate, periwoundSkin: dto.periwoundSkin, treatment: dto.treatment, dressingType: dto.dressingType, photoUrl: dto.photoUrl, painScore: dto.painScore, assessedById: userId, nextAssessment: dto.nextAssessment ? new Date(dto.nextAssessment) : null, notes: dto.notes } }); }

  async getAssessments(tenantId: string, query: any) { const { patientId, page = 1, limit = 20 } = query; const where: any = { tenantId }; if (patientId) where.patientId = patientId; const [data, total] = await Promise.all([this.prisma.woundAssessment.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { assessedAt: 'desc' } }), this.prisma.woundAssessment.count({ where })]); return { data, meta: { total, page: Number(page), limit: Number(limit) } }; }

  async getOne(tenantId: string, id: string) { const w = await this.prisma.woundAssessment.findFirst({ where: { id, tenantId } }); if (!w) throw new NotFoundException('Not found'); return w; }

  async dashboard(tenantId: string) { const all = await this.prisma.woundAssessment.findMany({ where: { tenantId } }); const byType: Record<string, number> = {}; all.forEach(w => { byType[w.woundType] = (byType[w.woundType] || 0) + 1; }); return { total: all.length, byType }; }
}
