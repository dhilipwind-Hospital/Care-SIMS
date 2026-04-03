import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { generateCsv, sendCsvResponse, CsvColumn } from '../../common/utils/csv-export';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('Appointments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_APPT')
@Roles('SYS_ORG_ADMIN', 'SYS_RECEPTIONIST', 'SYS_FRONT_OFFICE', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_NURSE', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE')
@Controller('appointments')
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}
  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }

  @Get('export')
  async exportCsv(@CurrentUser('tenantId') tid: string, @Query() q: any, @Res() res: Response) {
    const { data } = await this.svc.findAll(tid, { ...q, page: 1, limit: 10000 });
    const columns: CsvColumn[] = [
      { header: 'Patient ID', key: 'patient.patientId' },
      { header: 'Patient Name', key: 'patient', transform: (_v, row) => `${row.patient?.firstName || ''} ${row.patient?.lastName || ''}`.trim() },
      { header: 'Date', key: 'appointmentDate', transform: (v) => v ? new Date(v).toLocaleDateString() : '' },
      { header: 'Time', key: 'appointmentTime' },
      { header: 'Status', key: 'status' },
      { header: 'Visit Type', key: 'visitType' },
    ];
    sendCsvResponse(res, `appointments-${new Date().toISOString().slice(0, 10)}.csv`, generateCsv(columns, data));
  }
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: CreateAppointmentDto, @CurrentUser('sub') uid: string) { return this.svc.create(tid, body, uid); }
  @Get('slots') slots(@CurrentUser('tenantId') tid: string, @Query('doctorId') did: string, @Query('date') date: string, @Query('locationId') lid: string) { return this.svc.getDoctorSlots(tid, did, date, lid); }
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateAppointmentDto) { return this.svc.update(tid, id, body); }
  @Patch(':id/cancel') cancel(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('reason') reason: string, @CurrentUser('sub') uid: string) { return this.svc.cancel(tid, id, reason, uid); }
}
