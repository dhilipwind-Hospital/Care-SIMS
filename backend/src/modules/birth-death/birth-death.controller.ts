import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BirthDeathService } from './birth-death.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Birth & Death Registry')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_NURSE', 'SYS_CHARGE_NURSE', 'SYS_RECEPTIONIST')
@Controller('vital-records')
export class BirthDeathController {
  constructor(private svc: BirthDeathService) {}

  @Post('births') registerBirth(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.registerBirth(tid, body, uid); }
  @Get('births') getBirths(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getBirths(tid, q); }
  @Get('births/:id') getBirth(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getBirth(tid, id); }
  @Patch('births/:id') updateBirth(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateBirth(tid, id, body); }

  @Post('deaths') registerDeath(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.registerDeath(tid, body, uid); }
  @Get('deaths') getDeaths(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getDeaths(tid, q); }
  @Get('deaths/:id') getDeath(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getDeath(tid, id); }
  @Patch('deaths/:id') updateDeath(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateDeath(tid, id, body); }

  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.dashboard(tid, q); }
}
