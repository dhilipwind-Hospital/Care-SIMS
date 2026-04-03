import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AmbulanceService } from './ambulance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Ambulance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_AMBULANCE')
@Roles('SYS_ORG_ADMIN', 'SYS_RECEPTIONIST', 'SYS_NURSE')
@Controller('ambulance')
export class AmbulanceController {
  constructor(private svc: AmbulanceService) {}

  @Get('vehicles')
  vehicles(@CurrentUser('tenantId') tid: string, @Query('status') s?: string) { return this.svc.listVehicles(tid, s); }

  @Post('vehicles')
  addVehicle(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.addVehicle(tid, body); }

  @Patch('vehicles/:id')
  updateVehicle(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateVehicle(tid, id, body); }

  @Get('trips')
  trips(@CurrentUser('tenantId') tid: string, @Query('status') s?: string) { return this.svc.listTrips(tid, s); }

  @Post('trips')
  dispatch(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: any) { return this.svc.dispatch(tid, uid, body); }

  @Get('trips/:id')
  getTrip(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getTrip(tid, id); }

  @Patch('trips/:id/arrive')
  arrive(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.arrive(tid, id); }

  @Patch('trips/:id/depart')
  depart(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.depart(tid, id); }

  @Patch('trips/:id/complete')
  complete(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.complete(tid, id, body); }
}
