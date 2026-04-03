import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Locations') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SYS_ORG_ADMIN') @Controller('org/locations')
export class LocationsController {
  constructor(private svc: LocationsService) {}
  @Get() findAll(@CurrentUser('tenantId') tid: string) { return this.svc.findAll(tid); }
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.create(tid, body); }
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }
  @Patch(':id') patchUpdate(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }
  @Patch(':id/deactivate') deactivate(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.deactivate(tid, id); }
  @Delete(':id') remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.deactivate(tid, id); }
}
