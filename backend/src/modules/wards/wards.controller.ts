import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WardsService } from './wards.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateWardDto } from './dto/create-ward.dto';
import { UpdateWardDto } from './dto/update-ward.dto';
import { CreateBedDto } from './dto/create-bed.dto';

@ApiTags('Wards')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_WARD')
@Roles('SYS_ORG_ADMIN', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR')
@Controller('wards')
export class WardsController {
  constructor(private svc: WardsService) {}
  @Get() getWards(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.getWards(tid, lid); }
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: CreateWardDto) { return this.svc.createWard(tid, body); }
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateWardDto) { return this.svc.updateWard(tid, id, body); }
  @Get(':wardId/beds') getBeds(@CurrentUser('tenantId') tid: string, @Param('wardId') wid: string) { return this.svc.getBeds(tid, wid); }
  @Post(':wardId/beds') addBed(@CurrentUser('tenantId') tid: string, @Param('wardId') wid: string, @Body() body: CreateBedDto) { return this.svc.addBed(tid, wid, body); }
  @Get('occupancy') occupancy(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.getBedOccupancy(tid, lid); }
  @Patch('beds/:bedId/status') bedStatus(@CurrentUser('tenantId') tid: string, @Param('bedId') bid: string, @Body('status') status: string) { return this.svc.updateBedStatus(tid, bid, status); }
}
