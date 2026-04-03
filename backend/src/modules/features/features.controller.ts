import { Controller, Get, Patch, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Features') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SYS_ORG_ADMIN') @Controller('org/features')
export class FeaturesController {
  constructor(private svc: FeaturesService) {}

  @Get() getAll(@CurrentUser('tenantId') tid: string) { return this.svc.getOrgFeatures(tid); }
  @Patch(':moduleId/enable') enable(@CurrentUser('tenantId') tid: string, @Param('moduleId') mid: string, @CurrentUser('sub') uid: string) { return this.svc.toggleFeature(tid, mid, true, uid); }
  @Patch(':moduleId/disable') disable(@CurrentUser('tenantId') tid: string, @Param('moduleId') mid: string, @CurrentUser('sub') uid: string) { return this.svc.toggleFeature(tid, mid, false, uid); }
  @Put(':moduleId/config') config(@CurrentUser('tenantId') tid: string, @Param('moduleId') mid: string, @Body() body: any) { return this.svc.updateConfig(tid, mid, body); }
}
