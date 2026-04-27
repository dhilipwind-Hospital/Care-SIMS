import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Vendors') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_PHARMACY_INCHARGE', 'SYS_BILLING_MANAGER')
@Controller('vendors')
export class VendorController {
  constructor(private svc: VendorService) {}
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.create(tid, body); }
  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Patch(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }
  @Post(':id/contracts') addContract(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.addContract(tid, id, body); }
  @Get(':id/contracts') getContracts(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getContracts(tid, id); }
}
