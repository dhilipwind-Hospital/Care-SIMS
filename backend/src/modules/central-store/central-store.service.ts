import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CentralStoreService {
  constructor(private prisma: PrismaService) {}

  async createItem(tenantId: string, dto: any) {
    return this.prisma.storeItem.create({
      data: {
        tenantId,
        itemCode: dto.itemCode,
        name: dto.name,
        category: dto.category || 'GENERAL',
        unit: dto.unit || 'PCS',
        reorderLevel: dto.reorderLevel || 10,
        unitPrice: dto.unitPrice ?? undefined,
        locationId: dto.locationId,
      },
    });
  }

  async getItems(tenantId: string, query: any) {
    const { category, q, status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { itemCode: { contains: q, mode: 'insensitive' } }];

    // Status filter handled server-side so paginated views show the right
    // population. Was previously filtered on the FE *after* pagination,
    // which meant page 1 of 20 items only showed the LOW ones among those
    // 20 — most low-stock items stayed invisible.
    //
    // "LOW" means currentStock <= reorderLevel AND > 0 (out-of-stock is
    // a separate bucket the user navigates to explicitly).
    // The two filters need to compare two columns, which Prisma doesn't
    // support directly — fall back to a raw id-list pre-query.
    if (status === 'LOW' || status === 'OUT') {
      const rows = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        status === 'OUT'
          ? `SELECT id FROM store_items WHERE tenant_id = $1 AND is_active = true AND current_stock = 0`
          : `SELECT id FROM store_items WHERE tenant_id = $1 AND is_active = true AND current_stock > 0 AND current_stock <= reorder_level`,
        tenantId,
      );
      const ids = rows.map(r => r.id);
      if (!ids.length) return { data: [], meta: { total: 0, page: Number(page), limit: Number(limit) } };
      where.id = { in: ids };
    }

    const [data, total] = await Promise.all([
      this.prisma.storeItem.findMany({ where, skip, take: Number(limit), orderBy: { name: 'asc' } }),
      this.prisma.storeItem.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async updateItem(tenantId: string, id: string, dto: any) {
    const item = await this.prisma.storeItem.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    const data: any = {};
    ['name', 'category', 'unit', 'reorderLevel', 'unitPrice', 'isActive'].forEach(k => {
      if (dto[k] !== undefined) data[k] = dto[k];
    });
    return this.prisma.storeItem.update({ where: { id }, data });
  }

  async recordTransaction(tenantId: string, dto: any, userId: string) {
    const item = await this.prisma.storeItem.findFirst({ where: { id: dto.itemId, tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    const qty = Number(dto.quantity);
    let stockChange = 0;
    if (dto.transactionType === 'RECEIPT') stockChange = qty;
    else if (dto.transactionType === 'ISSUE') {
      if (item.currentStock < qty) throw new BadRequestException('Insufficient stock');
      stockChange = -qty;
    }
    else if (dto.transactionType === 'RETURN') stockChange = qty;
    else if (dto.transactionType === 'DAMAGE') stockChange = -qty;
    else if (dto.transactionType === 'ADJUSTMENT') stockChange = qty; // can be negative

    // Receipts update the item's last-known unit price so dashboard valuation
    // stays current without manual catalog edits.
    const itemUpdate: any = { currentStock: { increment: stockChange } };
    if (dto.transactionType === 'RECEIPT' && dto.unitPrice != null) {
      itemUpdate.unitPrice = Number(dto.unitPrice);
    }
    await this.prisma.storeItem.update({ where: { id: dto.itemId }, data: itemUpdate });

    return this.prisma.storeTransaction.create({
      data: {
        tenantId,
        itemId: dto.itemId,
        transactionType: dto.transactionType,
        quantity: qty,
        unitPrice: dto.unitPrice != null ? Number(dto.unitPrice) : undefined,
        departmentId: dto.departmentId,
        indentId: dto.indentId,
        requestedById: dto.requestedById,
        issuedById: userId,
        issuedTo: dto.issuedTo,
        notes: dto.notes,
      },
    });
  }

  async getTransactions(tenantId: string, query: any) {
    const { itemId, type, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (itemId) where.itemId = itemId;
    if (type) where.transactionType = type;
    const [data, total] = await Promise.all([
      this.prisma.storeTransaction.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: { item: { select: { name: true, itemCode: true, unit: true } } },
      }),
      this.prisma.storeTransaction.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async dashboard(tenantId: string) {
    const items = await this.prisma.storeItem.findMany({
      where: { tenantId, isActive: true },
      select: { currentStock: true, reorderLevel: true, unitPrice: true },
    });
    const totalValue = items.reduce(
      (s, i) => s + (i.unitPrice ? Number(i.unitPrice) * i.currentStock : 0),
      0,
    );
    return {
      totalItems: items.length,
      lowStock: items.filter(i => i.currentStock > 0 && i.currentStock <= i.reorderLevel).length,
      outOfStock: items.filter(i => i.currentStock === 0).length,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }
}
