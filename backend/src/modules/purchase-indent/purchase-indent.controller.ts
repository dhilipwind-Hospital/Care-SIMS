import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseIndentService } from './purchase-indent.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Purchase Indent') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_CHARGE_NURSE', 'SYS_PHARMACY_INCHARGE', 'SYS_HOD', 'SYS_LAB_SUPERVISOR')
@Controller('purchase-indents')
export class PurchaseIndentController {
  constructor(private svc: PurchaseIndentService) {}
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.create(tid, body, uid); }
  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Patch(':id/submit') submit(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.submit(tid, id); }
  @Patch(':id/approve') approve(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.approve(tid, id, uid); }
  @Patch(':id/reject') reject(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string, @Body('reason') reason: string) { return this.svc.reject(tid, id, uid, reason); }
}
