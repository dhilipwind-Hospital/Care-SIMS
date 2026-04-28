import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MlcRegisterService } from './mlc-register.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('MLC Register') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN', 'SYS_DOCTOR', 'SYS_SENIOR_DOCTOR', 'SYS_RECEPTIONIST', 'SYS_NURSE')
@Controller('mlc')
export class MlcRegisterController {
  constructor(private svc: MlcRegisterService) {}
  @Post() register(@CurrentUser('tenantId') tid: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.register(tid, body, uid); }
  @Get() getAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.getAll(tid, q); }
  @Get(':id') getOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.getOne(tid, id); }
  @Patch(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any) { return this.svc.update(tid, id, body); }
}
