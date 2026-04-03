import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PhysiotherapyService } from './physiotherapy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Physiotherapy')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_PHYSIOTHERAPY')
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_NURSE', 'SYS_PHYSIOTHERAPIST')
@Controller('physiotherapy')
export class PhysiotherapyController {
  constructor(private svc: PhysiotherapyService) {}

  @Get('orders')
  orders(@CurrentUser('tenantId') tid: string, @Query('status') s?: string) { return this.svc.listOrders(tid, s); }

  @Post('orders')
  createOrder(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createOrder(tid, body); }

  @Get('orders/:id')
  getOrder(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getOrder(tid, id); }

  @Patch('orders/:id')
  updateOrder(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateOrder(tid, id, body); }

  @Post('orders/:id/sessions')
  addSession(@CurrentUser('tenantId') tid: string, @Param('id') orderId: string, @Body() body: any) { return this.svc.addSession(tid, orderId, body); }

  @Get('orders/:id/sessions')
  getSessions(@CurrentUser('tenantId') tid: string, @Param('id') orderId: string) { return this.svc.listSessions(tid, orderId); }

  @Delete('orders/:id')
  removeOrder(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.removeOrder(tid, id); }
}
