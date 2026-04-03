import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FeaturesService {
  constructor(private prisma: PrismaService) {}

  async getOrgFeatures(tenantId: string) {
    return this.prisma.organizationFeature.findMany({
      where: { tenantId },
      include: { module: true },
      orderBy: [{ module: { category: 'asc' } }, { module: { sortOrder: 'asc' } }],
    });
  }

  async toggleFeature(tenantId: string, moduleId: string, isEnabled: boolean, userId: string) {
    return this.prisma.organizationFeature.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId } },
      update: { isEnabled, enabledById: userId, enabledAt: new Date() },
      create: { tenantId, moduleId, isEnabled, enabledById: userId, enabledAt: new Date() },
    });
  }

  async updateConfig(tenantId: string, moduleId: string, config: any) {
    return this.prisma.organizationFeature.update({
      where: { tenantId_moduleId: { tenantId, moduleId } },
      data: { config },
    });
  }
}
