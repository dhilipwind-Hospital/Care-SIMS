import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WasteManagementService } from './waste-management.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Waste Management') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_NURSE', 'SYS_CHARGE_NURSE', 'SYS_COMPLIANCE_OFFICER')
@Controller('waste-management')
export class WasteManagementController {
  constructor(private svc: WasteManagementService) {}
  @Post() record(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.record(tid, body, uid); }
  @Get() getAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getAll(tid, q); }
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.dashboard(tid, q); }
}
