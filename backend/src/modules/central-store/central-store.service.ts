import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CentralStoreService {
  constructor(private prisma: PrismaService) {}

  async createItem(tenantId: string, dto: any) { return this.prisma.storeItem.create({ data: { tenantId, itemCode: dto.itemCode, name: dto.name, category: dto.category || 'GENERAL', unit: dto.unit || 'PCS', reorderLevel: dto.reorderLevel || 10, locationId: dto.locationId } }); }

  async getItems(tenantId: string, query: any) {
    const { category, q, lowStock, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { itemCode: { contains: q, mode: 'insensitive' } }];
    if (lowStock === 'true') where.currentStock = { lte: this.prisma.storeItem.fields?.reorderLevel || 10 };
    const [data, total] = await Promise.all([this.prisma.storeItem.findMany({ where, skip, take: Number(limit), orderBy: { name: 'asc' } }), this.prisma.storeItem.count({ where })]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async updateItem(tenantId: string, id: string, dto: any) { const item = await this.prisma.storeItem.findFirst({ where: { id, tenantId } }); if (!item) throw new NotFoundException('Item not found'); const data: any = {}; ['name', 'category', 'unit', 'reorderLevel', 'isActive'].forEach(k => { if (dto[k] !== undefined) data[k] = dto[k]; }); return this.prisma.storeItem.update({ where: { id }, data }); }

  async recordTransaction(tenantId: string, dto: any, userId: string) {
    const item = await this.prisma.storeItem.findFirst({ where: { id: dto.itemId, tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    const qty = Number(dto.quantity);
    let stockChange = 0;
    if (dto.transactionType === 'RECEIPT') stockChange = qty;
    else if (dto.transactionType === 'ISSUE') { if (item.currentStock < qty) throw new BadRequestException('Insufficient stock'); stockChange = -qty; }
    else if (dto.transactionType === 'RETURN') stockChange = qty;
    else if (dto.transactionType === 'DAMAGE') stockChange = -qty;
    else if (dto.transactionType === 'ADJUSTMENT') stockChange = qty; // can be negative

    await this.prisma.storeItem.update({ where: { id: dto.itemId }, data: { currentStock: { increment: stockChange } } });
    return this.prisma.storeTransaction.create({ data: { tenantId, itemId: dto.itemId, transactionType: dto.transactionType, quantity: qty, departmentId: dto.departmentId, indentId: dto.indentId, requestedById: dto.requestedById, issuedById: userId, notes: dto.notes } });
  }

  async getTransactions(tenantId: string, query: any) {
    const { itemId, type, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (itemId) where.itemId = itemId;
    if (type) where.transactionType = type;
    const [data, total] = await Promise.all([this.prisma.storeTransaction.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' }, include: { item: { select: { name: true, itemCode: true } } } }), this.prisma.storeTransaction.count({ where })]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async dashboard(tenantId: string) {
    const items = await this.prisma.storeItem.findMany({ where: { tenantId, isActive: true } });
    return { totalItems: items.length, lowStock: items.filter(i => i.currentStock <= i.reorderLevel).length, outOfStock: items.filter(i => i.currentStock === 0).length, totalValue: 0 };
  }
}
