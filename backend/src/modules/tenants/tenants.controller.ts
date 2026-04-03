import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tenants') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SYS_ORG_ADMIN') @Controller('tenants')
export class TenantsController {
  constructor(private svc: TenantsService) {}
  @Get('me') getMe(@CurrentUser('tenantId') tid: string) { return this.svc.getMyTenant(tid); }
  @Patch('me') updateSettings(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.updateSettings(tid, body); }
  @Get('me/locations') getLocations(@CurrentUser('tenantId') tid: string) { return this.svc.getLocations(tid); }
  @Get('me/features') getFeatures(@CurrentUser('tenantId') tid: string) { return this.svc.getFeatures(tid); }
  @Patch('me/features/:id') toggleFeature(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('isEnabled') isEnabled: boolean) { return this.svc.toggleFeature(tid, id, isEnabled); }
}
