import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MortuaryService } from './mortuary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Mortuary')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_MORTUARY')
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_NURSE')
@Controller('mortuary')
export class MortuaryController {
  constructor(private svc: MortuaryService) {}

  @Get()
  list(@CurrentUser('tenantId') tid: string, @Query('status') s?: string) { return this.svc.list(tid, s); }

  @Post()
  create(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.create(tid, body); }

  @Get(':id')
  get(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.get(tid, id); }

  @Patch(':id')
  update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }

  @Patch(':id/release')
  release(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.release(tid, id, body); }

  @Delete(':id')
  remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }

  @Get('dashboard/stats')
  dashboard(@CurrentUser('tenantId') tid: string) { return this.svc.dashboard(tid); }
}
