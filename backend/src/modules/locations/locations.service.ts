import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.tenantLocation.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async create(tenantId: string, dto: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const count = await this.prisma.tenantLocation.count({ where: { tenantId, isActive: true } });
    if (count >= tenant.maxLocations) throw new BadRequestException(`Location limit (${tenant.maxLocations}) reached for your plan`);
    // Map frontend fields to Prisma schema fields
    const addr = dto.address || {};
    return this.prisma.tenantLocation.create({
      data: {
        tenantId,
        name: dto.name,
        locationCode: dto.code || dto.locationCode || dto.name?.replace(/\s+/g, '-').toUpperCase().slice(0, 10) || 'LOC',
        type: dto.type || 'BRANCH',
        addressLine1: addr.line1 || dto.addressLine1 || '',
        addressLine2: addr.line2 || dto.addressLine2 || undefined,
        city: addr.city || dto.city || '',
        state: addr.state || dto.state || '',
        pinCode: addr.pin || dto.pinCode || '',
        country: addr.country || dto.country || 'IN',
        phone: dto.phone || undefined,
        email: dto.email || undefined,
        ...(dto.pharmacyLicenseNo && { pharmacyLicenseNo: dto.pharmacyLicenseNo }),
        ...(dto.labLicenseNo && { labLicenseNo: dto.labLicenseNo }),
        ...(dto.gstin && { gstin: dto.gstin }),
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const loc = await this.prisma.tenantLocation.findFirst({ where: { id, tenantId } });
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    const addr = dto.address || {};
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code || dto.locationCode) data.locationCode = dto.code || dto.locationCode;
    if (dto.type !== undefined) data.type = dto.type;
    if (addr.line1 || dto.addressLine1) data.addressLine1 = addr.line1 || dto.addressLine1;
    if (addr.line2 !== undefined || dto.addressLine2 !== undefined) data.addressLine2 = addr.line2 || dto.addressLine2;
    if (addr.city || dto.city) data.city = addr.city || dto.city;
    if (addr.state || dto.state) data.state = addr.state || dto.state;
    if (addr.pin || dto.pinCode) data.pinCode = addr.pin || dto.pinCode;
    if (addr.country || dto.country) data.country = addr.country || dto.country;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.pharmacyLicenseNo !== undefined) data.pharmacyLicenseNo = dto.pharmacyLicenseNo;
    if (dto.labLicenseNo !== undefined) data.labLicenseNo = dto.labLicenseNo;
    return this.prisma.tenantLocation.update({ where: { id }, data });
  }

  async deactivate(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.tenantLocation.update({ where: { id }, data: { isActive: false } });
  }
}
