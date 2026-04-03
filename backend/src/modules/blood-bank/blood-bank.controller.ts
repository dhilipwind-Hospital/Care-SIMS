import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BloodBankService } from './blood-bank.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Blood Bank')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_BLOOD_BANK')
@Roles('SYS_ORG_ADMIN', 'SYS_LAB_TECH', 'SYS_DOCTOR')
@Controller('blood-bank')
export class BloodBankController {
  constructor(private svc: BloodBankService) {}
  @Get('donors') donors(@CurrentUser('tenantId') tid: string, @Query('bloodGroup') bg?: string) { return this.svc.listDonors(tid, bg); }
  @Post('donors') addDonor(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.addDonor(tid, body); }
  @Get('donors/:id') getDonor(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getDonor(tid, id); }
  @Post('donations') donate(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Body() body: any) { return this.svc.recordDonation(tid, uid, body); }
  @Get('inventory') inventory(@CurrentUser('tenantId') tid: string, @Query('bloodGroup') bg?: string, @Query('status') s?: string) { return this.svc.listInventory(tid, bg, s); }
  @Get('inventory/summary') summary(@CurrentUser('tenantId') tid: string) { return this.svc.inventorySummary(tid); }
  @Get('transfusions') listTransfusions(@CurrentUser('tenantId') tid: string, @Query('status') s?: string) { return this.svc.listTransfusions(tid, s); }
  @Post('transfusions') orderTransfusion(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.orderTransfusion(tid, body); }
  @Patch('transfusions/:id/crossmatch') crossmatch(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Param('id') id: string) { return this.svc.crossMatch(tid, id, uid); }
  @Patch('transfusions/:id/administer') administer(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string, @Param('id') id: string, @Body() body: any) { return this.svc.administer(tid, id, uid, body); }
}
