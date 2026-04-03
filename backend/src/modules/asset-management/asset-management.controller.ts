import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssetManagementService } from './asset-management.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Asset Management')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_ASSETS')
@Roles('SYS_ORG_ADMIN', 'SYS_BIOMEDICAL')
@Controller('assets')
export class AssetManagementController {
  constructor(private svc: AssetManagementService) {}

  @Get()
  list(@CurrentUser('tenantId') tid: string, @Query('category') cat?: string, @Query('status') s?: string) { return this.svc.list(tid, cat, s); }

  @Post()
  create(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.create(tid, body); }

  @Get(':id')
  get(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.get(tid, id); }

  @Patch(':id')
  update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }

  @Post(':id/maintenance')
  addMaintenance(@CurrentUser('tenantId') tid: string, @Param('id') assetId: string, @Body() body: any) { return this.svc.addMaintenance(tid, assetId, body); }

  @Get(':id/maintenance')
  listMaintenance(@CurrentUser('tenantId') tid: string, @Param('id') assetId: string) { return this.svc.listMaintenance(tid, assetId); }

  @Patch('maintenance/:id/complete')
  completeMaintenance(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.completeMaintenance(tid, id, body); }
}
