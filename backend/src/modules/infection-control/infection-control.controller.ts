import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InfectionControlService } from './infection-control.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Infection Control')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_INFECTION_CTRL')
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_NURSE', 'SYS_INFECTION_CTRL')
@Controller('infection-control')
export class InfectionControlController {
  constructor(private svc: InfectionControlService) {}

  @Get()
  list(@CurrentUser('tenantId') tid: string, @Query('status') s?: string, @Query('recordType') rt?: string) { return this.svc.list(tid, s, rt); }

  @Post()
  create(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @CurrentUser('name') name: string, @Body() body: any) { return this.svc.create(tid, uid, name, body); }

  @Get(':id')
  get(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.get(tid, id); }

  @Patch(':id')
  update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }

  @Patch(':id/resolve')
  resolve(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.resolve(tid, id, body); }

  @Delete(':id')
  remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }

  @Get('dashboard/stats')
  dashboard(@CurrentUser('tenantId') tid: string) { return this.svc.dashboard(tid); }
}
