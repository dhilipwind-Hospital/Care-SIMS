import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SelfRegisterDto } from './dto/self-register.dto';

@ApiTags('Users') @Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Public()
  @Post('self-register')
  selfRegister(@Body() body: SelfRegisterDto) { return this.svc.selfRegister(body); }

  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Get() findAll(@CurrentUser('tenantId') tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }

  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Post() create(@CurrentUser('tenantId') tid: string, @Body() body: CreateUserDto, @CurrentUser('sub') uid: string) { return this.svc.create(tid, body, uid); }
  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Get('pending-self-reg') pending(@CurrentUser('tenantId') tid: string) { return this.svc.getPendingSelfReg(tid); }
  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Get(':id') findOne(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Put(':id') update(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateUserDto) { return this.svc.update(tid, id, body); }
  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Patch(':id') patchUser(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: UpdateUserDto) { return this.svc.patchUser(tid, id, body); }
  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Patch(':id/role') changeRole(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body('roleId') roleId: string) { return this.svc.changeRole(tid, id, roleId); }
  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Patch(':id/deactivate') deactivate(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.deactivate(tid, id); }
  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Patch(':id/reactivate') reactivate(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.reactivate(tid, id); }
  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Patch('self-reg/:id/approve') approve(@CurrentUser('tenantId') tid: string, @Param('id') id: string, @Body() body: any, @CurrentUser('sub') uid: string) { return this.svc.approveSelfReg(tid, id, body.roleId, body.locationId, uid); }
  @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
  @Patch('self-reg/:id/reject') reject(@CurrentUser('tenantId') tid: string, @Param('id') id: string) { return this.svc.rejectSelfReg(tid, id); }
}
