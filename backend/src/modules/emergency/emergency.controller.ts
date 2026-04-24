import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmergencyService } from './emergency.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Emergency')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_NURSE', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE', 'SYS_RECEPTIONIST', 'SYS_FRONT_OFFICE')
@Controller('emergency')
export class EmergencyController {
  constructor(private svc: EmergencyService) {}

  @Post('register') register(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.register(tid, body, uid); }
  @Get('active') active(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.getActive(tid, lid); }
  @Get() getAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getAll(tid, q); }
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.dashboard(tid, lid); }
  @Get(':id') getOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getOne(tid, id); }
  @Patch(':id/triage') triage(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.triage(tid, id, body); }
  @Patch(':id/assign') assign(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.assignDoctor(tid, id, body); }
  @Patch(':id/status') updateStatus(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('status') status: string) { return this.svc.updateStatus(tid, id, status); }
  @Patch(':id/disposition') disposition(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.disposition(tid, id, body); }
}
