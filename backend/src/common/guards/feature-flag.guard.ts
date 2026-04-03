import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredModule) return true;

    const { user } = context.switchToHttp().getRequest();
    if (user?.type === 'PLATFORM') return true;
    if (!user?.tenantId) {
      throw new ForbiddenException('Tenant context required for feature-gated endpoints.');
    }

    const feature = await this.prisma.organizationFeature.findUnique({
      where: { tenantId_moduleId: { tenantId: user.tenantId, moduleId: requiredModule } },
    });

    if (!feature?.isEnabled) {
      throw new ForbiddenException(`Feature '${requiredModule}' is not enabled for your organization.`);
    }
    return true;
  }
}
