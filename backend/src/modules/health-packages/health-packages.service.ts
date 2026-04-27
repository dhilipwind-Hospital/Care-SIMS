import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthPackagesService {
  constructor(private prisma: PrismaService) {}

  async createPackage(tenantId: string, dto: any) {
    return this.prisma.healthPackage.create({ data: { tenantId, name: dto.name, description: dto.description, targetGender: dto.targetGender, targetAgeGroup: dto.targetAgeGroup, tests: dto.tests || [], consultations: dto.consultations || [], price: dto.price, discountedPrice: dto.discountedPrice } });
  }

  async getPackages(tenantId: string) { return this.prisma.healthPackage.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } }); }

  async updatePackage(tenantId: string, id: string, dto: any) {
    const pkg = await this.prisma.healthPackage.findFirst({ where: { id, tenantId } });
    if (!pkg) throw new NotFoundException('Package not found');
    const data: any = {};
    ['name', 'description', 'targetGender', 'targetAgeGroup', 'tests', 'consultations', 'price', 'discountedPrice', 'isActive'].forEach(k => { if (dto[k] !== undefined) data[k] = dto[k]; });
    return this.prisma.healthPackage.update({ where: { id }, data });
  }

  async bookPackage(tenantId: string, dto: any) {
    return this.prisma.healthPackageBooking.create({ data: { tenantId, packageId: dto.packageId, patientId: dto.patientId, notes: dto.notes } });
  }

  async getBookings(tenantId: string, query: any) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.healthPackageBooking.findMany({ where, skip, take: Number(limit), orderBy: { bookedDate: 'desc' }, include: { package: { select: { name: true, price: true } } } }),
      this.prisma.healthPackageBooking.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async updateBooking(tenantId: string, id: string, dto: any) {
    const b = await this.prisma.healthPackageBooking.findFirst({ where: { id, tenantId } });
    if (!b) throw new NotFoundException('Booking not found');
    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.completedTests !== undefined) data.completedTests = dto.completedTests;
    if (dto.invoiceId !== undefined) data.invoiceId = dto.invoiceId;
    return this.prisma.healthPackageBooking.update({ where: { id }, data });
  }
}
