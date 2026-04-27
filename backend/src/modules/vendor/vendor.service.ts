import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    return this.prisma.vendor.create({ data: { tenantId, name: dto.name, contactPerson: dto.contactPerson, phone: dto.phone, email: dto.email, gstNumber: dto.gstNumber, panNumber: dto.panNumber, bankDetails: dto.bankDetails, category: dto.category || 'GENERAL', address: dto.address, notes: dto.notes } });
  }

  async findAll(tenantId: string, query: any) {
    const { category, q, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { contactPerson: { contains: q, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({ where, skip, take: Number(limit), orderBy: { name: 'asc' }, include: { contracts: { where: { status: 'ACTIVE' }, take: 1 } } }),
      this.prisma.vendor.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const v = await this.prisma.vendor.findFirst({ where: { id, tenantId }, include: { contracts: true } });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  async update(tenantId: string, id: string, dto: any) {
    const v = await this.prisma.vendor.findFirst({ where: { id, tenantId } });
    if (!v) throw new NotFoundException('Vendor not found');
    const data: any = {};
    ['name', 'contactPerson', 'phone', 'email', 'gstNumber', 'panNumber', 'bankDetails', 'category', 'address', 'rating', 'isActive', 'notes'].forEach(k => { if (dto[k] !== undefined) data[k] = dto[k]; });
    return this.prisma.vendor.update({ where: { id }, data });
  }

  async addContract(tenantId: string, vendorId: string, dto: any) {
    return this.prisma.vendorContract.create({ data: { tenantId, vendorId, contractNumber: dto.contractNumber, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), terms: dto.terms, value: dto.value, autoRenew: dto.autoRenew || false, attachmentUrl: dto.attachmentUrl } });
  }

  async getContracts(tenantId: string, vendorId: string) {
    return this.prisma.vendorContract.findMany({ where: { tenantId, vendorId }, orderBy: { startDate: 'desc' } });
  }
}
