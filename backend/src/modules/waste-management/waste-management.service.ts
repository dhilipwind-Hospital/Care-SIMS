import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WasteManagementService {
  constructor(private prisma: PrismaService) {}

  async record(tenantId: string, dto: any, userId: string) {
    return this.prisma.wasteCollection.create({ data: { tenantId, locationId: dto.locationId, wasteCategory: dto.wasteCategory, weightKg: dto.weightKg, collectedById: userId, handedToVendor: dto.handedToVendor || false, vendorName: dto.vendorName, manifestNumber: dto.manifestNumber, disposalMethod: dto.disposalMethod, notes: dto.notes } });
  }

  async getAll(tenantId: string, query: any) {
    const { category, from, to, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (category) where.wasteCategory = category;
    if (from || to) { where.collectedAt = {}; if (from) where.collectedAt.gte = new Date(from); if (to) where.collectedAt.lte = new Date(to); }
    const [data, total] = await Promise.all([this.prisma.wasteCollection.findMany({ where, skip, take: Number(limit), orderBy: { collectedAt: 'desc' } }), this.prisma.wasteCollection.count({ where })]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async dashboard(tenantId: string, query: any) {
    const { from, to } = query;
    const where: any = { tenantId };
    if (from || to) { where.collectedAt = {}; if (from) where.collectedAt.gte = new Date(from); if (to) where.collectedAt.lte = new Date(to); }
    const all = await this.prisma.wasteCollection.findMany({ where });
    const byCategory: Record<string, { count: number; totalKg: number }> = {};
    all.forEach(w => { if (!byCategory[w.wasteCategory]) byCategory[w.wasteCategory] = { count: 0, totalKg: 0 }; byCategory[w.wasteCategory].count++; byCategory[w.wasteCategory].totalKg += Number(w.weightKg); });
    return { totalCollections: all.length, totalWeightKg: all.reduce((s, w) => s + Number(w.weightKg), 0), byCategory, handedToVendor: all.filter(w => w.handedToVendor).length };
  }
}
