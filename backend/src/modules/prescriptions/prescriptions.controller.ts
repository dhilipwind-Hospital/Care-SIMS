import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

@ApiTags('Prescriptions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_RX')
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_HOD', 'SYS_PHARMACIST', 'SYS_PHARMACY_INCHARGE')
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private svc: PrescriptionsService) {}
  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: CreatePrescriptionDto) { return this.svc.create(tid, body); }
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Patch(':id/send-to-pharmacy') send(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.sendToPharmacy(tid, id); }
  @Post(':id/send-pharmacy') sendAlias(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.sendToPharmacy(tid, id); }
  @Patch(':id/status') updateStatus(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('status') status: string) { return this.svc.updatePrescriptionStatus(tid, id, status); }
  @Patch(':id/cancel') cancel(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('reason') reason: string, @CurrentUser('sub') uid: string) { return this.svc.cancel(tid, id, reason, uid); }
}
