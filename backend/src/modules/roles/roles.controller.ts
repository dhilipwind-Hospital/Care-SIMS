import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Roles') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SYS_ORG_ADMIN') @Controller('roles')
export class RolesController {
  constructor(private svc: RolesService) {}
  @Get() findAll(@CurrentUser('tenantId') tid: string) { return this.svc.findAll(tid); }
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.create(tid, body, uid); }
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }
  @Delete(':id') remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
  @Put(':id/permissions') updatePerms(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('permissions') perms: any[]) { return this.svc.updatePermissions(tid, id, perms); }
  @Put(':id/special-flags') updateFlags(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('flags') flags: string[]) { return this.svc.updateSpecialFlags(tid, id, flags); }
}
