import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HousekeepingService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, filters: { locationId?: string; status?: string; priority?: string; wardId?: string }) {
    const where: any = { tenantId };
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.wardId) where.wardId = filters.wardId;
    return this.prisma.housekeepingTask.findMany({ where, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], take: 500 });
  }

  async create(tenantId: string, userId: string, dto: any) {
    return this.prisma.housekeepingTask.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        wardId: dto.wardId,
        bedId: dto.bedId,
        roomOrArea: dto.roomOrArea,
        taskType: dto.taskType,
        priority: dto.priority || 'NORMAL',
        description: dto.description,
        requestedById: userId,
        requestedByName: dto.requestedByName,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: 'PENDING',
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.housekeepingTask.findFirst({ where: { id, tenantId } });
      if (!task) throw new NotFoundException('Task not found');
      const { tenantId: _t, id: _i, createdAt: _c, updatedAt: _u, ...allowed } = dto;
      return tx.housekeepingTask.update({ where: { id }, data: { ...allowed, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : task.scheduledAt } });
    });
  }

  async assign(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.housekeepingTask.findFirst({ where: { id, tenantId } });
      if (!task) throw new NotFoundException('Task not found');
      return tx.housekeepingTask.update({
        where: { id },
        data: { assignedToId: dto.assignedToId, assignedToName: dto.assignedToName, status: 'ASSIGNED' },
      });
    });
  }

  async start(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.housekeepingTask.findFirst({ where: { id, tenantId } });
      if (!task) throw new NotFoundException('Task not found');
      return tx.housekeepingTask.update({ where: { id }, data: { startedAt: new Date(), status: 'IN_PROGRESS' } });
    });
  }

  async complete(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.housekeepingTask.findFirst({ where: { id, tenantId } });
      if (!task) throw new NotFoundException('Task not found');
      return tx.housekeepingTask.update({ where: { id }, data: { completedAt: new Date(), status: 'COMPLETED' } });
    });
  }

  async verify(tenantId: string, id: string, verifierId: string) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.housekeepingTask.findFirst({ where: { id, tenantId } });
      if (!task) throw new NotFoundException('Task not found');
      if (task.status !== 'COMPLETED') throw new BadRequestException('Task must be completed before verification');
      return tx.housekeepingTask.update({
        where: { id },
        data: { verifiedById: verifierId, verifiedAt: new Date(), status: 'VERIFIED' },
      });
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.housekeepingTask.findFirst({ where: { id, tenantId } });
      if (!task) throw new NotFoundException('Task not found');
      if (task.status !== 'PENDING') throw new BadRequestException('Only PENDING tasks can be deleted');
      await tx.housekeepingTask.update({ where: { id }, data: { status: 'CANCELLED' } });
      return { message: 'Housekeeping task deleted successfully' };
    });
  }

  async dashboard(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    const [pending, assigned, inProgress, completed, verified] = await Promise.all([
      this.prisma.housekeepingTask.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.housekeepingTask.count({ where: { ...where, status: 'ASSIGNED' } }),
      this.prisma.housekeepingTask.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.housekeepingTask.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.housekeepingTask.count({ where: { ...where, status: 'VERIFIED' } }),
    ]);
    return { pending, assigned, inProgress, completed, verified, total: pending + assigned + inProgress + completed + verified };
  }
}
