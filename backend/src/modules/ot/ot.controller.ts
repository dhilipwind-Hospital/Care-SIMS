import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OTService } from './ot.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateOTRoomDto } from './dto/create-room.dto';
import { CreateOTBookingDto } from './dto/create-booking.dto';
import { UpdateOTBookingDto } from './dto/update-booking.dto';
import { CompleteProcedureDto } from './dto/complete-procedure.dto';

@ApiTags('OT')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_OT_SCHEDULE')
@Roles('SYS_ORG_ADMIN', 'SYS_OT_COORDINATOR', 'SYS_OT_NURSE', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR')
@Controller('ot')
export class OTController {
  constructor(private svc: OTService) {}
  @Get('equipment') getEquipment(@CurrentUser('tenantId') tid: string, @Query() query: any) { return this.svc.getEquipment(tid, query); }
  @Post('equipment') createEquipment(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createEquipment(tid, body); }
  @Patch('equipment/:id/sterilize') sterilizeEquipment(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string, @Param('id') id: string) { return this.svc.sterilizeEquipment(tid, id, uid); }
  @Patch('equipment/:id/condition') updateCondition(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('condition') condition: string) { return this.svc.updateEquipmentCondition(tid, id, condition); }

  @Get('rooms') getRooms(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.getRooms(tid, lid); }
  @Get('rooms/live-status') getRoomsLiveStatus(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.getRoomsLiveStatus(tid, lid); }
  @Post('rooms') createRoom(@CurrentUser('tenantId') tid: string, @Body() body: CreateOTRoomDto) { return this.svc.createRoom(tid, body); }
  @Get('schedule/timeline') getTimeline(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getTimeline(tid, q); }
  @Get('reports/performance') getPerformance(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getPerformanceReport(tid, q); }
  @Get('bookings') getBookings(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getBookings(tid, q); }
  @Post('bookings') createBooking(@CurrentUser('tenantId') tid: string, @Body() body: CreateOTBookingDto, @CurrentUser('sub') uid: string) { return this.svc.createBooking(tid, body, uid); }
  @Put('bookings/:id') updateBooking(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateOTBookingDto) { return this.svc.updateBooking(tid, id, body); }
  @Post('bookings/:id/pre-op-assessment') upsertPreOp(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.upsertPreOpAssessment(tid, id, body, uid); }
  @Get('bookings/:id/pre-op-assessment') getPreOp(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getPreOpAssessment(tid, id); }
  @Patch('bookings/:id/start') start(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.startProcedure(tid, id); }
  @Patch('bookings/:id/complete') complete(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: CompleteProcedureDto) { return this.svc.completeProcedure(tid, id, body); }
}
