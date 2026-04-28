import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payroll') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN')
@Controller('payroll')
export class PayrollController {
  constructor(private svc: PayrollService) {}
  @Post() process(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.processPayroll(tid, body, uid); }
  @Get() getAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getPayroll(tid, q); }
  @Patch(':id/approve') approve(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.approve(tid, id); }
  @Patch(':id/pay') markPaid(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.markPaid(tid, id); }
  @Get('config') getConfig(@CurrentUser('tenantId') tid: string) { return this.svc.getConfig(tid); }
  @Patch('config') updateConfig(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.updateConfig(tid, body); }
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.dashboard(tid, q); }
}
