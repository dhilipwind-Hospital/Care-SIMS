import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { LabService } from './lab.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { generateCsv, sendCsvResponse, CsvColumn } from '../../common/utils/csv-export';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { EnterResultDto } from './dto/enter-result.dto';
import { UpdateLabOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Lab')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_LAB_FULL')
@Roles('SYS_ORG_ADMIN', 'SYS_LAB_TECH', 'SYS_LAB_SUPERVISOR', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR')
@Controller('lab')
export class LabController {
  constructor(private svc: LabService) {}
  @Post('orders') createOrder(@CurrentUser('tenantId') tid: string, @Body() body: CreateLabOrderDto) { return this.svc.createOrder(tid, body); }
  @Get('orders') getOrders(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getOrders(tid, q); }

  @Get('orders/export')
  async exportCsv(@CurrentUser('tenantId') tid: string, @Query() q: any, @Res() res: Response) {
    const { data } = await this.svc.getOrders(tid, { ...q, page: 1, limit: 10000 });
    const columns: CsvColumn[] = [
      { header: 'Order ID', key: 'orderNumber' },
      { header: 'Patient ID', key: 'patientId' },
      { header: 'Status', key: 'status' },
      { header: 'Priority', key: 'priority' },
      { header: 'Ordered At', key: 'orderedAt', transform: (v) => v ? new Date(v).toLocaleString() : '' },
    ];
    sendCsvResponse(res, `lab-orders-${new Date().toISOString().slice(0, 10)}.csv`, generateCsv(columns, data));
  }
  @Get('orders/:id') getOrder(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getOrder(tid, id); }
  @Patch('orders/:id/status') updateStatus(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateLabOrderStatusDto) { return this.svc.updateOrderStatus(tid, id, body.status); }
  @Post('orders/:id/results') enterResult(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: EnterResultDto, @CurrentUser('sub') uid: string) { return this.svc.enterResult(tid, id, body, uid); }
  @Patch('results/:id/validate') validateResult(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.validateResult(tid, id, uid); }
  @Post('results/:id/validate') validateResultAlias(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.validateResult(tid, id, uid); }
  @Post('results/:id/print') printResult(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.printResult(tid, id); }
  @Get('results') getResults(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getResults(tid, q); }
}
