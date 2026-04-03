import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Res, } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { generateCsv, sendCsvResponse, CsvColumn } from '../../common/utils/csv-export';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@ApiTags('Patients')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_PAT_REG')
@Roles('SYS_ORG_ADMIN', 'SYS_RECEPTIONIST', 'SYS_FRONT_OFFICE', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_NURSE', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE', 'SYS_PHARMACIST', 'SYS_PHARMACY_INCHARGE')
@Controller('patients')
export class PatientsController {
  constructor(private svc: PatientsService) {}
  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }

  @Get('export')
  async exportCsv(@CurrentUser('tenantId') tid: string, @Query() q: any, @Res() res: Response) {
    const { data } = await this.svc.findAll(tid, { ...q, page: 1, limit: 10000 });
    const columns: CsvColumn[] = [
      { header: 'Patient ID', key: 'patientId' },
      { header: 'First Name', key: 'firstName' },
      { header: 'Last Name', key: 'lastName' },
      { header: 'Gender', key: 'gender' },
      { header: 'Age', key: 'ageYears' },
      { header: 'Mobile', key: 'mobile' },
      { header: 'Email', key: 'email' },
      { header: 'Blood Group', key: 'bloodGroup' },
      { header: 'Registered', key: 'createdAt', transform: (v) => v ? new Date(v).toLocaleDateString() : '' },
    ];
    sendCsvResponse(res, `patients-${new Date().toISOString().slice(0, 10)}.csv`, generateCsv(columns, data));
  }
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: CreatePatientDto, @CurrentUser('sub') uid: string) { return this.svc.create(tid, body, uid); }
  @Get('by-pid/:pid') findByPid(@CurrentUser('tenantId') tid: string, @Param('pid') pid: string) { return this.svc.findByPatientId(tid, pid); }

  @Get('summary/:id')
  getSummary(@CurrentUser('tenantId') tid: string, @Param('id') id: string) {
    return this.svc.getSummary(tid, id);
  }

  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdatePatientDto) { return this.svc.update(tid, id, body); }
  @Get(':id/history') history(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getHistory(tid, id); }
  @Get(':id/access-log') accessLog(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getAccessLog(tid, id); }
}
