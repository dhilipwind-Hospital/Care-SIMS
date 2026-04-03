import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { generateCsv, sendCsvResponse, CsvColumn } from '../../common/utils/csv-export';
import { IssueTokenDto } from './dto/issue-token.dto';
import { CallNextDto } from './dto/call-next.dto';
import { UpdateTokenStatusDto } from './dto/update-status.dto';

@ApiTags('Queue')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_QUEUE')
@Roles('SYS_ORG_ADMIN', 'SYS_RECEPTIONIST', 'SYS_FRONT_OFFICE', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_NURSE', 'SYS_WARD_NURSE', 'SYS_CHARGE_NURSE')
@Controller('queue')
export class QueueController {
  constructor(private svc: QueueService) {}
  @Get() getQueue(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string, @Query('doctorId') did: string, @Query('date') date: string) { return this.svc.getTodayQueue(tid, lid, did, date); }

  @Get('export')
  async exportCsv(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string, @Query('date') date: string, @Res() res: Response) {
    const { tokens } = await this.svc.getTodayQueue(tid, lid, undefined, date);
    const columns: CsvColumn[] = [
      { header: 'Token #', key: 'tokenNumber' },
      { header: 'Patient ID', key: 'patient.patientId' },
      { header: 'Patient Name', key: 'patient', transform: (_v, row) => `${row.patient?.firstName || ''} ${row.patient?.lastName || ''}`.trim() },
      { header: 'Status', key: 'status' },
      { header: 'Priority', key: 'priority' },
      { header: 'Visit Type', key: 'visitType' },
      { header: 'Queue Date', key: 'queueDate', transform: (v) => v ? new Date(v).toLocaleDateString() : '' },
    ];
    sendCsvResponse(res, `queue-${new Date().toISOString().slice(0, 10)}.csv`, generateCsv(columns, tokens));
  }
  @Get('doctor/:doctorId') getDoctorQueue(@CurrentUser('tenantId') tid: string, @Param('doctorId') did: string, @Query('limit') limit: number) { return this.svc.getDoctorQueue(tid, did, limit); }
  @Get('stats') stats(@CurrentUser('tenantId') tid: string, @Query('locationId') lid: string) { return this.svc.getStats(tid, lid); }
  @Post('token') issue(@CurrentUser('tenantId') tid: string, @Body() body: IssueTokenDto, @CurrentUser('sub') uid: string) { return this.svc.issueToken(tid, body, uid); }
  @Post('call-next') callNext(@CurrentUser('tenantId') tid: string, @Body() body: CallNextDto) { return this.svc.callNext(tid, body.locationId, body.doctorId); }
  @Patch(':id/status') updateStatus(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateTokenStatusDto) { return this.svc.updateStatus(tid, id, body.status, body); }
  @Patch(':id/no-show') noShow(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.updateStatus(tid, id, 'NO_SHOW'); }
}
