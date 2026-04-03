import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_REPORTS')
@Roles('SYS_ORG_ADMIN', 'SYS_BILLING_MANAGER', 'SYS_HOD', 'SYS_SENIOR_DOCTOR', 'SYS_LAB_SUPERVISOR', 'SYS_PHARMACY_INCHARGE', 'SYS_COMPLIANCE_OFFICER')
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.getDashboardSummary(tid, lid); }
  @Get('patients') patients(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getPatientReport(tid, q); }
  @Get('revenue') revenue(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getRevenueReport(tid, q); }
  @Get('opd') opd(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getOPDReport(tid, q); }
  @Get('ipd') ipd(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getIPDReport(tid, q); }
}
