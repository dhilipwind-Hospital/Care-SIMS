import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TriageService } from './triage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Triage')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_TRIAGE')
@Roles('SYS_ORG_ADMIN', 'SYS_NURSE', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR')
@Controller('triage')
export class TriageController {
  constructor(private svc: TriageService) {}
  @Get() list(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.list(tid, q); }
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.create(tid, body, uid); }
  @Get('by-token/:tokenId') byToken(@CurrentUser('tenantId') tid: string, @Param('tokenId') id: string) { return this.svc.getByToken(tid, id); }
  @Get('by-patient/:patientId') byPatient(@CurrentUser('tenantId') tid: string, @Param('patientId') pid: string) { return this.svc.getByPatient(tid, pid); }
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }
}
