import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class QualityService {
  constructor(private prisma: PrismaService) {}

  // ── Indicators ──
  async createIndicator(tenantId: string, dto: any, userId: string) {
    return this.prisma.qualityIndicator.create({ data: { tenantId, indicatorCode: dto.indicatorCode, name: dto.name, category: dto.category, target: dto.target, period: dto.period || 'MONTHLY', value: dto.value, numerator: dto.numerator, denominator: dto.denominator, calculatedAt: dto.value ? new Date() : null, reportedById: userId, notes: dto.notes } });
  }

  async getIndicators(tenantId: string, query: any) {
    const { category, period, page = 1, limit = 50 } = query;
    const where: any = { tenantId };
    if (category) where.category = category;
    if (period) where.period = period;
    return this.prisma.qualityIndicator.findMany({ where, orderBy: [{ category: 'asc' }, { indicatorCode: 'asc' }], take: Number(limit) });
  }

  async updateIndicator(tenantId: string, id: string, dto: any, userId: string) {
    const ind = await this.prisma.qualityIndicator.findFirst({ where: { id, tenantId } });
    if (!ind) throw new NotFoundException('Indicator not found');
    return this.prisma.qualityIndicator.update({ where: { id }, data: { value: dto.value, numerator: dto.numerator, denominator: dto.denominator, calculatedAt: new Date(), reportedById: userId, notes: dto.notes } });
  }

  // ── Incidents ──
  async reportIncident(tenantId: string, dto: any, userId: string) {
    return this.prisma.qualityIncident.create({ data: { tenantId, incidentType: dto.incidentType, patientId: dto.patientId, reportedById: userId, description: dto.description, severity: dto.severity || 'MINOR' } });
  }

  async getIncidents(tenantId: string, query: any) {
    const { type, severity, status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (type) where.incidentType = type;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    const [data, total] = await Promise.all([this.prisma.qualityIncident.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }), this.prisma.qualityIncident.count({ where })]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async updateIncident(tenantId: string, id: string, dto: any) {
    const inc = await this.prisma.qualityIncident.findFirst({ where: { id, tenantId } });
    if (!inc) throw new NotFoundException('Incident not found');
    const data: any = {};
    if (dto.rootCauseAnalysis !== undefined) data.rootCauseAnalysis = dto.rootCauseAnalysis;
    if (dto.correctiveAction !== undefined) data.correctiveAction = dto.correctiveAction;
    if (dto.status !== undefined) { data.status = dto.status; if (dto.status === 'RESOLVED') data.resolvedAt = new Date(); }
    return this.prisma.qualityIncident.update({ where: { id }, data });
  }

  async dashboard(tenantId: string) {
    const [indicators, openIncidents, totalIncidents] = await Promise.all([
      this.prisma.qualityIndicator.findMany({ where: { tenantId }, orderBy: { category: 'asc' } }),
      this.prisma.qualityIncident.count({ where: { tenantId, status: { in: ['OPEN', 'INVESTIGATING'] } } }),
      this.prisma.qualityIncident.count({ where: { tenantId } }),
    ]);
    const belowTarget = indicators.filter(i => i.target && i.value && Number(i.value) < Number(i.target)).length;
    return { totalIndicators: indicators.length, belowTarget, openIncidents, totalIncidents, indicators };
  }
}
