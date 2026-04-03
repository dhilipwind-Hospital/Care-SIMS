import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StaffAttendanceService } from './staff-attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Staff Attendance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_ATTENDANCE')
@Roles('SYS_ORG_ADMIN', 'SYS_HR')
@Controller('staff-attendance')
export class StaffAttendanceController {
  constructor(private svc: StaffAttendanceService) {}

  @Get()
  list(@CurrentUser('tenantId') tid: string, @Query('date') date?: string, @Query('departmentId') dept?: string) { return this.svc.list(tid, date, dept); }

  @Post('clock-in')
  @Roles('SYS_ORG_ADMIN', 'SYS_HR', 'SYS_DOCTOR', 'SYS_NURSE', 'SYS_RECEPTIONIST', 'SYS_PHARMACIST', 'SYS_LAB_TECH')
  clockIn(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @CurrentUser('name') name: string, @Body() body: any) { return this.svc.clockIn(tid, uid, name, body); }

  @Patch('clock-out')
  @Roles('SYS_ORG_ADMIN', 'SYS_HR', 'SYS_DOCTOR', 'SYS_NURSE', 'SYS_RECEPTIONIST', 'SYS_PHARMACIST', 'SYS_LAB_TECH')
  clockOut(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string) { return this.svc.clockOut(tid, uid); }

  @Post('mark')
  mark(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.markAttendance(tid, body); }

  @Get('my')
  @Roles('SYS_ORG_ADMIN', 'SYS_HR', 'SYS_DOCTOR', 'SYS_NURSE', 'SYS_RECEPTIONIST', 'SYS_PHARMACIST', 'SYS_LAB_TECH')
  myAttendance(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Query('month') month?: string) { return this.svc.myAttendance(tid, uid, month); }

  @Get('summary')
  summary(@CurrentUser('tenantId') tid: string, @Query('month') month: string) { return this.svc.summary(tid, month); }

  @Patch(':id')
  update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }

  @Delete(':id')
  remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
}
