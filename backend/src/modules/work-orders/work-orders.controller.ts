import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Work Orders') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_CHARGE_NURSE', 'SYS_HOD', 'SYS_RECEPTIONIST', 'SYS_FRONT_OFFICE', 'SYS_DOCTOR', 'SYS_NURSE')
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private svc: WorkOrdersService) {}
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.create(tid, body, uid); }
  @Get() getAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getAll(tid, q); }
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string) { return this.svc.dashboard(tid); }
  @Get(':id') getOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getOne(tid, id); }
  @Patch(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }
}
