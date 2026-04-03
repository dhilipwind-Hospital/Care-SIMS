import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VisitorsService } from './visitors.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Visitors')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_VISITOR')
@Roles('SYS_ORG_ADMIN', 'SYS_RECEPTIONIST', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE', 'SYS_SECURITY')
@Controller('visitors')
export class VisitorsController {
  constructor(private svc: VisitorsService) {}

  @Get()
  list(
    @CurrentUser('tenantId') tid: string,
    @Query('locationId') lid?: string,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('date') date?: string,
  ) {
    return this.svc.list(tid, { locationId: lid, status, patientId, date });
  }

  @Post()
  checkIn(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: any) {
    return this.svc.checkIn(tid, uid, body);
  }

  @Patch(':id')
  update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(tid, id, body);
  }

  @Patch(':id/checkout')
  checkOut(@CurrentUser('tenantId') tid: string, @Param('id') id: string) {
    return this.svc.checkOut(tid, id);
  }

  @Get('active-count')
  activeCount(@CurrentUser('tenantId') tid: string, @Query('locationId') lid?: string) {
    return this.svc.activeCount(tid, lid);
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
