import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LinenService {
  constructor(private prisma: PrismaService) {}

  async getItems(tenantId: string) { return this.prisma.linenItem.findMany({ where: { tenantId }, orderBy: { itemType: 'asc' } }); }

  async createItem(tenantId: string, dto: any) { return this.prisma.linenItem.create({ data: { tenantId, itemType: dto.itemType, totalStock: dto.totalStock || 0 } }); }

  async recordTransaction(tenantId: string, dto: any, staffId: string) {
    const item = await this.prisma.linenItem.findFirst({ where: { id: dto.itemId, tenantId } });
    if (!item) throw new NotFoundException('Linen item not found');
    const qty = Number(dto.quantity);
    const updates: any = {};
    if (dto.transactionType === 'ISSUE') { updates.inCirculation = { increment: qty }; }
    else if (dto.transactionType === 'COLLECT') { updates.inCirculation = { decrement: qty }; }
    else if (dto.transactionType === 'LAUNDRY_SEND') { updates.inLaundry = { increment: qty }; }
    else if (dto.transactionType === 'LAUNDRY_RECEIVE') { updates.inLaundry = { decrement: qty }; }
    else if (dto.transactionType === 'DAMAGE') { updates.damaged = { increment: qty }; updates.totalStock = { decrement: qty }; }
    await this.prisma.linenItem.update({ where: { id: dto.itemId }, data: updates });
    return this.prisma.linenTransaction.create({ data: { tenantId, itemId: dto.itemId, transactionType: dto.transactionType, quantity: qty, wardId: dto.wardId, staffId, notes: dto.notes } });
  }

  async getTransactions(tenantId: string, query: any) {
    const { itemId, type, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (itemId) where.itemId = itemId;
    if (type) where.transactionType = type;
    const [data, total] = await Promise.all([this.prisma.linenTransaction.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' }, include: { item: true } }), this.prisma.linenTransaction.count({ where })]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async dashboard(tenantId: string) {
    const items = await this.prisma.linenItem.findMany({ where: { tenantId } });
    return { totalStock: items.reduce((s, i) => s + i.totalStock, 0), inCirculation: items.reduce((s, i) => s + i.inCirculation, 0), inLaundry: items.reduce((s, i) => s + i.inLaundry, 0), damaged: items.reduce((s, i) => s + i.damaged, 0), itemTypes: items.length };
  }
}
