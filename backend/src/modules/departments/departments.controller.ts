import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Departments') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SYS_ORG_ADMIN') @Controller('org/departments')
export class DepartmentsController {
  constructor(private svc: DepartmentsService) {}
  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.findAll(tid, lid); }
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.create(tid, body); }
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }
  @Delete(':id') remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
}
