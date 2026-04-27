import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HealthPackagesService } from './health-packages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Health Packages') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_RECEPTIONIST', 'SYS_FRONT_OFFICE', 'SYS_DOCTOR')
@Controller('health-packages')
export class HealthPackagesController {
  constructor(private svc: HealthPackagesService) {}
  @Post() createPackage(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createPackage(tid, body); }
  @Get() getPackages(@CurrentUser('tenantId') tid: string) { return this.svc.getPackages(tid); }
  @Patch(':id') updatePackage(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updatePackage(tid, id, body); }
  @Post('bookings') bookPackage(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.bookPackage(tid, body); }
  @Get('bookings') getBookings(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getBookings(tid, q); }
  @Patch('bookings/:id') updateBooking(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateBooking(tid, id, body); }
}
