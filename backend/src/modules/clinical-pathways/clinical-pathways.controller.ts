import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ClinicalPathwaysService } from './clinical-pathways.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Clinical Pathways') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_HOD', 'SYS_NURSE', 'SYS_CHARGE_NURSE')
@Controller('clinical-pathways')
export class ClinicalPathwaysController {
  constructor(private svc: ClinicalPathwaysService) {}
  @Post('protocols') createProtocol(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.createProtocol(tid, body, uid); }
  @Get('protocols') getProtocols(@CurrentUser('tenantId') tid: string) { return this.svc.getProtocols(tid); }
  @Patch('protocols/:id') updateProtocol(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateProtocol(tid, id, body); }
  @Post('pathways') assignPathway(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.assignPathway(tid, body); }
  @Get('pathways') getPathways(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getPatientPathways(tid, q); }
  @Patch('pathways/:id') updatePathway(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updatePathway(tid, id, body); }
}
