import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VitalsService } from './vitals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Vitals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_VITALS')
@Roles('SYS_ORG_ADMIN', 'SYS_NURSE', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR')
@Controller('vitals')
export class VitalsController {
  constructor(private svc: VitalsService) {}
  @Post() record(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.record(tid, body, uid); }
  @Get('patient/:patientId') forPatient(@CurrentUser('tenantId') tid: string, @Param('patientId') pid: string, @Query('limit') limit: number) { return this.svc.getForPatient(tid, pid, limit); }
  @Get('consultation/:consultationId') forConsult(@CurrentUser('tenantId') tid: string, @Param('consultationId') cid: string) { return this.svc.getForConsultation(tid, cid); }
  @Get('admission/:admissionId') forAdmission(@CurrentUser('tenantId') tid: string, @Param('admissionId') aid: string) { return this.svc.getForAdmission(tid, aid); }
}
