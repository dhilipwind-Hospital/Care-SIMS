import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MrdService } from './mrd.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Medical Records Dept') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_COMPLIANCE_OFFICER', 'SYS_RECEPTIONIST')
@Controller('mrd')
export class MrdController {
  constructor(private svc: MrdService) {}
  @Post('files') createFile(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createFile(tid, body); }
  @Get('files') getFiles(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getFiles(tid, q); }
  @Patch('files/:id/checkout') checkOut(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.checkOut(tid, id, body, uid); }
  @Patch('files/:id/checkin') checkIn(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.checkIn(tid, id); }
  @Patch('files/:id/coding') updateCoding(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.updateCoding(tid, id, body, uid); }
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string) { return this.svc.dashboard(tid); }
}
