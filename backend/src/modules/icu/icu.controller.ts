import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IcuService } from './icu.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('ICU') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard) @RequireFeature('MOD_ICU') @Roles('SYS_ORG_ADMIN','SYS_DOCTOR','SYS_SENIOR_DOCTOR','SYS_WARD_NURSE','SYS_CHARGE_NURSE')
@Controller('icu')
export class IcuController {
  constructor(private svc: IcuService) {}
  @Get('beds') beds(@CurrentUser('tenantId') tid: string, @Query('locationId') lid?: string) { return this.svc.listBeds(tid, lid); }
  @Post('beds') addBed(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.addBed(tid, body); }
  @Patch('beds/:id/status') updateBed(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('status') status: string) { return this.svc.updateBedStatus(tid, id, status); }
  @Post('monitoring') record(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: any) { return this.svc.recordMonitoring(tid, uid, body); }
  @Get('monitoring/admission/:admissionId') admMonitoring(@CurrentUser('tenantId') tid: string, @Param('admissionId') aid: string) { return this.svc.getAdmissionMonitoring(tid, aid); }
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string, @Query('locationId') lid?: string) { return this.svc.dashboard(tid, lid); }
}
