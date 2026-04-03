import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WardsService {
  constructor(private prisma: PrismaService) {}

  async getWards(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    return this.prisma.ward.findMany({ where, include: { beds: true, _count: { select: { admissions: { where: { status: 'ACTIVE' } } } } }, orderBy: { name: 'asc' } });
  }

  async createWard(tenantId: string, dto: any) {
    return this.prisma.ward.create({ data: { tenantId, locationId: dto.locationId, name: dto.name, code: dto.code, type: dto.type, totalBeds: dto.totalBeds, floor: dto.floor, phoneExtension: dto.phoneExtension, chargeNurseId: dto.chargeNurseId, isIsolation: dto.isIsolation || false } });
  }

  async updateWard(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const ward = await tx.ward.findFirst({ where: { id, tenantId } });
      if (!ward) throw new NotFoundException('Ward not found');
      const data: any = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.code !== undefined) data.code = dto.code;
      if (dto.type !== undefined) data.type = dto.type;
      if (dto.totalBeds !== undefined) data.totalBeds = dto.totalBeds;
      if (dto.floor !== undefined) data.floor = dto.floor;
      if (dto.phoneExtension !== undefined) data.phoneExtension = dto.phoneExtension;
      if (dto.chargeNurseId !== undefined) data.chargeNurseId = dto.chargeNurseId;
      if (dto.isIsolation !== undefined) data.isIsolation = dto.isIsolation;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;
      return tx.ward.update({ where: { id }, data });
    });
  }

  async getBeds(tenantId: string, wardId: string) {
    return this.prisma.bed.findMany({ where: { tenantId, wardId }, include: { ward: { select: { name: true, code: true } }, admissions: { where: { status: 'ACTIVE' }, include: { patient: { select: { patientId: true, firstName: true, lastName: true } } } } }, orderBy: { bedNumber: 'asc' } });
  }

  async addBed(tenantId: string, wardId: string, dto: any) {
    const ward = await this.prisma.ward.findFirst({ where: { id: wardId, tenantId } });
    if (!ward) throw new NotFoundException('Ward not found');
    return this.prisma.bed.create({ data: { tenantId, wardId, bedNumber: dto.bedNumber, type: dto.type || 'GENERAL', status: 'AVAILABLE' } });
  }

  async getBedOccupancy(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    const wards = await this.prisma.ward.findMany({ where, include: { beds: true } });
    return wards.map(w => ({ wardId: w.id, wardName: w.name, totalBeds: w.totalBeds, availableBeds: w.beds.filter(b => b.status === 'AVAILABLE').length, occupiedBeds: w.beds.filter(b => b.status === 'OCCUPIED').length, reservedBeds: w.beds.filter(b => b.status === 'RESERVED').length, maintenanceBeds: w.beds.filter(b => b.status === 'MAINTENANCE').length }));
  }

  async updateBedStatus(tenantId: string, bedId: string, status: string) {
    return this.prisma.$transaction(async (tx) => {
      const bed = await tx.bed.findFirst({ where: { id: bedId, tenantId } });
      if (!bed) throw new NotFoundException('Bed not found');
      return tx.bed.update({ where: { id: bedId }, data: { status } });
    });
  }
}
