import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class GrievanceService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, status?: string, category?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    if (category) where.category = category;
    return this.prisma.grievance.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async create(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'Grievance',
      idColumn: 'ticketNumber',
      prefix: 'GRV-',
      tenantId,
      callback: async (tx, ticketNumber) => {
        return tx.grievance.create({
          data: {
            tenantId, ticketNumber,
            locationId: dto.locationId, complainantType: dto.complainantType, complainantName: dto.complainantName,
            complainantPhone: dto.complainantPhone, complainantEmail: dto.complainantEmail,
            patientId: dto.patientId, category: dto.category, severity: dto.severity || 'MEDIUM',
            subject: dto.subject, description: dto.description, departmentId: dto.departmentId,
          },
        });
      },
    });
  }

  async get(tenantId: string, id: string) {
    const g = await this.prisma.grievance.findFirst({ where: { id, tenantId } });
    if (!g) throw new NotFoundException('Grievance not found');
    return g;
  }

  async assign(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.grievance.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Grievance not found');
      return tx.grievance.update({ where: { id }, data: { assignedToId: dto.assignedToId, assignedToName: dto.assignedToName, status: 'ASSIGNED' } });
    });
  }

  async resolve(tenantId: string, id: string, userId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.grievance.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Grievance not found');
      return tx.grievance.update({ where: { id }, data: { resolution: dto.resolution, resolvedAt: new Date(), resolvedById: userId, status: 'RESOLVED' } });
    });
  }

  async escalate(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.grievance.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Grievance not found');
      return tx.grievance.update({ where: { id }, data: { escalatedTo: dto.escalatedTo, escalatedAt: new Date(), status: 'ESCALATED' } });
    });
  }

  async feedback(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.grievance.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Grievance not found');
      return tx.grievance.update({ where: { id }, data: { satisfactionScore: dto.satisfactionScore, status: 'CLOSED' } });
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const grievance = await tx.grievance.findFirst({ where: { id, tenantId } });
      if (!grievance) throw new NotFoundException('Grievance not found');
      if (grievance.status !== 'OPEN') throw new BadRequestException('Only OPEN grievances can be deleted');
      await tx.grievance.update({ where: { id }, data: { status: 'CANCELLED' } });
      return { message: 'Grievance deleted successfully' };
    });
  }
}
