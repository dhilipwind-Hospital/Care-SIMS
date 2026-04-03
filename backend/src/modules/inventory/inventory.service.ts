import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async listItems(tenantId: string, category?: string, lowStock?: boolean) {
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    const items = await this.prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } });
    if (lowStock) return items.filter(i => i.currentStock <= i.reorderLevel);
    return items;
  }

  async addItem(tenantId: string, dto: any) {
    return this.prisma.inventoryItem.create({
      data: {
        tenantId, locationId: dto.locationId, itemCode: dto.itemCode, name: dto.name,
        category: dto.category, subcategory: dto.subcategory, unitOfMeasure: dto.unitOfMeasure,
        currentStock: dto.currentStock || 0, reorderLevel: dto.reorderLevel || 10,
        maxStockLevel: dto.maxStockLevel || 100, unitCost: dto.unitCost,
        supplier: dto.supplier, storageLocation: dto.storageLocation, isConsumable: dto.isConsumable ?? true,
      },
    });
  }

  async getItem(tenantId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id, tenantId }, include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async updateItem(tenantId: string, id: string, dto: any) {
    await this.getItem(tenantId, id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.subcategory !== undefined) data.subcategory = dto.subcategory;
    if (dto.unitOfMeasure !== undefined) data.unitOfMeasure = dto.unitOfMeasure;
    if (dto.reorderLevel !== undefined) data.reorderLevel = dto.reorderLevel;
    if (dto.maxStockLevel !== undefined) data.maxStockLevel = dto.maxStockLevel;
    if (dto.unitCost !== undefined) data.unitCost = dto.unitCost;
    if (dto.supplier !== undefined) data.supplier = dto.supplier;
    if (dto.storageLocation !== undefined) data.storageLocation = dto.storageLocation;
    if (dto.isConsumable !== undefined) data.isConsumable = dto.isConsumable;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.inventoryItem.update({ where: { id }, data });
  }

  async stockIn(tenantId: string, userId: string, dto: any) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: dto.itemId, tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({ where: { id: dto.itemId }, data: { currentStock: { increment: dto.quantity }, lastRestockedAt: new Date() } });
      return tx.inventoryTransaction.create({
        data: { tenantId, itemId: dto.itemId, transactionType: 'STOCK_IN', quantity: dto.quantity, referenceType: dto.referenceType, referenceId: dto.referenceId, remarks: dto.remarks, performedById: userId },
      });
    });
  }

  async stockOut(tenantId: string, userId: string, dto: any) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: dto.itemId, tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.currentStock < dto.quantity) throw new BadRequestException('Insufficient stock');
    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({ where: { id: dto.itemId }, data: { currentStock: { decrement: dto.quantity } } });
      return tx.inventoryTransaction.create({
        data: { tenantId, itemId: dto.itemId, transactionType: 'STOCK_OUT', quantity: dto.quantity, departmentId: dto.departmentId, referenceType: dto.referenceType, referenceId: dto.referenceId, remarks: dto.remarks, performedById: userId },
      });
    });
  }

  async listTransactions(tenantId: string, itemId?: string) {
    const where: any = { tenantId };
    if (itemId) where.itemId = itemId;
    return this.prisma.inventoryTransaction.findMany({ where, include: { item: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async lowStockItems(tenantId: string) {
    const items = await this.prisma.inventoryItem.findMany({ where: { tenantId, isActive: true } });
    return items.filter(i => i.currentStock <= i.reorderLevel);
  }
}
