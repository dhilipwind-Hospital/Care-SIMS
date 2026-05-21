import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformGuard } from '../../common/guards/platform.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Platform Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller('platform')
export class PlatformController {
  constructor(private platformService: PlatformService) {}

  @Get('organizations')
  listOrgs(@Query() query: any) { return this.platformService.listOrganizations(query); }

  @Post('organizations')
  createOrg(@Body() body: any, @CurrentUser('sub') adminId: string) { return this.platformService.createOrganization(body, adminId); }

  @Get('organizations/:id')
  getOrg(@Param('id') id: string) { return this.platformService.getOrganization(id); }

  @Put('organizations/:id')
  updateOrg(@Param('id') id: string, @Body() body: any, @CurrentUser('sub') adminId: string) { return this.platformService.updateOrganization(id, body, adminId); }

  @Patch('organizations/:id/suspend')
  suspendOrg(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser('sub') adminId: string) { return this.platformService.suspendOrganization(id, body.reason, adminId); }

  @Patch('organizations/:id/activate')
  activateOrg(@Param('id') id: string, @CurrentUser('sub') adminId: string) { return this.platformService.activateOrganization(id, adminId); }

  @Post('organizations/:id/seed-role-permissions')
  seedRolePerms(@Param('id') id: string) { return this.platformService.seedRolePermissionsForOrg(id); }

  // Backfill departments, wards/beds, drug catalog + stock, sample doctor
  // affiliation into an existing org. Idempotent.
  @Post('organizations/:id/seed-starter-data')
  seedStarterData(@Param('id') id: string, @CurrentUser('sub') adminId: string) {
    return this.platformService.seedStarterDataForOrg(id, adminId);
  }

  // Lightweight read of current row counts for an org. Used by the UI to
  // show "Current totals" panel without making the heavy seed call also
  // do count queries.
  @Get('organizations/:id/data-counts')
  getDataCounts(@Param('id') id: string) { return this.platformService.getDataCountsForOrg(id); }

  // Reset every user (staff + patient) for a demo org to password Demo@1234.
  // Use this when a previously-seeded demo org has stale/wrong credentials.
  @Post('organizations/:id/reset-demo-passwords')
  resetDemoPasswords(@Param('id') id: string) { return this.platformService.resetDemoPasswords(id); }

  // Turn ON every applicable feature module for this org. Useful when an
  // older org is missing recently-added modules (e.g. MOD_TRIAGE) and
  // FeatureFlagGuard is throwing 403s.
  @Post('organizations/:id/enable-all-features')
  enableAllFeatures(@Param('id') id: string, @CurrentUser('sub') adminId: string) {
    return this.platformService.enableAllFeaturesForOrg(id, adminId);
  }

  // One-click demo provisioning. Optional body { name, slug } — if omitted
  // a date-stamped slug is generated.
  @Post('organizations/seed-demo')
  seedDemo(@Body() body: { name?: string; slug?: string }, @CurrentUser('sub') adminId: string) {
    return this.platformService.seedDemoOrganization(body || {}, adminId);
  }

  @Delete('organizations/:id')
  deleteOrg(@Param('id') id: string, @Body() body: { confirmSlug: string }, @CurrentUser('sub') adminId: string) {
    return this.platformService.deleteOrganization(id, body?.confirmSlug, adminId);
  }

  @Patch('organizations/:id/subscription')
  updateSubscription(@Param('id') id: string, @Body() body: any, @CurrentUser('sub') adminId: string) { return this.platformService.updateSubscription(id, body, adminId); }

  @Get('organizations/:id/features')
  getOrgFeatures(@Param('id') id: string) { return this.platformService.getOrgFeatures(id); }

  @Patch('organizations/:id/features/:moduleId')
  toggleFeature(@Param('id') id: string, @Param('moduleId') moduleId: string, @Body() body: { isEnabled: boolean }, @CurrentUser('sub') adminId: string) { return this.platformService.updateOrgFeature(id, moduleId, body.isEnabled, adminId); }

  @Patch('organizations/:id/features/:moduleId/enable')
  enableFeature(@Param('id') id: string, @Param('moduleId') moduleId: string, @CurrentUser('sub') adminId: string) { return this.platformService.updateOrgFeature(id, moduleId, true, adminId); }

  @Patch('organizations/:id/features/:moduleId/disable')
  disableFeature(@Param('id') id: string, @Param('moduleId') moduleId: string, @CurrentUser('sub') adminId: string) { return this.platformService.updateOrgFeature(id, moduleId, false, adminId); }

  @Get('organizations/:id/locations')
  getOrgLocations(@Param('id') id: string) { return this.platformService.getOrgLocations(id); }

  @Post('organizations/:id/locations')
  addOrgLocation(@Param('id') id: string, @Body() body: any, @CurrentUser('sub') adminId: string) { return this.platformService.addOrgLocation(id, body, adminId); }

  @Patch('organizations/:id/locations/:locId')
  updateOrgLocation(@Param('id') id: string, @Param('locId') locId: string, @Body() body: any) { return this.platformService.updateOrgLocation(id, locId, body); }

  @Get('organizations/:id/users')
  getOrgUsers(@Param('id') id: string) { return this.platformService.getOrgUsers(id); }

  @Post('organizations/:id/export')
  exportOrg(@Param('id') id: string) { return this.platformService.exportOrganization(id); }

  @Get('features')
  listFeatures() { return this.platformService.listFeatureModules(); }

  @Get('audit-logs')
  getAuditLogs(@Query() query: any) { return this.platformService.getPlatformAuditLogs(query); }

  @Get('audit')
  getAuditAlias(@Query() query: any) { return this.platformService.getPlatformAuditLogs(query); }

  @Get('doctors')
  listDoctors(@Query() query: any) { return this.platformService.listDoctors(query); }

  @Patch('doctors/:id/verify')
  verifyDoctor(@Param('id') id: string, @CurrentUser('sub') adminId: string) { return this.platformService.verifyDoctor(id, adminId); }

  @Patch('doctors/:id/reject')
  rejectDoctor(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser('sub') adminId: string) { return this.platformService.rejectDoctor(id, body.reason, adminId); }
}
