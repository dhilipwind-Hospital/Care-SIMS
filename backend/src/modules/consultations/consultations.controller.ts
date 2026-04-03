import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StartConsultationDto } from './dto/start-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { CompleteConsultationDto } from './dto/complete-consultation.dto';

@ApiTags('Consultations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_CONSULT')
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_HOD')
@Controller('consultations')
export class ConsultationsController {
  constructor(private svc: ConsultationsService) {}
  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Post() start(@CurrentUser('tenantId') tid: string, @Body() body: StartConsultationDto) { return this.svc.start(tid, body); }
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateConsultationDto) { return this.svc.update(tid, id, body); }
  @Patch(':id/complete') complete(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: CompleteConsultationDto) { return this.svc.complete(tid, id, body); }
}
