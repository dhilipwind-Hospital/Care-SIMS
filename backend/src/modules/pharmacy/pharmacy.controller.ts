import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PharmacyService } from './pharmacy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { generateCsv, sendCsvResponse, CsvColumn } from '../../common/utils/csv-export';
import { CreateDrugDto } from './dto/create-drug.dto';
import { UpdateDrugDto } from './dto/update-drug.dto';
import { ReceiveBatchDto } from './dto/receive-batch.dto';
import { DispenseDto } from './dto/dispense.dto';

@ApiTags('Pharmacy')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_PHARMA_FULL')
@Roles('SYS_ORG_ADMIN', 'SYS_PHARMACIST', 'SYS_PHARMACY_INCHARGE')
@Controller('pharmacy')
export class PharmacyController {
  constructor(private svc: PharmacyService) {}
  @Get('drugs') getDrugs(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getDrugs(tid, q); }

  @Get('drugs/export')
  async exportCsv(@CurrentUser('tenantId') tid: string, @Query() q: any, @Res() res: Response) {
    const { data } = await this.svc.getDrugs(tid, { ...q, page: 1, limit: 10000 });
    const columns: CsvColumn[] = [
      { header: 'Drug Name', key: 'name' },
      { header: 'Generic Name', key: 'genericName' },
      { header: 'Category', key: 'category' },
      { header: 'Form', key: 'dosageForm' },
      { header: 'Strength', key: 'strength' },
      { header: 'Manufacturer', key: 'manufacturer' },
      { header: 'MRP', key: 'mrp' },
      { header: 'Reorder Level', key: 'reorderLevel' },
    ];
    sendCsvResponse(res, `pharmacy-drugs-${new Date().toISOString().slice(0, 10)}.csv`, generateCsv(columns, data));
  }
  @Post('drugs') createDrug(@CurrentUser('tenantId') tid: string, @Body() body: CreateDrugDto) { return this.svc.createDrug(tid, body); }
  @Put('drugs/:id') updateDrug(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateDrugDto) { return this.svc.updateDrug(tid, id, body); }
  @Get('stock') getStock(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.getStock(tid, lid); }
  @Post('batches') receiveBatch(@CurrentUser('tenantId') tid: string, @Body() body: ReceiveBatchDto) { return this.svc.receiveBatch(tid, body); }
  @Post('dispense/:prescriptionId') dispense(@CurrentUser('tenantId') tid: string, @Param('prescriptionId') pid: string, @Body() body: DispenseDto, @CurrentUser('sub') uid: string) { return this.svc.dispensePrescription(tid, pid, body, uid); }
  @Post('prescriptions/:prescriptionId/dispense') dispenseAlias(@CurrentUser('tenantId') tid: string, @Param('prescriptionId') pid: string, @Body() body: DispenseDto, @CurrentUser('sub') uid: string) { return this.svc.dispensePrescription(tid, pid, body, uid); }
  @Get('low-stock') lowStock(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.getLowStockAlerts(tid, lid); }
  @Get('expiry-alerts') expiryAlerts(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string, @Query('daysAhead') days: number) { return this.svc.getExpiryAlerts(tid, lid, days); }

  @Get('returns')
  getReturns(@CurrentUser('tenantId') tid: string, @Query() query: any) {
    return this.svc.getReturns(tid, query);
  }

  @Post('returns')
  createReturn(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string, @Body() body: any) {
    return this.svc.createReturn(tid, body, uid);
  }

  @Patch('returns/:id/review')
  reviewReturn(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string, @Param('id') id: string, @Body() body: any) {
    return this.svc.reviewReturn(tid, id, body, uid);
  }
}
