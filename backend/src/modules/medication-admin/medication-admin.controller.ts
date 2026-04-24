import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MedicationAdminService } from './medication-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Medication Administration')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_MED_ADMIN')
@Roles('SYS_ORG_ADMIN', 'SYS_NURSE', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE', 'SYS_PHARMACIST', 'SYS_PHARMACY_INCHARGE')
@Controller('medication-admin')
export class MedicationAdminController {
  constructor(private svc: MedicationAdminService) {}
  @Get('mar/:admissionId') getMAR(@CurrentUser('tenantId') tid: string, @Param('admissionId') aid: string) { return this.svc.getMARForAdmission(tid, aid); }
  @Post('schedule') schedule(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.scheduleMedication(tid, body); }
  @Patch(':id/administer') administer(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.recordAdministration(tid, id, body, uid); }
  @Get('pending') pending(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.getPendingForNurse(tid, lid); }
  @Post('prn') schedulePrn(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.schedulePrnDose(tid, body, uid); }
  @Post('verify-barcode') verifyBarcode(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.verifyMedicationBarcode(tid, body); }
  @Post('reconciliation') createReconciliation(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.createReconciliation(tid, uid, body); }
  @Get('reconciliation/:admissionId') getReconciliation(@CurrentUser('tenantId') tid: string, @Param('admissionId') aid: string) { return this.svc.getReconciliation(tid, aid); }
}
