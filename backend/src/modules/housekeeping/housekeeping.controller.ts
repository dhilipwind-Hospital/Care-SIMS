import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HousekeepingService } from './housekeeping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Housekeeping')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_HOUSEKEEPING')
@Roles('SYS_ORG_ADMIN', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE', 'SYS_HOUSEKEEPING')
@Controller('housekeeping')
export class HousekeepingController {
  constructor(private svc: HousekeepingService) {}

  @Get()
  list(
    @CurrentUser('tenantId') tid: string,
    @Query('locationId') lid?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('wardId') wardId?: string,
  ) {
    return this.svc.list(tid, { locationId: lid, status, priority, wardId });
  }

  @Post()
  create(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: any) {
    return this.svc.create(tid, uid, body);
  }

  @Patch(':id')
  update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(tid, id, body);
  }

  @Patch(':id/assign')
  assign(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) {
    return this.svc.assign(tid, id, body);
  }

  @Patch(':id/start')
  start(@CurrentUser('tenantId') tid: string, @Param('id') id: string) {
    return this.svc.start(tid, id);
  }

  @Patch(':id/complete')
  complete(@CurrentUser('tenantId') tid: string, @Param('id') id: string) {
    return this.svc.complete(tid, id);
  }

  @Patch(':id/verify')
  verify(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Param('id') id: string) {
    return this.svc.verify(tid, id, uid);
  }

  @Delete(':id')
  remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) {
    return this.svc.remove(tid, id);
  }

  @Get('dashboard')
  dashboard(@CurrentUser('tenantId') tid: string, @Query('locationId') lid?: string) {
    return this.svc.dashboard(tid, lid);
  }
}
