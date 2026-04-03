import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TelemedicineService } from './telemedicine.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('Telemedicine') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard) @RequireFeature('MOD_TELEMEDICINE') @Roles('SYS_ORG_ADMIN','SYS_DOCTOR','SYS_SENIOR_DOCTOR','SYS_RECEPTIONIST')
@Controller('telemedicine')
export class TelemedicineController {
  constructor(private svc: TelemedicineService) {}
  @Get('sessions') list(@CurrentUser('tenantId') tid: string, @Query('status') s?: string, @Query('doctorId') did?: string) { return this.svc.list(tid, s, did); }
  @Post('sessions') create(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.create(tid, body); }
  @Get('sessions/:id') getOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getOne(tid, id); }
  @Patch('sessions/:id/start') start(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.start(tid, id); }
  @Patch('sessions/:id/end') end(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.end(tid, id); }
  @Patch('sessions/:id/cancel') cancel(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('reason') reason: string) { return this.svc.cancel(tid, id, reason); }
  @Delete('sessions/:id') remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
}
