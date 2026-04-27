import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QualityService } from './quality.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Quality Management') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_COMPLIANCE_OFFICER', 'SYS_HOD', 'SYS_MEDICAL_DIRECTOR')
@Controller('quality')
export class QualityController {
  constructor(private svc: QualityService) {}
  @Post('indicators') createIndicator(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.createIndicator(tid, body, uid); }
  @Get('indicators') getIndicators(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getIndicators(tid, q); }
  @Patch('indicators/:id') updateIndicator(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.updateIndicator(tid, id, body, uid); }
  @Post('incidents') reportIncident(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.reportIncident(tid, body, uid); }
  @Get('incidents') getIncidents(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getIncidents(tid, q); }
  @Patch('incidents/:id') updateIncident(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateIncident(tid, id, body); }
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string) { return this.svc.dashboard(tid); }
}
