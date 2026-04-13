import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { sendEmail } from '../../common/utils/mailer';

// In-memory store for password reset tokens
// Key: hashed token, Value: { email, userType, userId, expiresAt }
const resetTokenStore = new Map<string, { email: string; userType: string; userId: string; expiresAt: Date }>();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async loginTenant(email: string, password: string, ipAddress?: string) {
    const user = await this.prisma.tenantUser.findFirst({
      where: { email, isActive: true },
      include: { role: { include: { permissions: true, specialFlags: true } } },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account deactivated');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant?.isActive) throw new UnauthorizedException('Organization is suspended');

    if (user.mfaEnabled) {
      const mfaToken = this.jwtService.sign(
        { sub: user.id, tenantId: user.tenantId, mfaStep: true },
        { expiresIn: '5m', secret: this.config.get('JWT_ACCESS_SECRET') },
      );
      return { mfaRequired: true, mfaToken };
    }

    await this.prisma.tenantUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    return this.buildTenantTokenResponse(user, tenant);
  }

  async verifyMfa(userId: string, tenantId: string, code: string) {
    const user = await this.prisma.tenantUser.findFirst({
      where: { id: userId, tenantId },
      include: { role: { include: { permissions: true, specialFlags: true } } },
    });
    if (!user?.mfaSecret) throw new UnauthorizedException('MFA not configured');

    const isValid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!isValid) throw new UnauthorizedException('Invalid MFA code');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    await this.prisma.tenantUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    return this.buildTenantTokenResponse(user, tenant);
  }

  async loginPlatform(email: string, password: string) {
    const user = await this.prisma.platformUser.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.platformUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const payload = {
      sub: user.id,
      email: user.email,
      type: 'PLATFORM',
      platformRole: user.platformRole,
    };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '8h', secret: this.config.get('JWT_ACCESS_SECRET') }),
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, platformRole: user.platformRole },
    };
  }

  async loginDoctor(email: string, password: string) {
    const doctor = await this.prisma.doctorRegistry.findUnique({ where: { email } });
    if (!doctor) throw new UnauthorizedException('Invalid credentials');
    if (doctor.ayphenStatus !== 'VERIFIED') throw new UnauthorizedException(`Account status: ${doctor.ayphenStatus}`);

    const valid = await bcrypt.compare(password, doctor.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.doctorRegistry.update({ where: { id: doctor.id }, data: { lastLogin: new Date() } });

    const affiliations = await this.prisma.doctorOrgAffiliation.findMany({
      where: { doctorId: doctor.id, isActive: true },
      include: { tenant: true, location: true },
    });

    const payload = { sub: doctor.id, email: doctor.email, type: 'DOCTOR' };
    const token = this.jwtService.sign(payload, { expiresIn: '15m', secret: this.config.get('JWT_ACCESS_SECRET') });

    return {
      accessToken: token,
      doctor: { id: doctor.id, email: doctor.email, firstName: doctor.firstName, lastName: doctor.lastName },
      affiliations: affiliations.map((a) => ({
        affiliationId: a.id,
        tenantId: a.tenantId,
        orgName: a.tenant.tradeName || a.tenant.legalName,
        locationName: a.location?.name,
        locationId: a.locationId,
        status: a.status,
      })),
    };
  }

  async selectOrgForDoctor(doctorId: string, affiliationId: string) {
    const affiliation = await this.prisma.doctorOrgAffiliation.findFirst({
      where: { id: affiliationId, doctorId, isActive: true },
      include: { tenant: true, location: true },
    });
    if (!affiliation) throw new UnauthorizedException('Invalid affiliation');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: affiliation.tenantId } });
    const enabledFeatures = await this.prisma.organizationFeature.findMany({
      where: { tenantId: affiliation.tenantId, isEnabled: true },
    });

    const payload = {
      sub: doctorId,
      type: 'TENANT',
      tenantId: affiliation.tenantId,
      locationId: affiliation.locationId,
      roleId: null,
      systemRoleId: 'SYS_DOCTOR',
      isDoctor: true,
      doctorAffiliationId: affiliationId,
      locationScope: affiliation.locationScope,
      enabledModules: enabledFeatures.map((f) => f.moduleId),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      secret: this.config.get('JWT_ACCESS_SECRET'),
    });

    return {
      accessToken,
      tenantName: tenant.tradeName || tenant.legalName,
      locationName: affiliation.location?.name,
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, { secret: this.config.get('JWT_REFRESH_SECRET') });
      if (payload.type === 'TENANT') {
        const user = await this.prisma.tenantUser.findFirst({
          where: { id: payload.sub, tenantId: payload.tenantId, isActive: true },
          include: { role: { include: { permissions: true, specialFlags: true } } },
        });
        if (!user) throw new UnauthorizedException();
        const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
        return this.buildTenantTokenResponse(user, tenant);
      }
      throw new UnauthorizedException('Invalid refresh token type');
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getMe(userId: string, tenantId: string, userType?: string) {
    // Platform user — no tenantId
    if (!tenantId || userType === 'PLATFORM') {
      const platformUser = await this.prisma.platformUser.findUnique({ where: { id: userId } });
      if (platformUser) {
        return {
          id: platformUser.id,
          email: platformUser.email,
          firstName: platformUser.firstName,
          lastName: platformUser.lastName,
          role: { name: platformUser.platformRole, systemRoleId: platformUser.platformRole },
          platformRole: platformUser.platformRole,
          type: 'PLATFORM',
          permissions: [],
          specialFlags: [],
          enabledModules: [],
        };
      }
    }

    // Doctor user — no tenantId
    if (!tenantId || userType === 'DOCTOR') {
      const doctor = await this.prisma.doctorRegistry.findUnique({ where: { id: userId } });
      if (doctor) {
        return {
          id: doctor.id,
          email: doctor.email,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          role: { name: 'DOCTOR', systemRoleId: 'SYS_DOCTOR' },
          type: 'DOCTOR',
          specialties: doctor.specialties,
          permissions: [],
          specialFlags: [],
          enabledModules: [],
        };
      }
    }

    // Tenant user
    const user = await this.prisma.tenantUser.findFirst({
      where: { id: userId, tenantId },
      include: { role: { include: { permissions: true, specialFlags: true } } },
    });
    if (!user) throw new UnauthorizedException();

    const enabledModules = await this.prisma.organizationFeature.findMany({
      where: { tenantId, isEnabled: true },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      role: { id: user.role.id, name: user.role.name, systemRoleId: user.role.systemRoleId },
      tenantId: user.tenantId,
      primaryLocationId: user.primaryLocationId,
      locationScope: user.locationScope,
      allowedLocations: user.allowedLocations,
      permissions: user.role.permissions.map((p) => `${p.resource}:${p.action}`),
      specialFlags: user.role.specialFlags.filter((f) => f.isEnabled).map((f) => f.flag),
      enabledModules: enabledModules.map((m) => m.moduleId),
      forcePasswordChange: user.forcePasswordChange,
    };
  }

  async setupMfa(userId: string, tenantId: string) {
    const user = await this.prisma.tenantUser.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new UnauthorizedException();

    const secret = authenticator.generateSecret();
    const issuer = this.config.get('MFA_ISSUER', 'AyphenHMS');
    const otpauth = authenticator.keyuri(user.email, issuer, secret);
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    await this.prisma.tenantUser.update({ where: { id: userId }, data: { mfaSecret: secret } });
    return { qrCodeUrl, secret };
  }

  async activateMfa(userId: string, tenantId: string, code: string) {
    const user = await this.prisma.tenantUser.findFirst({ where: { id: userId, tenantId } });
    if (!user?.mfaSecret) throw new BadRequestException('MFA setup not initiated');

    const isValid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!isValid) throw new BadRequestException('Invalid MFA code');

    await this.prisma.tenantUser.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { message: 'MFA activated successfully' };
  }

  async changePassword(userId: string, tenantId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.tenantUser.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.tenantUser.update({
      where: { id: userId },
      data: { passwordHash: newHash, passwordChangedAt: new Date(), forcePasswordChange: false },
    });
    return { message: 'Password changed successfully' };
  }

  private async buildTenantTokenResponse(user: any, tenant: any) {
    const enabledModules = await this.prisma.organizationFeature.findMany({
      where: { tenantId: user.tenantId, isEnabled: true },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      type: 'TENANT',
      tenantId: user.tenantId,
      roleId: user.roleId,
      systemRoleId: user.role?.systemRoleId,
      locationId: user.primaryLocationId,
      locationScope: user.locationScope,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      secret: this.config.get('JWT_ACCESS_SECRET'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: { id: user.role.id, name: user.role.name, systemRoleId: user.role.systemRoleId },
        tenantId: user.tenantId,
        tenantName: tenant?.tradeName || tenant?.legalName,
        tenantSlug: tenant?.slug,
        tenantLogoUrl: tenant?.logoUrl || null,
        tenantPrimaryEmail: tenant?.primaryEmail || null,
        tenantPrimaryPhone: tenant?.primaryPhone || null,
        tenantWebsite: tenant?.website || null,
        locationId: user.primaryLocationId,
        locationScope: user.locationScope,
        permissions: user.role?.permissions?.map((p: any) => `${p.resource}:${p.action}`) || [],
        specialFlags: user.role?.specialFlags?.filter((f: any) => f.isEnabled).map((f: any) => f.flag) || [],
        enabledModules: enabledModules.map((m) => m.moduleId),
        forcePasswordChange: user.forcePasswordChange,
      },
    };
  }

  // ── PATIENT SELF-REGISTRATION ─────────────────────────────────────────────
  async registerPatient(dto: {
    firstName: string; lastName: string; email: string; password: string;
    phone: string; dateOfBirth?: string; gender?: string; bloodGroup?: string;
  }) {
    const existing = await this.prisma.patientAccount.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('An account with this email already exists');

    const hash = await bcrypt.hash(dto.password, 12);
    const account = await this.prisma.patientAccount.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
      },
    });
    return { message: 'Registration successful', id: account.id };
  }

  async loginPatient(email: string, password: string) {
    const account = await this.prisma.patientAccount.findUnique({ where: { email } });
    if (!account || !account.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.patientAccount.update({ where: { id: account.id }, data: { lastLogin: new Date() } });

    // Return list of active organizations for the patient to choose
    const orgs = await this.prisma.tenant.findMany({
      where: { isActive: true, subscriptionStatus: 'ACTIVE' },
      select: {
        id: true, tradeName: true, legalName: true, orgType: true, slug: true,
        locations: { where: { isActive: true }, select: { id: true, name: true, city: true, type: true } },
      },
      orderBy: { tradeName: 'asc' },
    });

    const payload = { sub: account.id, email: account.email, type: 'PATIENT' };
    const token = this.jwtService.sign(payload, {
      expiresIn: '30m',
      secret: this.config.get('JWT_ACCESS_SECRET'),
    });

    return {
      accessToken: token,
      patient: { id: account.id, email: account.email, firstName: account.firstName, lastName: account.lastName },
      organizations: orgs.map(o => ({
        id: o.id,
        name: o.tradeName || o.legalName,
        orgType: o.orgType,
        slug: o.slug,
        locations: o.locations,
      })),
    };
  }

  async selectOrgForPatient(patientAccountId: string, tenantId: string, locationId?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.isActive) throw new BadRequestException('Organization not found or inactive');

    const account = await this.prisma.patientAccount.findUnique({ where: { id: patientAccountId } });
    if (!account) throw new UnauthorizedException('Patient account not found');

    const enabledFeatures = await this.prisma.organizationFeature.findMany({
      where: { tenantId, isEnabled: true },
    });

    const payload = {
      sub: patientAccountId,
      email: account.email,
      type: 'PATIENT_TENANT',
      tenantId,
      locationId: locationId || null,
      enabledModules: enabledFeatures.map(f => f.moduleId),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '8h',
      secret: this.config.get('JWT_ACCESS_SECRET'),
    });

    return {
      accessToken,
      tenantName: tenant.tradeName || tenant.legalName,
      tenantId,
    };
  }

  // ── PATIENT SELF-SERVICE DATA ─────────────────────────────────────────────
  // These resolve patientAccountId → patient record (by email match) then return data

  private async resolvePatientRecord(tenantId: string, patientAccountId: string) {
    const account = await this.prisma.patientAccount.findUnique({ where: { id: patientAccountId } });
    if (!account) throw new UnauthorizedException('Patient account not found');
    // Find the patient record in this tenant by email or mobile
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: account.email },
    });
    return { account, patient };
  }

  async getPatientAppointments(tenantId: string, patientAccountId: string, query: any) {
    const { patient } = await this.resolvePatientRecord(tenantId, patientAccountId);
    if (!patient) return { data: [], meta: { total: 0 } };
    const { status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, patientId: patient.id };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({ where, skip, take: Number(limit), orderBy: [{ appointmentDate: 'desc' }] }),
      this.prisma.appointment.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getPatientPrescriptions(tenantId: string, patientAccountId: string, query: any) {
    const { patient } = await this.resolvePatientRecord(tenantId, patientAccountId);
    if (!patient) return { data: [], meta: { total: 0 } };
    const { status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, patientId: patient.id };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({ where, skip, take: Number(limit), orderBy: { issuedAt: 'desc' }, include: { items: true } }),
      this.prisma.prescription.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getPatientLabReports(tenantId: string, patientAccountId: string, query: any) {
    const { patient } = await this.resolvePatientRecord(tenantId, patientAccountId);
    if (!patient) return [];
    const orders = await this.prisma.labOrder.findMany({
      where: { tenantId, patientId: patient.id },
      orderBy: { orderedAt: 'desc' },
      take: Number(query.limit) || 20,
      include: { items: true, results: { include: { items: true } } },
    });
    return orders;
  }

  async getPatientBilling(tenantId: string, patientAccountId: string, query: any) {
    const { patient } = await this.resolvePatientRecord(tenantId, patientAccountId);
    if (!patient) return { data: [], meta: { total: 0 } };
    const { status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, patientId: patient.id };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' }, include: { lineItems: true, payments: true } }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getPatientVitals(tenantId: string, patientAccountId: string) {
    const { patient } = await this.resolvePatientRecord(tenantId, patientAccountId);
    if (!patient) return [];
    return this.prisma.vital.findMany({
      where: { tenantId, patientId: patient.id },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
  }

  async getPatientProfile(tenantId: string, patientAccountId: string) {
    const { account, patient } = await this.resolvePatientRecord(tenantId, patientAccountId);
    return {
      account: { id: account.id, email: account.email, firstName: account.firstName, lastName: account.lastName, phone: account.phone, dateOfBirth: account.dateOfBirth, gender: account.gender, bloodGroup: account.bloodGroup },
      patient,
    };
  }

  // ── FORGOT / RESET PASSWORD ─────────────────────────────────────────────

  async forgotPassword(email: string) {
    const safeResponse = { message: 'If an account exists, a reset link has been sent' };

    // Search across all user tables
    let userId: string | null = null;
    let userType: string | null = null;

    const tenantUser = await this.prisma.tenantUser.findFirst({ where: { email, isActive: true } });
    if (tenantUser) {
      userId = tenantUser.id;
      userType = 'TENANT';
    }

    if (!userId) {
      const platformUser = await this.prisma.platformUser.findUnique({ where: { email } });
      if (platformUser && platformUser.isActive) {
        userId = platformUser.id;
        userType = 'PLATFORM';
      }
    }

    if (!userId) {
      const doctor = await this.prisma.doctorRegistry.findUnique({ where: { email } });
      if (doctor) {
        userId = doctor.id;
        userType = 'DOCTOR';
      }
    }

    if (!userId) {
      const patient = await this.prisma.patientAccount.findUnique({ where: { email } });
      if (patient && patient.isActive) {
        userId = patient.id;
        userType = 'PATIENT';
      }
    }

    if (!userId || !userType) {
      // Don't reveal that the email doesn't exist
      return safeResponse;
    }

    // Generate token
    const rawToken = crypto.randomUUID();
    const hashedToken = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store hashed token
    resetTokenStore.set(hashedToken, { email, userType, userId, expiresAt });

    // Clean up expired tokens periodically
    for (const [key, val] of resetTokenStore.entries()) {
      if (val.expiresAt < new Date()) resetTokenStore.delete(key);
    }

    this.logger.log(`Password reset token generated for ${email} (type: ${userType}): ${rawToken}`);

    // Resolve org name for branded email (tenant users get hospital name, others get Ayphen HMS)
    let resetOrgName = 'Ayphen HMS';
    if (userType === 'TENANT' && tenantUser?.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantUser.tenantId }, select: { tradeName: true, legalName: true } });
      if (tenant) resetOrgName = tenant.tradeName || tenant.legalName;
    }

    // Send email (non-blocking, won't fail the request)
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5555');
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0F766E;">Password Reset Request</h2>
        <p>We received a request to reset your password for your ${resetOrgName} account.</p>
        <p>Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:linear-gradient(90deg,#0F766E,#14B8A6);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#aaa;font-size:12px;">${resetOrgName}</p>
      </div>
    `;
    sendEmail(email, `Password Reset - ${resetOrgName}`, html).catch((err) =>
      this.logger.error(`Failed to send reset email to ${email}`, err),
    );

    return safeResponse;
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = this.hashToken(token);
    const entry = resetTokenStore.get(hashedToken);

    if (!entry) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (entry.expiresAt < new Date()) {
      resetTokenStore.delete(hashedToken);
      throw new BadRequestException('Reset token has expired');
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password based on user type
    switch (entry.userType) {
      case 'TENANT':
        await this.prisma.tenantUser.update({
          where: { id: entry.userId },
          data: { passwordHash: newHash, passwordChangedAt: new Date(), forcePasswordChange: false },
        });
        break;
      case 'PLATFORM':
        await this.prisma.platformUser.update({
          where: { id: entry.userId },
          data: { passwordHash: newHash },
        });
        break;
      case 'DOCTOR':
        await this.prisma.doctorRegistry.update({
          where: { id: entry.userId },
          data: { passwordHash: newHash },
        });
        break;
      case 'PATIENT':
        await this.prisma.patientAccount.update({
          where: { id: entry.userId },
          data: { passwordHash: newHash },
        });
        break;
    }

    // Invalidate the token
    resetTokenStore.delete(hashedToken);

    this.logger.log(`Password reset successful for ${entry.email} (type: ${entry.userType})`);
    return { message: 'Password has been reset successfully' };
  }

  hashToken(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  // ── DEVICE TOKEN MANAGEMENT (Mobile Push) ─────────────────────────────────

  async registerDeviceToken(userId: string, type: string, body: {
    deviceToken?: string; deviceType?: string; fcmToken?: string; apnsToken?: string;
  }) {
    const data: any = {};
    if (body.deviceType) data.deviceType = body.deviceType;
    if (body.fcmToken) data.fcmToken = body.fcmToken;
    if (body.apnsToken) data.apnsToken = body.apnsToken;

    // Append deviceToken to the JSON array if provided
    const updateWithTokenArray = async (model: string, id: string, currentTokens: any) => {
      const tokens: string[] = Array.isArray(currentTokens) ? currentTokens : [];
      if (body.deviceToken && !tokens.includes(body.deviceToken)) {
        tokens.push(body.deviceToken);
      }
      data.deviceTokens = tokens;

      if (model === 'tenantUser') {
        return this.prisma.tenantUser.update({ where: { id }, data });
      } else if (model === 'doctorRegistry') {
        return this.prisma.doctorRegistry.update({ where: { id }, data });
      } else if (model === 'patientAccount') {
        return this.prisma.patientAccount.update({ where: { id }, data });
      }
    };

    if (type === 'TENANT') {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: userId } }) as any;
      if (!user) throw new BadRequestException('User not found');
      await updateWithTokenArray('tenantUser', userId, user.deviceTokens);
    } else if (type === 'DOCTOR') {
      const doctor = await this.prisma.doctorRegistry.findUnique({ where: { id: userId } }) as any;
      if (!doctor) throw new BadRequestException('Doctor not found');
      await updateWithTokenArray('doctorRegistry', userId, doctor.deviceTokens);
    } else if (type === 'PATIENT' || type === 'PATIENT_TENANT') {
      const patient = await this.prisma.patientAccount.findUnique({ where: { id: userId } }) as any;
      if (!patient) throw new BadRequestException('Patient not found');
      await updateWithTokenArray('patientAccount', userId, patient.deviceTokens);
    } else {
      throw new BadRequestException('Unsupported user type for device token');
    }

    return { message: 'Device token registered successfully' };
  }

  async unregisterDeviceToken(userId: string, type: string, body: { deviceToken?: string }) {
    const removeToken = async (model: string, id: string, currentTokens: any) => {
      let tokens: string[] = Array.isArray(currentTokens) ? currentTokens : [];
      if (body.deviceToken) {
        tokens = tokens.filter((t) => t !== body.deviceToken);
      }
      const data: any = { deviceTokens: tokens, fcmToken: null, apnsToken: null, deviceType: null };

      if (model === 'tenantUser') {
        return this.prisma.tenantUser.update({ where: { id }, data });
      } else if (model === 'doctorRegistry') {
        return this.prisma.doctorRegistry.update({ where: { id }, data });
      } else if (model === 'patientAccount') {
        return this.prisma.patientAccount.update({ where: { id }, data });
      }
    };

    if (type === 'TENANT') {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: userId } }) as any;
      if (!user) throw new BadRequestException('User not found');
      await removeToken('tenantUser', userId, user.deviceTokens);
    } else if (type === 'DOCTOR') {
      const doctor = await this.prisma.doctorRegistry.findUnique({ where: { id: userId } }) as any;
      if (!doctor) throw new BadRequestException('Doctor not found');
      await removeToken('doctorRegistry', userId, doctor.deviceTokens);
    } else if (type === 'PATIENT' || type === 'PATIENT_TENANT') {
      const patient = await this.prisma.patientAccount.findUnique({ where: { id: userId } }) as any;
      if (!patient) throw new BadRequestException('Patient not found');
      await removeToken('patientAccount', userId, patient.deviceTokens);
    } else {
      throw new BadRequestException('Unsupported user type for device token');
    }

    return { message: 'Device token unregistered successfully' };
  }
}
