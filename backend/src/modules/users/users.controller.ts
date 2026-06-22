import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SelfRegisterDto } from './dto/self-register.dto';

// User management is an ORG_ADMIN-only surface — non-admins must not be able
// to list, create, edit, or change roles for staff. The class-level Roles
// guard enforces that for every endpoint below except the @Public
// self-register form, which intentionally bypasses authentication.
@ApiTags('Users') @ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYS_ORG_ADMIN')
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Public()
  @Post('self-register')
  selfRegister(@Body() body: SelfRegisterDto) { return this.svc.selfRegister(body); }

  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: CreateUserDto, @CurrentUser('sub') uid: string) { return this.svc.create(tid, body, uid); }
  @Get('pending-self-reg') pending(@CurrentUser('tenantId') tid: string) { return this.svc.getPendingSelfReg(tid); }
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateUserDto) { return this.svc.update(tid, id, body); }
  @Patch(':id') patchUser(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateUserDto) { return this.svc.patchUser(tid, id, body); }
  @Patch(':id/role') changeRole(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('roleId') roleId: string) { return this.svc.changeRole(tid, id, roleId); }
  @Patch(':id/deactivate') deactivate(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.deactivate(tid, id); }
  @Patch(':id/reactivate') reactivate(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.reactivate(tid, id); }
  @Patch('self-reg/:id/approve') approve(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.approveSelfReg(tid, id, body.roleId, body.locationId, uid); }
  @Patch('self-reg/:id/reject') reject(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.rejectSelfReg(tid, id); }
}
