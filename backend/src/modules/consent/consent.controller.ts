import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Consent')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_CONSENT')
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_NURSE')
@Controller('consents')
export class ConsentController {
  constructor(private svc: ConsentService) {}

  @Get()
  list(@CurrentUser('tenantId') tid: string, @Query('patientId') pid?: string, @Query('consentType') ct?: string) { return this.svc.list(tid, pid, ct); }

  @Post()
  create(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.create(tid, body); }

  @Get(':id')
  get(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.get(tid, id); }

  @Patch(':id')
  update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }

  @Patch(':id/revoke')
  revoke(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.revoke(tid, id, body); }

  @Delete(':id')
  remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }

  @Get('patient/:patientId')
  byPatient(@CurrentUser('tenantId') tid: string, @Param('patientId') pid: string) { return this.svc.byPatient(tid, pid); }
}
