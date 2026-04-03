import { Controller, Post, Get, Put, Delete, Body, Req, UseGuards, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SelectOrgDto, SelectOrgForPatientDto } from './dto/select-org.dto';
import { MfaCodeDto, RefreshTokenDto } from './dto/mfa.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: any) {
    return this.authService.loginTenant(body.email, body.password, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('platform/login')
  platformLogin(@Body() body: LoginDto) {
    return this.authService.loginPlatform(body.email, body.password);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('doctor/login')
  doctorLogin(@Body() body: LoginDto) {
    return this.authService.loginDoctor(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('doctor/select-org')
  selectOrg(@CurrentUser('sub') doctorId: string, @Body() body: SelectOrgDto) {
    return this.authService.selectOrgForDoctor(doctorId, body.affiliationId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/verify')
  verifyMfa(@CurrentUser() user: any, @Body() body: MfaCodeDto) {
    return this.authService.verifyMfa(user.sub, user.tenantId, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  setupMfa(@CurrentUser() user: any) {
    return this.authService.setupMfa(user.sub, user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/activate')
  activateMfa(@CurrentUser() user: any, @Body() body: MfaCodeDto) {
    return this.authService.activateMfa(user.sub, user.tenantId, body.code);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.sub, user.tenantId, user.type);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/password')
  changePassword(@CurrentUser() user: any, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, user.tenantId, body.currentPassword, body.newPassword);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('patient/register')
  registerPatient(@Body() body: RegisterPatientDto) {
    return this.authService.registerPatient(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('patient/login')
  loginPatient(@Body() body: LoginDto) {
    return this.authService.loginPatient(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('patient/select-org')
  selectOrgForPatient(@CurrentUser('sub') patientAccountId: string, @Body() body: SelectOrgForPatientDto) {
    return this.authService.selectOrgForPatient(patientAccountId, body.tenantId, body.locationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('patient/me/appointments')
  getPatientAppointments(@CurrentUser() user: any, @Query() q: any) {
    return this.authService.getPatientAppointments(user.tenantId, user.sub, q);
  }

  @UseGuards(JwtAuthGuard)
  @Get('patient/me/prescriptions')
  getPatientPrescriptions(@CurrentUser() user: any, @Query() q: any) {
    return this.authService.getPatientPrescriptions(user.tenantId, user.sub, q);
  }

  @UseGuards(JwtAuthGuard)
  @Get('patient/me/lab-reports')
  getPatientLabReports(@CurrentUser() user: any, @Query() q: any) {
    return this.authService.getPatientLabReports(user.tenantId, user.sub, q);
  }

  @UseGuards(JwtAuthGuard)
  @Get('patient/me/billing')
  getPatientBilling(@CurrentUser() user: any, @Query() q: any) {
    return this.authService.getPatientBilling(user.tenantId, user.sub, q);
  }

  @UseGuards(JwtAuthGuard)
  @Get('patient/me/vitals')
  getPatientVitals(@CurrentUser() user: any) {
    return this.authService.getPatientVitals(user.tenantId, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('patient/me/profile')
  getPatientProfile(@CurrentUser() user: any) {
    return this.authService.getPatientProfile(user.tenantId, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('device-token')
  @HttpCode(200)
  registerDeviceToken(@CurrentUser('sub') userId: string, @CurrentUser('type') type: string, @Body() body: any) {
    return this.authService.registerDeviceToken(userId, type, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('device-token')
  @HttpCode(200)
  unregisterDeviceToken(@CurrentUser('sub') userId: string, @CurrentUser('type') type: string, @Body() body: any) {
    return this.authService.unregisterDeviceToken(userId, type, body);
  }
}
