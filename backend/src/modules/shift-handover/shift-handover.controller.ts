import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftHandoverService } from './shift-handover.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shift Handover')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_SHIFT_HANDOVER')
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE')
@Controller('shift-handover')
export class ShiftHandoverController {
  constructor(private svc: ShiftHandoverService) {}

  @Get()
  list(
    @CurrentUser('tenantId') tid: string,
    @Query('locationId') lid?: string,
    @Query('wardId') wid?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.list(tid, { locationId: lid, wardId: wid, date, status });
  }

  @Post()
  create(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: any) {
    return this.svc.create(tid, uid, body);
  }

  @Patch(':id')
  update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(tid, id, body);
  }

  @Patch(':id/acknowledge')
  acknowledge(
    @CurrentUser('tenantId') tid: string,
    @CurrentUser('userId') uid: string,
    @CurrentUser('firstName') fname: string,
    @CurrentUser('lastName') lname: string,
    @Param('id') id: string,
  ) {
    return this.svc.acknowledge(tid, id, uid, `${fname} ${lname}`);
  }

  @Get(':id')
  getOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) {
    return this.svc.getOne(tid, id);
  }

  @Delete(':id')
  remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) {
    return this.svc.remove(tid, id);
  }
}
