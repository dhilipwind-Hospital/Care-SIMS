import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AssetManagementService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, category?: string, status?: string) {
    const where: any = { tenantId };
    if (category) where.category = category;
    if (status) where.status = status;
    return this.prisma.asset.findMany({ where, orderBy: { name: 'asc' } });
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.asset.create({
      data: {
        tenantId, locationId: dto.locationId, assetCode: dto.assetCode, name: dto.name,
        category: dto.category, brand: dto.brand, model: dto.model, serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchaseCost: dto.purchaseCost, warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
        departmentId: dto.departmentId, assignedToId: dto.assignedToId, assignedToName: dto.assignedToName,
        condition: dto.condition || 'GOOD', notes: dto.notes,
      },
    });
  }

  async get(tenantId: string, id: string) {
    const a = await this.prisma.asset.findFirst({ where: { id, tenantId }, include: { maintenanceLogs: { orderBy: { createdAt: 'desc' } } } });
    if (!a) throw new NotFoundException('Asset not found');
    return a;
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.get(tenantId, id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.serialNumber !== undefined) data.serialNumber = dto.serialNumber;
    if (dto.condition !== undefined) data.condition = dto.condition;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;
    if (dto.assignedToName !== undefined) data.assignedToName = dto.assignedToName;
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.prisma.asset.update({ where: { id }, data });
  }

  async addMaintenance(tenantId: string, assetId: string, dto: any) {
    return this.prisma.assetMaintenance.create({
      data: {
        tenantId, assetId, maintenanceType: dto.maintenanceType, description: dto.description,
        performedById: dto.performedById, performedByName: dto.performedByName, vendor: dto.vendor,
        cost: dto.cost, scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
      },
    });
  }

  async listMaintenance(tenantId: string, assetId: string) {
    return this.prisma.assetMaintenance.findMany({ where: { tenantId, assetId }, orderBy: { createdAt: 'desc' } });
  }

  async completeMaintenance(tenantId: string, id: string, dto: any) {
    const existing = await this.prisma.assetMaintenance.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Maintenance record not found');
    const maint = await this.prisma.assetMaintenance.update({
      where: { id }, data: { status: 'COMPLETED', completedDate: new Date(), notes: dto.notes },
    });
    await this.prisma.asset.update({ where: { id: maint.assetId }, data: { lastMaintenanceDate: new Date(), nextMaintenanceDate: maint.nextDueDate } });
    return maint;
  }
}
