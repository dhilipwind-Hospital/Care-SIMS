import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class PurchaseIndentService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: any, requestedById: string) {
    return generateSequentialId(this.prisma, {
      table: 'PurchaseIndent', idColumn: 'indentNumber', prefix: `IND-${new Date().getFullYear()}-`, tenantId, padLength: 5,
      callback: async (tx, indentNumber) => tx.purchaseIndent.create({ data: { tenantId, indentNumber, requestedById, departmentId: dto.departmentId, items: dto.items, notes: dto.notes, status: 'DRAFT' } }),
    });
  }

  async findAll(tenantId: string, query: any) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (status) where.status = status;
    const [data, total] = await Promise.all([this.prisma.purchaseIndent.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }), this.prisma.purchaseIndent.count({ where })]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async findOne(tenantId: string, id: string) { const r = await this.prisma.purchaseIndent.findFirst({ where: { id, tenantId } }); if (!r) throw new NotFoundException('Indent not found'); return r; }

  async submit(tenantId: string, id: string) { const r = await this.prisma.purchaseIndent.findFirst({ where: { id, tenantId } }); if (!r) throw new NotFoundException('Not found'); return this.prisma.purchaseIndent.update({ where: { id }, data: { status: 'SUBMITTED' } }); }

  async approve(tenantId: string, id: string, approvedById: string) { const r = await this.prisma.purchaseIndent.findFirst({ where: { id, tenantId } }); if (!r) throw new NotFoundException('Not found'); return this.prisma.purchaseIndent.update({ where: { id }, data: { status: 'APPROVED', approvedById, approvedAt: new Date() } }); }

  async reject(tenantId: string, id: string, approvedById: string, reason: string) { const r = await this.prisma.purchaseIndent.findFirst({ where: { id, tenantId } }); if (!r) throw new NotFoundException('Not found'); return this.prisma.purchaseIndent.update({ where: { id }, data: { status: 'REJECTED', approvedById, approvedAt: new Date(), rejectionReason: reason } }); }

  // Record receipt of goods against an APPROVED (or PARTIALLY_FULFILLED) indent.
  // For each provided line we create a StoreTransaction RECEIPT, bump the
  // StoreItem stock, and update the item's last-known unit price when
  // supplied. The indent transitions to FULFILLED if every requested line
  // was received in full this round (or cumulatively across rounds);
  // otherwise PARTIALLY_FULFILLED.
  async fulfill(
    tenantId: string,
    id: string,
    dto: { lines: Array<{ storeItemId: string; quantityReceived: number; unitPrice?: number; notes?: string }> },
    receivedById: string,
  ) {
    if (!dto?.lines?.length) throw new BadRequestException('At least one receipt line is required');

    return this.prisma.$transaction(async (tx) => {
      const indent = await tx.purchaseIndent.findFirst({ where: { id, tenantId } });
      if (!indent) throw new NotFoundException('Indent not found');
      if (!['APPROVED', 'PARTIALLY_FULFILLED'].includes(indent.status)) {
        throw new BadRequestException(`Cannot fulfill indent in status ${indent.status}`);
      }

      // Validate every store item belongs to this tenant before any writes.
      const itemIds = Array.from(new Set(dto.lines.map(l => l.storeItemId)));
      const storeItems = await tx.storeItem.findMany({
        where: { id: { in: itemIds }, tenantId, isActive: true },
        select: { id: true },
      });
      const valid = new Set(storeItems.map(s => s.id));
      const missing = itemIds.filter(i => !valid.has(i));
      if (missing.length) throw new BadRequestException(`Unknown store item(s): ${missing.join(', ')}`);

      for (const line of dto.lines) {
        const qty = Number(line.quantityReceived);
        if (!qty || qty <= 0) continue;
        const itemUpdate: any = { currentStock: { increment: qty } };
        if (line.unitPrice != null) itemUpdate.unitPrice = Number(line.unitPrice);
        await tx.storeItem.update({ where: { id: line.storeItemId }, data: itemUpdate });
        await tx.storeTransaction.create({
          data: {
            tenantId,
            itemId: line.storeItemId,
            transactionType: 'RECEIPT',
            quantity: qty,
            unitPrice: line.unitPrice != null ? Number(line.unitPrice) : undefined,
            indentId: indent.id,
            issuedById: receivedById,
            notes: line.notes ?? `Receipt against ${indent.indentNumber}`,
          },
        });
      }

      // Decide new indent status. Without per-indent-line totals we infer:
      // if every JSON item has been receipt-covered by at least one
      // StoreTransaction tied to this indent, mark FULFILLED; else PARTIALLY.
      // Heuristic: count distinct store items touched against the indent so
      // far vs the number of indent JSON lines.
      const lineTotal = Array.isArray(indent.items) ? (indent.items as any[]).length : 0;
      const distinctReceiptItems = await tx.storeTransaction.findMany({
        where: { tenantId, indentId: indent.id, transactionType: 'RECEIPT' },
        select: { itemId: true },
        distinct: ['itemId'],
      });
      const nextStatus = distinctReceiptItems.length >= lineTotal ? 'FULFILLED' : 'PARTIALLY_FULFILLED';

      return tx.purchaseIndent.update({ where: { id }, data: { status: nextStatus } });
    });
  }
}
