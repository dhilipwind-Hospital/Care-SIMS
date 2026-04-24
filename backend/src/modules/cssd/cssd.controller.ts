import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CssdService } from './cssd.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('CSSD')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_NURSE', 'SYS_CHARGE_NURSE', 'SYS_OT_COORDINATOR', 'SYS_OT_NURSE')
@Controller('cssd')
export class CssdController {
  constructor(private svc: CssdService) {}

  // Batches
  @Post('batches') createBatch(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createBatch(tid, body); }
  @Get('batches') getBatches(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getBatches(tid, q); }
  @Get('batches/:id') getBatch(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getBatch(tid, id); }
  @Patch('batches/:id/start') startBatch(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.startBatch(tid, id, body); }
  @Patch('batches/:id/complete') completeBatch(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.completeBatch(tid, id, body); }

  // Items
  @Patch('items/:id/issue') issueItem(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.issueItem(tid, id, body); }
  @Patch('items/:id/return') returnItem(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.returnItem(tid, id, uid); }

  // Instrument Sets
  @Post('instrument-sets') createSet(@CurrentUser('tenantId') tid: string, @Body() body: any) { return this.svc.createInstrumentSet(tid, body); }
  @Get('instrument-sets') getSets(@CurrentUser('tenantId') tid: string) { return this.svc.getInstrumentSets(tid); }
  @Patch('instrument-sets/:id') updateSet(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.updateInstrumentSet(tid, id, body); }

  // Dashboard
  @Get('dashboard') dashboard(@CurrentUser('tenantId') tid: string) { return this.svc.dashboard(tid); }
}
