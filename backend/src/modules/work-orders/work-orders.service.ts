import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: any, userId: string) { return generateSequentialId(this.prisma, { table: 'WorkOrder', idColumn: 'workOrderNumber', prefix: `WO-${new Date().getFullYear()}-`, tenantId, padLength: 5, callback: async (tx, workOrderNumber) => tx.workOrder.create({ data: { tenantId, workOrderNumber, requestedById: userId, departmentId: dto.departmentId, locationId: dto.locationId, category: dto.category, priority: dto.priority || 'MEDIUM', description: dto.description, estimatedCost: dto.estimatedCost, notes: dto.notes } }) }); }

  async getAll(tenantId: string, query: any) { const { category, priority, status, page = 1, limit = 20 } = query; const where: any = { tenantId }; if (category) where.category = category; if (priority) where.priority = priority; if (status) where.status = status; const [data, total] = await Promise.all([this.prisma.workOrder.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { createdAt: 'desc' } }), this.prisma.workOrder.count({ where })]); return { data, meta: { total, page: Number(page), limit: Number(limit) } }; }

  async getOne(tenantId: string, id: string) { const w = await this.prisma.workOrder.findFirst({ where: { id, tenantId } }); if (!w) throw new NotFoundException('Not found'); return w; }

  async update(tenantId: string, id: string, dto: any) { const w = await this.prisma.workOrder.findFirst({ where: { id, tenantId } }); if (!w) throw new NotFoundException('Not found'); const data: any = {}; ['assignedToId', 'assignedToName', 'status', 'estimatedCost', 'actualCost', 'satisfactionRating', 'notes'].forEach(k => { if (dto[k] !== undefined) data[k] = dto[k]; }); if (dto.status === 'IN_PROGRESS' && !w.startedAt) data.startedAt = new Date(); if (dto.status === 'COMPLETED') data.completedAt = new Date(); return this.prisma.workOrder.update({ where: { id }, data }); }

  async dashboard(tenantId: string) { const [open, inProgress, completed, total] = await Promise.all([this.prisma.workOrder.count({ where: { tenantId, status: 'OPEN' } }), this.prisma.workOrder.count({ where: { tenantId, status: 'IN_PROGRESS' } }), this.prisma.workOrder.count({ where: { tenantId, status: 'COMPLETED' } }), this.prisma.workOrder.count({ where: { tenantId } })]); return { open, inProgress, completed, total }; }
}
