import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CentralStoreService } from './central-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Central Store') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_CHARGE_NURSE', 'SYS_PHARMACY_INCHARGE')
@Controller('central-store')
export class CentralStoreController {
  constructor(private svc: CentralStoreService) {}
  @Post('items') createItem(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createItem(tid, body); }
  @Get('items') getItems(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getItems(tid, q); }
  @Patch('items/:id') updateItem(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateItem(tid, id, body); }
  @Post('transactions') recordTransaction(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.recordTransaction(tid, body, uid); }
  @Get('transactions') getTransactions(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getTransactions(tid, q); }
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string) { return this.svc.dashboard(tid); }
}
