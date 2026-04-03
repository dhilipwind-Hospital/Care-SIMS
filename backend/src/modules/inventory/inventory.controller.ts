import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateInventoryItemDto } from './dto/create-item.dto';
import { UpdateInventoryItemDto } from './dto/update-item.dto';
import { StockInDto } from './dto/stock-in.dto';
import { StockOutDto } from './dto/stock-out.dto';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_INVENTORY')
@Roles('SYS_ORG_ADMIN', 'SYS_STORE_KEEPER', 'SYS_PHARMACIST')
@Controller('inventory')
export class InventoryController {
  constructor(private svc: InventoryService) {}

  @Get('items')
  items(@CurrentUser('tenantId') tid: string, @Query('category') cat?: string, @Query('lowStock') low?: string) { return this.svc.listItems(tid, cat, low === 'true'); }

  @Post('items')
  addItem(@CurrentUser('tenantId') tid: string, @Body() body: CreateInventoryItemDto) { return this.svc.addItem(tid, body); }

  @Get('items/:id')
  getItem(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getItem(tid, id); }

  @Patch('items/:id')
  updateItem(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateInventoryItemDto) { return this.svc.updateItem(tid, id, body); }

  @Post('stock-in')
  stockIn(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: StockInDto) { return this.svc.stockIn(tid, uid, body); }

  @Post('stock-out')
  stockOut(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: StockOutDto) { return this.svc.stockOut(tid, uid, body); }

  @Get('transactions')
  transactions(@CurrentUser('tenantId') tid: string, @Query('itemId') itemId?: string) { return this.svc.listTransactions(tid, itemId); }

  @Get('low-stock')
  lowStock(@CurrentUser('tenantId') tid: string) { return this.svc.lowStockItems(tid); }
}
