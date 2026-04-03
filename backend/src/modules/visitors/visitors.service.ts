import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, filters: { locationId?: string; status?: string; patientId?: string; date?: string }) {
    const where: any = { tenantId };
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.date) {
      const d = new Date(filters.date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.checkInTime = { gte: d, lt: next };
    }
    return this.prisma.visitor.findMany({ where, orderBy: { checkInTime: 'desc' }, take: 500 });
  }

  async checkIn(tenantId: string, userId: string, dto: any) {
    return this.prisma.visitor.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        patientId: dto.patientId,
        admissionId: dto.admissionId,
        visitorName: dto.visitorName,
        relationship: dto.relationship,
        phone: dto.phone,
        idType: dto.idType,
        idNumber: dto.idNumber,
        purpose: dto.purpose || 'VISIT',
        badgeNumber: dto.badgeNumber,
        escortRequired: dto.escortRequired || false,
        notes: dto.notes,
        status: 'CHECKED_IN',
        createdById: userId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const visitor = await tx.visitor.findFirst({ where: { id, tenantId } });
      if (!visitor) throw new NotFoundException('Visitor not found');
      return tx.visitor.update({ where: { id }, data: { visitorName: dto.visitorName, relationship: dto.relationship, phone: dto.phone, idType: dto.idType, idNumber: dto.idNumber, purpose: dto.purpose, badgeNumber: dto.badgeNumber, notes: dto.notes } });
    });
  }

  async checkOut(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const visitor = await tx.visitor.findFirst({ where: { id, tenantId, status: 'CHECKED_IN' } });
      if (!visitor) throw new NotFoundException('Visitor not found or already checked out');
      return tx.visitor.update({ where: { id }, data: { checkOutTime: new Date(), status: 'CHECKED_OUT' } });
    });
  }

  async activeCount(tenantId: string, locationId?: string) {
    const where: any = { tenantId, status: 'CHECKED_IN' };
    if (locationId) where.locationId = locationId;
    const count = await this.prisma.visitor.count({ where });
    return { activeVisitors: count };
  }

  async getOne(tenantId: string, id: string) {
    const v = await this.prisma.visitor.findFirst({ where: { id, tenantId } });
    if (!v) throw new NotFoundException('Visitor not found');
    return v;
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const visitor = await tx.visitor.findFirst({ where: { id, tenantId } });
      if (!visitor) throw new NotFoundException('Visitor not found');
      if (visitor.status === 'CHECKED_IN') throw new BadRequestException('Cannot delete a visitor who has already checked in');
      await tx.visitor.update({ where: { id }, data: { status: 'CANCELLED' } });
      return { message: 'Visitor deleted successfully' };
    });
  }
}
