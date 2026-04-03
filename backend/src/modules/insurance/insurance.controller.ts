import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('Insurance') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard) @RequireFeature('MOD_BILL_INS') @Roles('SYS_ORG_ADMIN','SYS_BILLING','SYS_BILLING_MANAGER','SYS_BILLING_CLERK','SYS_RECEPTIONIST','SYS_INSURANCE_EXEC')
@Controller('insurance')
export class InsuranceController {
  constructor(private svc: InsuranceService) {}
  @Get('policies') policies(@CurrentUser('tenantId') tid: string, @Query('patientId') pid?: string) { return this.svc.listPolicies(tid, pid); }
  @Post('policies') addPolicy(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.addPolicy(tid, body); }
  @Get('policies/:id') getPolicy(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getPolicy(tid, id); }
  @Patch('policies/:id') updatePolicy(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updatePolicy(tid, id, body); }
  @Get('policies/patient/:patientId') patientPolicies(@CurrentUser('tenantId') tid: string, @Param('patientId') pid: string) { return this.svc.listPolicies(tid, pid); }
  @Get('claims') claims(@CurrentUser('tenantId') tid: string, @Query('status') s?: string) { return this.svc.listClaims(tid, s); }
  @Post('claims') addClaim(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: any) { return this.svc.addClaim(tid, uid, body); }
  @Patch('claims/:id') updateClaim(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateClaim(tid, id, body); }
  @Patch('claims/:id/submit') submit(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.submitClaim(tid, id); }
  @Patch('claims/:id/approve') approve(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.approveClaim(tid, id, body); }
}
