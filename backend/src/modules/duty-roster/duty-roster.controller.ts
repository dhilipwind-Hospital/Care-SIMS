import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DutyRosterService } from './duty-roster.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Duty Roster')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_CHARGE_NURSE', 'SYS_HOD', 'SYS_FRONT_OFFICE', 'SYS_DOCTOR', 'SYS_NURSE', 'SYS_RECEPTIONIST', 'SYS_PHARMACIST', 'SYS_LAB_TECH')
@Controller('duty-roster')
export class DutyRosterController {
  constructor(private svc: DutyRosterService) {}

  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.createShift(tid, body, uid); }
  @Post('bulk') bulkCreate(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.bulkCreate(tid, body, uid); }
  @Get() getRoster(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getRoster(tid, q); }
  @Get('my') getMyRoster(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string, @Query() q: any) { return this.svc.getMyRoster(tid, uid, q); }
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.dashboard(tid, q); }
  @Patch(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateShift(tid, id, body); }
  @Delete(':id') remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.deleteShift(tid, id); }
  @Patch(':id/swap') requestSwap(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('swapWithStaffId') swapId: string) { return this.svc.requestSwap(tid, id, swapId); }
  @Patch(':id/approve-swap') approveSwap(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.approveSwap(tid, id, uid); }

  // Leave endpoints
  @Post('leave') applyLeave(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string, @Body() body: any) { return this.svc.applyLeave(tid, uid, body); }
  @Get('leave') getLeaves(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getLeaves(tid, q); }
  @Patch('leave/:id/approve') approveLeave(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.approveLeave(tid, id, uid); }
  @Patch('leave/:id/reject') rejectLeave(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string, @Body('reason') reason: string) { return this.svc.rejectLeave(tid, id, uid, reason); }
  @Patch('leave/:id/cancel') cancelLeave(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.cancelLeave(tid, id, uid); }
}
