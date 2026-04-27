import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AntimicrobialStewardshipService {
  constructor(private prisma: PrismaService) {}

  async recordUsage(tenantId: string, dto: any) { return this.prisma.antibioticUsage.create({ data: { tenantId, patientId: dto.patientId, admissionId: dto.admissionId, drugName: dto.drugName, dose: dto.dose, route: dto.route, frequency: dto.frequency, indication: dto.indication, cultureOrdered: dto.cultureOrdered || false, isRestricted: dto.isRestricted || false, approvedById: dto.approvedById, startDate: new Date(dto.startDate), notes: dto.notes } }); }

  async getUsage(tenantId: string, query: any) { const { patientId, status, page = 1, limit = 20 } = query; const where: any = { tenantId }; if (patientId) where.patientId = patientId; if (status) where.status = status; const [data, total] = await Promise.all([this.prisma.antibioticUsage.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { startDate: 'desc' } }), this.prisma.antibioticUsage.count({ where })]); return { data, meta: { total, page: Number(page), limit: Number(limit) } }; }

  async updateUsage(tenantId: string, id: string, dto: any) { const u = await this.prisma.antibioticUsage.findFirst({ where: { id, tenantId } }); if (!u) throw new NotFoundException('Not found'); const data: any = {}; ['cultureSensitivity', 'endDate', 'durationDays', 'deEscalated', 'status', 'notes'].forEach(k => { if (dto[k] !== undefined) data[k] = dto[k]; }); if (dto.endDate) data.endDate = new Date(dto.endDate); if (dto.status === 'DE_ESCALATED') data.deEscalated = true; return this.prisma.antibioticUsage.update({ where: { id }, data }); }

  async dashboard(tenantId: string) { const active = await this.prisma.antibioticUsage.count({ where: { tenantId, status: 'ACTIVE' } }); const restricted = await this.prisma.antibioticUsage.count({ where: { tenantId, status: 'ACTIVE', isRestricted: true } }); const noCulture = await this.prisma.antibioticUsage.count({ where: { tenantId, status: 'ACTIVE', cultureOrdered: false } }); const total = await this.prisma.antibioticUsage.count({ where: { tenantId } }); return { active, restricted, noCulture, total }; }
}
