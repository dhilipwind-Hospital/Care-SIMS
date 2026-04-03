import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DietService } from './diet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Diet & Nutrition')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@RequireFeature('MOD_DIET')
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_NURSE', 'SYS_DIETITIAN')
@Controller('diet')
export class DietController {
  constructor(private svc: DietService) {}

  @Get('orders')
  orders(@CurrentUser('tenantId') tid: string, @Query('status') s?: string, @Query('wardId') wid?: string) { return this.svc.listOrders(tid, s, wid); }

  @Post('orders')
  createOrder(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createOrder(tid, body); }

  @Get('orders/:id')
  getOrder(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getOrder(tid, id); }

  @Patch('orders/:id')
  updateOrder(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateOrder(tid, id, body); }

  @Delete('orders/:id')
  removeOrder(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.removeOrder(tid, id); }

  @Patch('orders/:id/cancel')
  cancelOrder(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.cancelOrder(tid, id); }

  @Post('meals')
  planMeal(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.planMeal(tid, body); }

  @Patch('meals/:id/serve')
  serveMeal(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('userId') uid: string) { return this.svc.serveMeal(tid, id, uid); }

  @Patch('meals/:id/feedback')
  mealFeedback(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.mealFeedback(tid, id, body); }

  @Get('meals/today')
  todayMeals(@CurrentUser('tenantId') tid: string, @Query('wardId') wid?: string) { return this.svc.todayMeals(tid, wid); }
}
