import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdmissionsService } from './admissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdmitPatientDto } from './dto/admit-patient.dto';
import { UpdateAdmissionDto } from './dto/update-admission.dto';
import { TransferBedDto } from './dto/transfer-bed.dto';
import { DischargeDto } from './dto/discharge.dto';

@ApiTags('Admissions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_ADMISSION')
@Roles('SYS_ORG_ADMIN', 'SYS_NURSE', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_RECEPTIONIST', 'SYS_FRONT_OFFICE')
@Controller('admissions')
export class AdmissionsController {
  constructor(private svc: AdmissionsService) {}
  @Get() getAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getAdmissions(tid, q); }
  @Post() admit(@CurrentUser('tenantId') tid: string, @Body() body: AdmitPatientDto) { return this.svc.admit(tid, body); }
  @Get(':id') getOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getAdmission(tid, id); }
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateAdmissionDto) { return this.svc.updateAdmission(tid, id, body); }
  @Patch(':id/transfer-bed') transfer(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: TransferBedDto) { return this.svc.transferBed(tid, id, body.newBedId); }
  @Patch(':id/discharge') discharge(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: DischargeDto) { return this.svc.discharge(tid, id, body); }
  @Patch(':id/pre-admission-checklist') updateChecklist(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('checklist') checklist: any) { return this.svc.updatePreAdmissionChecklist(tid, id, checklist); }
  @Post('bed-charges') addBedCharges(@CurrentUser('tenantId') tid: string, @CurrentUser('sub') uid: string) { return this.svc.addBedCharges(tid, uid); }
}
