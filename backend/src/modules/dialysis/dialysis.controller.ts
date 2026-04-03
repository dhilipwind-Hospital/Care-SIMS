import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DialysisService } from './dialysis.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dialysis')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_DIALYSIS')
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_NURSE')
@Controller('dialysis')
export class DialysisController {
  constructor(private svc: DialysisService) {}

  @Get('machines')
  machines(@CurrentUser('tenantId') tid: string, @Query('status') s?: string) { return this.svc.listMachines(tid, s); }

  @Post('machines')
  addMachine(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.addMachine(tid, body); }

  @Patch('machines/:id')
  updateMachine(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateMachine(tid, id, body); }

  @Get('sessions')
  sessions(@CurrentUser('tenantId') tid: string, @Query('date') date?: string, @Query('status') s?: string) { return this.svc.listSessions(tid, date, s); }

  @Post('sessions')
  createSession(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createSession(tid, body); }

  @Get('sessions/:id')
  getSession(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getSession(tid, id); }

  @Patch('sessions/:id/start')
  startSession(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('userId') uid: string) { return this.svc.startSession(tid, id, uid); }

  @Patch('sessions/:id/end')
  endSession(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.endSession(tid, id, body); }

  @Get('dashboard')
  dashboard(@CurrentUser('tenantId') tid: string) { return this.svc.dashboard(tid); }
}
