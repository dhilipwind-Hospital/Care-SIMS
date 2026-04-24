import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Medical Certificates')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_HOD')
@Controller('certificates')
export class CertificatesController {
  constructor(private svc: CertificatesService) {}

  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.create(tid, body, uid); }
  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Patch(':id/print') markPrinted(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.markPrinted(tid, id); }
}
