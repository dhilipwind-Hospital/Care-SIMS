import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async getMyTenant(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        locations: { where: { isActive: true } },
        features: { where: { isEnabled: true }, include: { module: true } },
      },
    });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async updateSettings(tenantId: string, dto: any) {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!t) throw new NotFoundException('Tenant not found');
    const data: any = {};
    if (dto.tradeName !== undefined) data.tradeName = dto.tradeName;
    if (dto.legalName !== undefined) data.legalName = dto.legalName;
    if (dto.primaryEmail !== undefined) data.primaryEmail = dto.primaryEmail;
    if (dto.primaryPhone !== undefined) data.primaryPhone = dto.primaryPhone;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.dateFormat !== undefined) data.dateFormat = dto.dateFormat;
    if (dto.financialYearStart !== undefined) data.financialYearStart = dto.financialYearStart;
    if (dto.gstin !== undefined) data.gstin = dto.gstin;
    if (dto.pan !== undefined) data.pan = dto.pan;
    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }

  async getLocations(tenantId: string) {
    return this.prisma.tenantLocation.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getFeatures(tenantId: string) {
    return this.prisma.organizationFeature.findMany({
      where: { tenantId },
      include: { module: true },
    });
  }

  async toggleFeature(tenantId: string, featureId: string, isEnabled: boolean) {
    const feature = await this.prisma.organizationFeature.findFirst({ where: { id: featureId, tenantId } });
    if (!feature) throw new NotFoundException('Feature not found');
    return this.prisma.organizationFeature.update({ where: { id: featureId }, data: { isEnabled } });
  }
}
