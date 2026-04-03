import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('Referrals') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard) @RequireFeature('MOD_REFERRAL') @Roles('SYS_ORG_ADMIN','SYS_DOCTOR','SYS_SENIOR_DOCTOR')
@Controller('referrals')
export class ReferralController {
  constructor(private svc: ReferralService) {}
  @Get() list(@CurrentUser('tenantId') tid: string, @Query('status') s?: string) { return this.svc.list(tid, s); }
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.create(tid, body); }
  @Patch(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }
  @Get('my-referrals') myReferrals(@CurrentUser('tenantId') tid: string, @CurrentUser('userId') uid: string) { return this.svc.myReferrals(tid, uid); }
  @Get(':id') getOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getOne(tid, id); }
  @Patch(':id/accept') accept(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.accept(tid, id); }
  @Patch(':id/decline') decline(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('reason') reason: string) { return this.svc.decline(tid, id, reason); }
  @Patch(':id/complete') complete(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.complete(tid, id, body); }
  @Delete(':id') remove(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
}
