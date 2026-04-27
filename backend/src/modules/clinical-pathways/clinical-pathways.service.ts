import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ClinicalPathwaysService {
  constructor(private prisma: PrismaService) {}

  async createProtocol(tenantId: string, dto: any, userId: string) { return this.prisma.careProtocol.create({ data: { tenantId, name: dto.name, diagnosis: dto.diagnosis, icdCode: dto.icdCode, department: dto.department, durationDays: dto.durationDays, steps: dto.steps || [], createdById: userId } }); }
  async getProtocols(tenantId: string) { return this.prisma.careProtocol.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } }); }
  async updateProtocol(tenantId: string, id: string, dto: any) { const p = await this.prisma.careProtocol.findFirst({ where: { id, tenantId } }); if (!p) throw new NotFoundException('Not found'); const data: any = {}; ['name', 'diagnosis', 'icdCode', 'department', 'durationDays', 'steps', 'isActive'].forEach(k => { if (dto[k] !== undefined) data[k] = dto[k]; }); return this.prisma.careProtocol.update({ where: { id }, data }); }

  async assignPathway(tenantId: string, dto: any) { return this.prisma.patientPathway.create({ data: { tenantId, protocolId: dto.protocolId, patientId: dto.patientId, admissionId: dto.admissionId, notes: dto.notes } }); }
  async getPatientPathways(tenantId: string, query: any) { const { patientId, status, page = 1, limit = 20 } = query; const where: any = { tenantId }; if (patientId) where.patientId = patientId; if (status) where.status = status; const [data, total] = await Promise.all([this.prisma.patientPathway.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { startDate: 'desc' }, include: { protocol: { select: { name: true, durationDays: true } } } }), this.prisma.patientPathway.count({ where })]); return { data, meta: { total, page: Number(page), limit: Number(limit) } }; }
  async updatePathway(tenantId: string, id: string, dto: any) { const p = await this.prisma.patientPathway.findFirst({ where: { id, tenantId } }); if (!p) throw new NotFoundException('Not found'); const data: any = {}; ['currentDay', 'status', 'completedSteps', 'deviations', 'notes'].forEach(k => { if (dto[k] !== undefined) data[k] = dto[k]; }); return this.prisma.patientPathway.update({ where: { id }, data }); }
}
