import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { generateCsv, sendCsvResponse, CsvColumn } from '../../common/utils/csv-export';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { AddLineItemDto } from './dto/add-line-item.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@ApiTags('Billing')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_BILL_OPD')
@Roles('SYS_ORG_ADMIN', 'SYS_BILLING', 'SYS_BILLING_MANAGER', 'SYS_RECEPTIONIST', 'SYS_FRONT_OFFICE')
@Controller('billing')
export class BillingController {
  constructor(private svc: BillingService) {}
  @Get('invoices') getAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getInvoices(tid, q); }

  @Get('invoices/export')
  async exportCsv(@CurrentUser('tenantId') tid: string, @Query() q: any, @Res() res: Response) {
    const { data } = await this.svc.getInvoices(tid, { ...q, page: 1, limit: 10000 });
    const columns: CsvColumn[] = [
      { header: 'Invoice #', key: 'invoiceNumber' },
      { header: 'Patient ID', key: 'patient.patientId' },
      { header: 'Patient Name', key: 'patient', transform: (_v, row) => `${row.patient?.firstName || ''} ${row.patient?.lastName || ''}`.trim() },
      { header: 'Type', key: 'invoiceType' },
      { header: 'Status', key: 'status' },
      { header: 'Subtotal', key: 'subtotal' },
      { header: 'Discount', key: 'discountAmount' },
      { header: 'Tax', key: 'taxAmount' },
      { header: 'Net Total', key: 'netTotal' },
      { header: 'Paid', key: 'paidAmount' },
      { header: 'Date', key: 'createdAt', transform: (v) => v ? new Date(v).toLocaleDateString() : '' },
    ];
    sendCsvResponse(res, `invoices-${new Date().toISOString().slice(0, 10)}.csv`, generateCsv(columns, data));
  }
  @Post('invoices') create(@CurrentUser('tenantId') tid: string, @Body() body: CreateInvoiceDto, @CurrentUser('sub') uid: string) { return this.svc.createInvoice(tid, body, uid); }
  @Get('invoices/:id') getOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getInvoice(tid, id); }
  @Patch('invoices/:id/finalize') finalize(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.finalizeInvoice(tid, id); }
  @Post('invoices/:id/payments') pay(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: RecordPaymentDto, @CurrentUser('sub') uid: string) { return this.svc.recordPayment(tid, id, body, uid); }
  @Patch('invoices/:id/cancel') cancel(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('reason') reason: string) { return this.svc.cancelInvoice(tid, id, reason); }
  @Post('invoices/:id/email') email(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('email') overrideEmail?: string) { return this.svc.emailInvoice(tid, id, overrideEmail); }
  @Post('invoices/:id/line-items') addItem(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: AddLineItemDto) { return this.svc.addLineItem(tid, id, body); }
}
