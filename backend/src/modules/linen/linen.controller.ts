import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LinenService } from './linen.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Linen') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_NURSE', 'SYS_CHARGE_NURSE')
@Controller('linen')
export class LinenController {
  constructor(private svc: LinenService) {}
  @Get('items') getItems(@CurrentUser('tenantId') tid: string) { return this.svc.getItems(tid); }
  @Post('items') createItem(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createItem(tid, body); }
  @Post('transactions') record(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.recordTransaction(tid, body, uid); }
  @Get('transactions') getTransactions(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getTransactions(tid, q); }
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string) { return this.svc.dashboard(tid); }
}
