import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DoctorRegistryService } from './doctor-registry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Doctor Registry') @ApiBearerAuth('access-token') @Controller('doctors')
export class DoctorRegistryController {
  constructor(private svc: DoctorRegistryService) {}
  @Get() @UseGuards(JwtAuthGuard) getDoctors(@Query() q: any) { return this.svc.getDoctors(q); }
  @Post('register') register(@Body() body: any) { return this.svc.register(body); }
  @Get(':id') @UseGuards(JwtAuthGuard) getDoctor(@Param('id') id: string) { return this.svc.getDoctor(id); }
  @Put(':id') @UseGuards(JwtAuthGuard) update(@Param('id') id: string, @Body() body: any) { return this.svc.updateDoctor(id, body); }
  @Get('affiliations/tenant') @UseGuards(JwtAuthGuard) getAffiliations(@CurrentUser('tenantId') tid: string) { return this.svc.getAffiliations(tid); }
  @Post('affiliations') @UseGuards(JwtAuthGuard) addAffiliation(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.addAffiliation(tid, body); }
  @Patch('affiliations/:id') @UseGuards(JwtAuthGuard) updateAffiliation(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateAffiliation(tid, id, body); }
  @Get('by-location/:locationId') @UseGuards(JwtAuthGuard) byLocation(@CurrentUser('tenantId') tid: string, @Param('locationId') lid: string) { return this.svc.getDoctorsByLocation(tid, lid); }
}
