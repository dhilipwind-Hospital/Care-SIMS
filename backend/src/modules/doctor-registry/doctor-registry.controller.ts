import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DoctorRegistryService } from './doctor-registry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Doctor Registry')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('doctors')
export class DoctorRegistryController {
  constructor(private svc: DoctorRegistryService) {}

  @Get()
  @Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_RECEPTIONIST')
  getDoctors(@Query() q: any) { return this.svc.getDoctors(q); }

  @Post('register')
  @Public()
  register(@Body() body: any) { return this.svc.register(body); }

  @Get('affiliations/tenant')
  @Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_RECEPTIONIST')
  getAffiliations(@CurrentUser('tenantId') tid: string) { return this.svc.getAffiliations(tid); }

  @Post('affiliations')
  @Roles('SYS_ORG_ADMIN')
  addAffiliation(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.addAffiliation(tid, body); }

  @Patch('affiliations/:id')
  @Roles('SYS_ORG_ADMIN')
  updateAffiliation(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateAffiliation(tid, id, body); }

  @Get('by-location/:locationId')
  @Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_RECEPTIONIST', 'SYS_NURSE')
  byLocation(@CurrentUser('tenantId') tid: string, @Param('locationId') lid: string) { return this.svc.getDoctorsByLocation(tid, lid); }

  @Get(':id')
  @Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_RECEPTIONIST')
  getDoctor(@Param('id') id: string) { return this.svc.getDoctor(id); }

  @Put(':id')
  @Roles('SYS_ORG_ADMIN')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.updateDoctor(id, body); }
}
