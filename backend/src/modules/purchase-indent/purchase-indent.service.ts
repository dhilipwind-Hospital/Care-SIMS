import { Injectable, NotFoundException } from '@nestjs/common';
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
}
