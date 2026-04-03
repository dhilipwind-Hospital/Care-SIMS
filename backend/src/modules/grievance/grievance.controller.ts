import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GrievanceService } from './grievance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Grievance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_GRIEVANCE')
@Roles('SYS_ORG_ADMIN', 'SYS_RECEPTIONIST', 'SYS_QUALITY')
@Controller('grievances')
export class GrievanceController {
  constructor(private svc: GrievanceService) {}

  @Get()
  list(@CurrentUser('tenantId') tid: string, @Query('status') s?: string, @Query('category') cat?: string) { return this.svc.list(tid, s, cat); }

  @Post()
  create(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.create(tid, body); }

  @Get(':id')
  get(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.get(tid, id); }

  @Patch(':id/assign')
  assign(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.assign(tid, id, body); }

  @Patch(':id/resolve')
  resolve(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('userId') uid: string, @Body() body: any) { return this.svc.resolve(tid, id, uid, body); }

  @Patch(':id/escalate')
  escalate(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.escalate(tid, id, body); }

  @Patch(':id/feedback')
  feedback(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.feedback(tid, id, body); }

  @Delete(':id')
  remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
}
