import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DischargeSummaryService } from './discharge-summary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Discharge Summary')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_DISCHARGE')
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE')
@Controller('discharge-summary')
export class DischargeSummaryController {
  constructor(private svc: DischargeSummaryService) {}

  @Get()
  list(
    @CurrentUser('tenantId') tid: string,
    @Query('locationId') lid?: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.svc.list(tid, { locationId: lid, status, patientId });
  }

  @Post()
  create(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: any) {
    return this.svc.create(tid, uid, body);
  }

  @Patch(':id')
  update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(tid, id, body);
  }

  @Patch(':id/approve')
  approve(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Param('id') id: string) {
    return this.svc.approve(tid, id, uid);
  }

  @Get('admission/:admissionId')
  getByAdmission(@CurrentUser('tenantId') tid: string, @Param('admissionId') aid: string) {
    return this.svc.getByAdmission(tid, aid);
  }

  @Get(':id')
  getOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) {
    return this.svc.getOne(tid, id);
  }
}
