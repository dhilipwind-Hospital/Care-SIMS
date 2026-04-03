import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_AUDIT')
@Roles('SYS_ORG_ADMIN', 'SYS_COMPLIANCE_OFFICER')
@Controller('audit')
export class AuditController {
  constructor(private svc: AuditService) {}
  @Get('logs') getLogs(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getLogs(tid, q); }
  @Get('patient-access') getPatientAccess(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getPatientAccessLogs(tid, q); }
}
