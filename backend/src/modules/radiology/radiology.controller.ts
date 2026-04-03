import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RadiologyService } from './radiology.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('Radiology') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard) @RequireFeature('MOD_RADIOLOGY') @Roles('SYS_ORG_ADMIN','SYS_DOCTOR','SYS_SENIOR_DOCTOR','SYS_RADIOLOGIST')
@Controller('radiology')
export class RadiologyController {
  constructor(private svc: RadiologyService) {}
  @Get('orders') list(@CurrentUser('tenantId') tid: string, @Query('status') s?: string, @Query('modality') m?: string) { return this.svc.listOrders(tid, s, m); }
  @Post('orders') create(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createOrder(tid, body); }
  @Get('orders/:id') getOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getOrder(tid, id); }
  @Patch('orders/:id') updateOrder(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateOrder(tid, id, body); }
  @Post('results') addResult(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: any) { return this.svc.addResult(tid, uid, body); }
  @Patch('results/:id/validate') validate(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Param('id') id: string) { return this.svc.validateResult(tid, id, uid); }
  @Delete('orders/:id') remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
  @Get('modalities') modalities() { return ['X-RAY','CT','MRI','ULTRASOUND','MAMMOGRAPHY','FLUOROSCOPY','DEXA','PET_CT']; }
}
