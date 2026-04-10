import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { sendEmail } from '../../common/utils/mailer';

function emailTemplate(title: string, body: string, orgName?: string): string {
  const brandName = orgName || 'Ayphen HMS';
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">${brandName}</h1>
  </div>
  <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;margin:0 0 16px;">${title}</h2>
    <p style="color:#4b5563;line-height:1.6;">${body}</p>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
    This is an automated message from ${brandName}. Do not reply.
  </p>
</div>`;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { roleId, locationId, status, q, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (roleId) where.roleId = roleId;
    if (locationId) where.primaryLocationId = locationId;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (q) where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { employeeId: { contains: q, mode: 'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      this.prisma.tenantUser.findMany({
        where, skip, take: Number(limit),
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, employeeId: true, isActive: true, lastLogin: true, primaryLocationId: true, locationScope: true, createdAt: true, role: { select: { id: true, name: true, systemRoleId: true } } },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.tenantUser.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
  }

  async create(tenantId: string, dto: any, createdById: string) {
    const existing = await this.prisma.tenantUser.findFirst({ where: { tenantId, email: dto.email } });
    if (existing) throw new ConflictException('Email already registered in this organization');

    // Resolve roleId — use provided, or find default
    let roleId = dto.roleId;
    if (!roleId) {
      const defaultRole = await this.prisma.tenantRole.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
      if (!defaultRole) throw new BadRequestException('No roles configured. Create a role first.');
      roleId = defaultRole.id;
    }

    // Resolve primaryLocationId — use provided, or find default
    let primaryLocationId = dto.primaryLocationId;
    if (!primaryLocationId) {
      const defaultLoc = await this.prisma.tenantLocation.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' } });
      if (!defaultLoc) throw new BadRequestException('No locations configured. Create a location first.');
      primaryLocationId = defaultLoc.id;
    }

    // Use provided password or generate temp password
    const password = dto.password || 'Ayphen@' + Math.random().toString(36).slice(2, 10).toUpperCase();
    const hash = await bcrypt.hash(password, 12);
    const user = await this.prisma.tenantUser.create({
      data: {
        tenantId, email: dto.email, passwordHash: hash,
        firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone,
        employeeId: dto.employeeId, roleId,
        primaryLocationId,
        locationScope: dto.locationScope || 'SINGLE',
        allowedLocations: dto.allowedLocations || [],
        forcePasswordChange: !dto.password, isActive: true,
        createdById, registrationSource: 'ADMIN_INVITE',
      },
      include: { role: true },
    });
    const { passwordHash, mfaSecret, ...safe } = user as any;

    // Resolve tenant name for branded email
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } });
    const orgName = tenant?.tradeName || tenant?.legalName || 'Hospital';

    // Non-blocking welcome email to new user
    sendEmail(
      dto.email,
      `Welcome to ${orgName}`,
      emailTemplate(`Welcome to ${orgName}`, `Dear ${dto.firstName} ${dto.lastName || ''},<br><br>Your account has been created at <strong>${orgName}</strong>.<br><br><strong>Email:</strong> ${dto.email}<br><strong>Role:</strong> ${(user as any).role?.name || 'Staff'}<br><br>${!dto.password ? `<strong>Temporary Password:</strong> ${password}<br><br>Please change your password upon first login.<br>` : ''}<br>Login at: <a href="${process.env.FRONTEND_URL || 'https://care-sims.vercel.app'}/login">${process.env.FRONTEND_URL || 'https://care-sims.vercel.app'}/login</a>`, orgName),
    ).catch((err) => console.error('Failed to send welcome email:', err));

    return { ...safe, tempPassword: dto.password ? undefined : password };
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.tenantUser.findFirst({
      where: { id, tenantId },
      include: { role: { include: { permissions: true, specialFlags: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, mfaSecret, ...safe } = user as any;
    return safe;
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.tenantUser.findFirst({ where: { id, tenantId } });
      if (!user) throw new NotFoundException('User not found');
      return tx.tenantUser.update({
        where: { id },
        data: { firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone, employeeId: dto.employeeId, primaryLocationId: dto.primaryLocationId, locationScope: dto.locationScope, allowedLocations: dto.allowedLocations },
      });
    });
  }

  async patchUser(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.tenantUser.findFirst({ where: { id, tenantId } });
      if (!user) throw new NotFoundException('User not found');
      const data: any = {};
      if (dto.isActive === true) { data.isActive = true; data.deactivatedAt = null; }
      if (dto.isActive === false) { data.isActive = false; data.deactivatedAt = new Date(); }
      if (dto.firstName !== undefined) data.firstName = dto.firstName;
      if (dto.lastName !== undefined) data.lastName = dto.lastName;
      if (dto.phone !== undefined) data.phone = dto.phone;
      if (dto.email !== undefined) data.email = dto.email;
      if (dto.roleId) data.roleId = dto.roleId;
      if (dto.primaryLocationId) data.primaryLocationId = dto.primaryLocationId;
      if (dto.employeeId !== undefined) data.employeeId = dto.employeeId;
      return tx.tenantUser.update({ where: { id }, data });
    });
  }

  async changeRole(tenantId: string, id: string, roleId: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.tenantUser.findFirst({ where: { id, tenantId } });
      if (!user) throw new NotFoundException('User not found');
      const role = await tx.tenantRole.findFirst({ where: { id: roleId, tenantId } });
      if (!role) throw new NotFoundException('Role not found');
      return tx.tenantUser.update({ where: { id }, data: { roleId } });
    });
  }

  async deactivate(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.tenantUser.findFirst({ where: { id, tenantId } });
      if (!user) throw new NotFoundException('User not found');
      return tx.tenantUser.update({ where: { id }, data: { isActive: false, deactivatedAt: new Date() } });
    });
  }

  async reactivate(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.tenantUser.findFirst({ where: { id, tenantId } });
      if (!user) throw new NotFoundException('User not found');
      return tx.tenantUser.update({ where: { id }, data: { isActive: true, deactivatedAt: null } });
    });
  }

  async getPendingSelfReg(tenantId: string) {
    return this.prisma.tenantUser.findMany({
      where: { tenantId, isActive: false, registrationSource: 'SELF_REGISTER', selfRegApprovedById: null },
      include: { role: true },
    });
  }

  async approveSelfReg(tenantId: string, id: string, roleId: string, locationId: string, approvedById: string) {
    const approved = await this.prisma.$transaction(async (tx) => {
      const user = await tx.tenantUser.findFirst({ where: { id, tenantId } });
      if (!user) throw new NotFoundException('User not found');
      const role = await tx.tenantRole.findFirst({ where: { id: roleId, tenantId } });
      if (!role) throw new NotFoundException('Role not found');
      return tx.tenantUser.update({
        where: { id },
        data: { isActive: true, roleId, primaryLocationId: locationId, selfRegApprovedById: approvedById, selfRegApprovedAt: new Date() },
      });
    });

    // Resolve tenant name for branded email
    const tenantApproval = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } });
    const approvalOrgName = tenantApproval?.tradeName || tenantApproval?.legalName || 'Hospital';

    // Non-blocking approval email
    if ((approved as any).email) {
      sendEmail(
        (approved as any).email,
        `Account Approved - ${approvalOrgName}`,
        emailTemplate('Account Approved', `Dear ${(approved as any).firstName} ${(approved as any).lastName || ''},<br><br>Great news! Your registration request at <strong>${approvalOrgName}</strong> has been approved. Your account is now active.<br><br>You can now log in at: <a href="${process.env.FRONTEND_URL || 'https://care-sims.vercel.app'}/login">${process.env.FRONTEND_URL || 'https://care-sims.vercel.app'}/login</a><br><br>Welcome aboard!`, approvalOrgName),
      ).catch((err) => console.error('Failed to send approval email:', err));
    }

    return approved;
  }

  async rejectSelfReg(tenantId: string, id: string) {
    const rejected = await this.prisma.$transaction(async (tx) => {
      const user = await tx.tenantUser.findFirst({ where: { id, tenantId } });
      if (!user) throw new NotFoundException('User not found');
      await tx.tenantUser.delete({ where: { id } });
      return user;
    });

    // Resolve tenant name for branded email
    const tenantReject = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { tradeName: true, legalName: true } });
    const rejectOrgName = tenantReject?.tradeName || tenantReject?.legalName || 'Hospital';

    // Non-blocking rejection email
    if ((rejected as any).email) {
      sendEmail(
        (rejected as any).email,
        `Registration Update - ${rejectOrgName}`,
        emailTemplate('Registration Update', `Dear ${(rejected as any).firstName} ${(rejected as any).lastName || ''},<br><br>We regret to inform you that your registration request at <strong>${rejectOrgName}</strong> has not been approved at this time.<br><br>If you believe this was in error or would like more information, please contact the organization administrator directly.<br><br>Thank you for your interest.`, rejectOrgName),
      ).catch((err) => console.error('Failed to send rejection email:', err));
    }

    return { message: 'Self-registration request rejected' };
  }

  async selfRegister(dto: any) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: dto.organizationId, isActive: true },
    });
    if (!tenant) throw new BadRequestException('Organization not found or inactive');

    // Check for duplicate pending request via audit log lookup or email check
    const existingUser = await this.prisma.tenantUser.findFirst({
      where: { tenantId: dto.organizationId, email: dto.email },
    });
    if (existingUser) throw new ConflictException('Email already registered or a request already pending at this organization');

    // Find the default/lowest-privilege system role for this tenant to use as placeholder
    const defaultRole = await this.prisma.tenantRole.findFirst({
      where: { tenantId: dto.organizationId },
      orderBy: { createdAt: 'asc' },
    });
    if (!defaultRole) throw new BadRequestException('Organization setup is incomplete. Contact the administrator directly.');

    // Find primary location for this tenant
    const defaultLocation = await this.prisma.tenantLocation.findFirst({
      where: { tenantId: dto.organizationId },
      orderBy: { createdAt: 'asc' },
    });
    if (!defaultLocation) throw new BadRequestException('Organization has no locations configured. Contact the administrator directly.');

    // Create inactive user pending admin approval
    const tempHash = await bcrypt.hash('Pending@SelfReg' + Math.random().toString(36).slice(2), 10);
    const user = await this.prisma.tenantUser.create({
      data: {
        tenantId: dto.organizationId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone || null,
        passwordHash: tempHash,
        roleId: defaultRole.id,
        primaryLocationId: defaultLocation.id,
        isActive: false,
        forcePasswordChange: true,
        registrationSource: 'SELF_REGISTER',
        locationScope: 'SINGLE',
        allowedLocations: [],
      },
    });

    // Log the self-registration request in platform audit (non-critical)
    await this.prisma.platformAuditLog.create({
      data: {
        eventType: 'SELF_REGISTER_REQUEST',
        actorType: 'SELF',
        actorEmail: dto.email,
        targetType: 'TenantUser',
        targetId: user.id,
        targetName: `${dto.firstName} ${dto.lastName}`,
        description: `Self-registration request from ${dto.email} for org ${dto.organizationId}`,
        metadata: { jobTitle: dto.jobTitle, coverNote: dto.coverNote, experienceYears: dto.experienceYears },
        hash: require('crypto').createHash('sha256').update(user.id + Date.now()).digest('hex'),
      },
    }).catch(() => { /* non-critical */ });

    const { passwordHash, mfaSecret, ...safe } = user as any;
    return {
      id: safe.id,
      email: safe.email,
      message: `Your registration request has been sent to ${tenant.tradeName || tenant.legalName}. You will be notified once the administrator approves your request.`,
    };
  }
}
