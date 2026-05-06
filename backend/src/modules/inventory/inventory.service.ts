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
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        batches: { where: { isActive: true }, orderBy: { expiryDate: 'asc' } },
      },
    });
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
      await tx.inventoryItem.update({
        where: { id: dto.itemId },
        data: { currentStock: { increment: dto.quantity }, lastRestockedAt: new Date() },
      });
      const tx_record = await tx.inventoryTransaction.create({
        data: {
          tenantId, itemId: dto.itemId, transactionType: 'STOCK_IN', quantity: dto.quantity,
          referenceType: dto.referenceType, referenceId: dto.referenceId, remarks: dto.remarks, performedById: userId,
        },
      });
      if (dto.batchNumber) {
        await tx.inventoryBatch.create({
          data: {
            tenantId, itemId: dto.itemId, batchNumber: dto.batchNumber,
            manufacturerName: dto.manufacturerName, supplierName: dto.supplierName,
            invoiceNumber: dto.invoiceNumber,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
            manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : undefined,
            quantityReceived: dto.quantity, quantityRemaining: dto.quantity,
            unitCost: dto.unitCost, receivedById: userId,
          },
        });
      }
      return tx_record;
    });
  }

  async stockOut(tenantId: string, userId: string, dto: any) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: dto.itemId, tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.currentStock < dto.quantity) throw new BadRequestException('Insufficient stock');
    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({ where: { id: dto.itemId }, data: { currentStock: { decrement: dto.quantity } } });
      // FEFO: decrement oldest-expiry batches first
      if (dto.batchId) {
        const batch = await tx.inventoryBatch.findFirst({ where: { id: dto.batchId, tenantId, isActive: true } });
        if (batch) {
          const remaining = batch.quantityRemaining - dto.quantity;
          await tx.inventoryBatch.update({ where: { id: dto.batchId }, data: { quantityRemaining: Math.max(0, remaining), isActive: remaining > 0 } });
        }
      } else {
        // Auto-FEFO: consume from earliest-expiry batches
        const batches = await tx.inventoryBatch.findMany({
          where: { tenantId, itemId: dto.itemId, isActive: true, quantityRemaining: { gt: 0 } },
          orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
        });
        let remaining = dto.quantity;
        for (const b of batches) {
          if (remaining <= 0) break;
          const consume = Math.min(b.quantityRemaining, remaining);
          remaining -= consume;
          const newQty = b.quantityRemaining - consume;
          await tx.inventoryBatch.update({ where: { id: b.id }, data: { quantityRemaining: newQty, isActive: newQty > 0 } });
        }
      }
      return tx.inventoryTransaction.create({
        data: {
          tenantId, itemId: dto.itemId, transactionType: 'STOCK_OUT', quantity: dto.quantity,
          departmentId: dto.departmentId, departmentName: dto.departmentName,
          batchId: dto.batchId, referenceType: dto.referenceType, referenceId: dto.referenceId,
          remarks: dto.remarks, performedById: userId,
        },
      });
    });
  }

  async listBatches(tenantId: string, itemId?: string) {
    const where: any = { tenantId };
    if (itemId) where.itemId = itemId;
    return this.prisma.inventoryBatch.findMany({
      where,
      include: { item: { select: { name: true, itemCode: true, unitOfMeasure: true } } },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async nearExpiryItems(tenantId: string, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const today = new Date();
    return this.prisma.inventoryBatch.findMany({
      where: {
        tenantId, isActive: true, quantityRemaining: { gt: 0 },
        expiryDate: { lte: cutoff },
      },
      include: { item: { select: { name: true, itemCode: true, unitOfMeasure: true, storageLocation: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async departmentStockHistory(tenantId: string, departmentName?: string) {
    const where: any = { tenantId, transactionType: 'STOCK_OUT' };
    if (departmentName) where.departmentName = departmentName;
    const txns = await this.prisma.inventoryTransaction.findMany({
      where,
      include: { item: { select: { name: true, itemCode: true, unitOfMeasure: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    // Group by department
    const grouped: Record<string, any[]> = {};
    for (const t of txns) {
      const dept = t.departmentName || t.departmentId || 'Unknown';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(t);
    }
    return Object.entries(grouped).map(([department, transactions]) => ({ department, transactions, totalQty: transactions.reduce((s, t) => s + t.quantity, 0) }));
  }

  async stockAdjust(tenantId: string, userId: string, dto: any) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: dto.itemId, tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    const diff = dto.newQuantity - item.currentStock;
    const type = diff >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({ where: { id: dto.itemId }, data: { currentStock: dto.newQuantity } });
      return tx.inventoryTransaction.create({
        data: {
          tenantId, itemId: dto.itemId, transactionType: type, quantity: Math.abs(diff),
          remarks: dto.reason || 'Manual stock adjustment', performedById: userId,
        },
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
