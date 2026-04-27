import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HomeCareService {
  constructor(private prisma: PrismaService) {}

  async createVisit(tenantId: string, dto: any) { return this.prisma.homeVisit.create({ data: { tenantId, patientId: dto.patientId, visitDate: new Date(dto.visitDate), visitType: dto.visitType || 'POST_DISCHARGE', staffId: dto.staffId, address: dto.address, medications: dto.medications, followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null, notes: dto.notes } }); }

  async getVisits(tenantId: string, query: any) { const { patientId, staffId, status, page = 1, limit = 20 } = query; const where: any = { tenantId }; if (patientId) where.patientId = patientId; if (staffId) where.staffId = staffId; if (status) where.status = status; const [data, total] = await Promise.all([this.prisma.homeVisit.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { visitDate: 'desc' } }), this.prisma.homeVisit.count({ where })]); return { data, meta: { total, page: Number(page), limit: Number(limit) } }; }

  async updateVisit(tenantId: string, id: string, dto: any) { const v = await this.prisma.homeVisit.findFirst({ where: { id, tenantId } }); if (!v) throw new NotFoundException('Not found'); const data: any = {}; ['startTime', 'endTime', 'vitalsRecorded', 'servicesProvided', 'status', 'notes'].forEach(k => { if (dto[k] !== undefined) data[k] = dto[k]; }); if (dto.startTime) data.startTime = new Date(dto.startTime); if (dto.endTime) data.endTime = new Date(dto.endTime); return this.prisma.homeVisit.update({ where: { id }, data }); }

  async dashboard(tenantId: string) { const today = new Date(); today.setHours(0,0,0,0); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1); const [todayVisits, total, scheduled, completed] = await Promise.all([this.prisma.homeVisit.count({ where: { tenantId, visitDate: { gte: today, lt: tomorrow } } }), this.prisma.homeVisit.count({ where: { tenantId } }), this.prisma.homeVisit.count({ where: { tenantId, status: 'SCHEDULED' } }), this.prisma.homeVisit.count({ where: { tenantId, status: 'COMPLETED' } })]); return { todayVisits, total, scheduled, completed }; }
}
