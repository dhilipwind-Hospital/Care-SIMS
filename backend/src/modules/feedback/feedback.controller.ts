import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Patient Feedback')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_RECEPTIONIST', 'SYS_FRONT_OFFICE', 'SYS_NURSE', 'SYS_DOCTOR', 'SYS_COMPLIANCE_OFFICER')
@Controller('feedback')
export class FeedbackController {
  constructor(private svc: FeedbackService) {}

  @Post() submit(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.submit(tid, body); }
  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get('analytics') analytics(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.analytics(tid, q); }
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Patch(':id/review') review(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.review(tid, id, uid); }
}
