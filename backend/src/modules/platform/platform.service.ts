import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { sendEmail } from '../../common/utils/mailer';

function emailTemplate(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:20px;border-radius:12px 12px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Ayphen HMS</h1>
  </div>
  <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#1f2937;margin:0 0 16px;">${title}</h2>
    <p style="color:#4b5563;line-height:1.6;">${body}</p>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">
    This is an automated message from Ayphen HMS. Do not reply.
  </p>
</div>`;
}

const DEFAULT_FEATURES: Record<string, string[]> = {
  CLINIC: ['MOD_PAT_REG','MOD_PAT_SELF_BOOK','MOD_PAT_RECORDS','MOD_QUEUE','MOD_APPT','MOD_WALKIN','MOD_CONSULT','MOD_RX','MOD_LAB_ORD','MOD_VITALS','MOD_LAB_BASIC','MOD_BILL_OPD','MOD_GST','MOD_REPORTS','MOD_AUDIT'],
  HOSPITAL: ['MOD_PAT_REG','MOD_PAT_SELF_BOOK','MOD_PAT_RECORDS','MOD_QUEUE','MOD_APPT','MOD_WALKIN','MOD_TOKEN','MOD_TRIAGE','MOD_CONSULT','MOD_RX','MOD_LAB_ORD','MOD_REFERRAL','MOD_ICD','MOD_VITALS','MOD_WARD','MOD_ADMISSION','MOD_MED_ADMIN','MOD_DISCHARGE','MOD_DISPENSARY','MOD_PHARMA_FULL','MOD_PHARMA_PO','MOD_PHARMA_RETURNS','MOD_PHARMA_REPORTS','MOD_LAB_BASIC','MOD_LAB_FULL','MOD_LAB_QC','MOD_LAB_REPORTS','MOD_BILL_OPD','MOD_BILL_IPD','MOD_BILL_INS','MOD_GST','MOD_OT_BASIC','MOD_OT_SCHEDULE','MOD_OT_LIVE','MOD_OT_EQUIPMENT','MOD_MULTI_LOC','MOD_REPORTS','MOD_AUDIT','MOD_COMPLIANCE'],
  MULTISPECIALTY: ['MOD_PAT_REG','MOD_PAT_SELF_BOOK','MOD_PAT_RECORDS','MOD_PAT_CROSS_LOC','MOD_PAT_PORTAL','MOD_QUEUE','MOD_APPT','MOD_WALKIN','MOD_TOKEN','MOD_TRIAGE','MOD_CONSULT','MOD_RX','MOD_LAB_ORD','MOD_REFERRAL','MOD_ICD','MOD_TELEMEDICINE','MOD_VITALS','MOD_WARD','MOD_ADMISSION','MOD_MED_ADMIN','MOD_ICU','MOD_DISCHARGE','MOD_DISPENSARY','MOD_PHARMA_FULL','MOD_PHARMA_PO','MOD_PHARMA_RETURNS','MOD_PHARMA_CENTRAL','MOD_PHARMA_REPORTS','MOD_LAB_BASIC','MOD_LAB_FULL','MOD_LAB_QC','MOD_LAB_REPORTS','MOD_RADIOLOGY','MOD_BILL_OPD','MOD_BILL_IPD','MOD_BILL_INS','MOD_BILL_CGHS','MOD_BILL_CREDIT','MOD_GST','MOD_OT_BASIC','MOD_OT_SCHEDULE','MOD_OT_LIVE','MOD_OT_EQUIPMENT','MOD_MULTI_LOC','MOD_CENTRAL_RPT','MOD_REPORTS','MOD_AUDIT','MOD_COMPLIANCE'],
};

@Injectable()
export class PlatformService {
  constructor(private prisma: PrismaService) {}

  async listOrganizations(query: any) {
    const { type, status, page = 1, limit = 20, q } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (type) where.orgType = type;
    if (status === 'active') where.isActive = true;
    if (status === 'suspended') where.isActive = false;
    if (q) where.OR = [{ legalName: { contains: q, mode: 'insensitive' } }, { tradeName: { contains: q, mode: 'insensitive' } }];

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' }, include: { _count: { select: { locations: true } } } }),
      this.prisma.tenant.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
  }

  async createOrganization(dto: any, adminId: string) {
    // Auto-generate slug from legalName if not provided
    const slug = dto.slug || dto.legalName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException(`Slug '${slug}' is already taken`);

    // Use trialDays from frontend or default to 30
    const trialDays = dto.trialDays ?? 30;

    const tenant = await this.prisma.tenant.create({
      data: {
        slug,
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        orgType: dto.orgType,
        regNumber: dto.regNumber,
        gstNumber: dto.gstNumber,
        panNumber: dto.panNumber,
        primaryEmail: dto.primaryEmail,
        primaryPhone: dto.primaryPhone,
        subscriptionPlan: dto.subscriptionPlan || 'STANDARD',
        subscriptionStatus: trialDays > 0 ? 'TRIAL' : 'ACTIVE',
        trialEndsAt: trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null,
        timezone: dto.timezone || 'Asia/Kolkata',
        currency: dto.currency || 'INR',
        maxLocations: dto.maxLocations || 3,
        maxUsers: dto.maxUsers || 50,
        createdById: adminId,
      },
    });

    // Create primary location from frontend data
    const loc = dto.location || {};
    const locationCode = loc.code || slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'MAIN';
    const location = await this.prisma.tenantLocation.create({
      data: {
        tenantId: tenant.id,
        locationCode,
        name: loc.name || dto.legalName,
        type: loc.type || 'MAIN',
        addressLine1: loc.address?.line1 || '',
        city: loc.address?.city || '',
        state: loc.address?.state || '',
        pinCode: loc.address?.pin || '',
        country: loc.address?.country || 'IN',
        phone: loc.phone || dto.primaryPhone || '',
        email: loc.email || dto.primaryEmail || '',
        isActive: true,
      },
    });

    // Provision features — use frontend enabledModules if provided, else defaults
    const features = (dto.enabledModules && dto.enabledModules.length > 0)
      ? dto.enabledModules
      : (DEFAULT_FEATURES[dto.orgType] || DEFAULT_FEATURES['CLINIC']);
    for (const moduleId of features) {
      const mod = await this.prisma.featureModule.findUnique({ where: { moduleId } });
      if (mod) {
        await this.prisma.organizationFeature.create({
          data: { tenantId: tenant.id, moduleId, isEnabled: true, enabledAt: new Date(), enabledById: adminId },
        });
      }
    }

    // Provision system roles
    await this.provisionSystemRoles(tenant.id, dto.orgType);

    // Create primary admin user — support both flat and nested field formats
    const adminEmail = dto.adminUser?.email || dto.primaryAdminEmail;
    let adminTempPassword: string | null = null;
    if (adminEmail) {
      const tempPassword = 'Ayphen@' + Math.random().toString(36).slice(2, 10).toUpperCase();
      adminTempPassword = tempPassword;
      const hash = await bcrypt.hash(tempPassword, 12);
      const adminRole = await this.prisma.tenantRole.findFirst({ where: { tenantId: tenant.id, systemRoleId: 'SYS_ORG_ADMIN' } });
      if (adminRole) {
        const adminFirstName = dto.adminUser?.firstName || dto.primaryAdminName?.split(' ')[0] || 'Admin';
        await this.prisma.tenantUser.create({
          data: {
            tenantId: tenant.id,
            email: adminEmail,
            passwordHash: hash,
            firstName: adminFirstName,
            lastName: dto.adminUser?.lastName || dto.primaryAdminName?.split(' ').slice(1).join(' ') || '',
            phone: dto.adminUser?.phone || '',
            roleId: adminRole.id,
            primaryLocationId: location.id,
            locationScope: 'ALL',
            forcePasswordChange: true,
            isActive: true,
          },
        });

        // Send welcome email with credentials (non-blocking)
        sendEmail(
          adminEmail,
          `Welcome to ${tenant.tradeName || tenant.legalName} on Ayphen HMS`,
          emailTemplate(
            'Your Organization is Ready!',
            `Dear ${adminFirstName},<br><br>` +
            `Your organization <strong>${tenant.tradeName || tenant.legalName}</strong> has been created on Ayphen HMS.<br><br>` +
            `<div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:16px;margin:16px 0;">` +
            `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Login Credentials</p>` +
            `<p style="margin:0 0 4px;"><strong>Email:</strong> ${adminEmail}</p>` +
            `<p style="margin:0 0 4px;"><strong>Password:</strong> ${tempPassword}</p>` +
            `<p style="margin:8px 0 0;font-size:12px;color:#6b7280;">You will be asked to change your password on first login.</p>` +
            `</div>` +
            `<p>You can log in at: <a href="${process.env.FRONTEND_URL || 'https://care-sims.vercel.app'}/login" style="color:#0F766E;">Login to Ayphen HMS</a></p>` +
            `<br>Thank you for choosing Ayphen HMS.`,
          ),
        ).catch((err) => console.error('Failed to send org welcome email:', err));
      }
    }

    await this.logPlatformEvent('TENANT_CREATED', adminId, 'TENANT', tenant.id, tenant.legalName, `Organization ${tenant.legalName} created`);
    return { ...tenant, adminEmail: adminEmail || null, adminTempPassword };
  }

  async getOrganization(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { locations: true, features: { include: { module: true } } },
    });
    if (!tenant) throw new NotFoundException('Organization not found');
    return tenant;
  }

  async updateOrganization(id: string, dto: any, adminId: string) {
    const data: any = {};
    if (dto.legalName !== undefined) data.legalName = dto.legalName;
    if (dto.tradeName !== undefined) data.tradeName = dto.tradeName;
    if (dto.orgType !== undefined) data.orgType = dto.orgType;
    if (dto.primaryEmail !== undefined) data.primaryEmail = dto.primaryEmail;
    if (dto.primaryPhone !== undefined) data.primaryPhone = dto.primaryPhone;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.maxLocations !== undefined) data.maxLocations = dto.maxLocations;
    if (dto.subscriptionPlan !== undefined) data.subscriptionPlan = dto.subscriptionPlan;
    if (dto.subscriptionStatus !== undefined) data.subscriptionStatus = dto.subscriptionStatus;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.currency !== undefined) data.currency = dto.currency;
    const tenant = await this.prisma.tenant.update({ where: { id }, data });
    await this.logPlatformEvent('TENANT_UPDATED', adminId, 'TENANT', id, tenant.legalName, 'Organization updated');
    return tenant;
  }

  async suspendOrganization(id: string, reason: string, adminId: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: false, subscriptionStatus: 'SUSPENDED', suspendedReason: reason, suspendedAt: new Date() },
    });
    await this.logPlatformEvent('TENANT_SUSPENDED', adminId, 'TENANT', id, tenant.legalName, `Suspended: ${reason}`);
    return { message: 'Organization suspended' };
  }

  async activateOrganization(id: string, adminId: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: true, subscriptionStatus: 'ACTIVE', suspendedReason: null, suspendedAt: null },
    });
    await this.logPlatformEvent('TENANT_ACTIVATED', adminId, 'TENANT', id, tenant.legalName, 'Organization reactivated');
    return { message: 'Organization activated' };
  }

  async getOrgFeatures(tenantId: string) {
    return this.prisma.organizationFeature.findMany({
      where: { tenantId },
      include: { module: true },
      orderBy: [{ module: { category: 'asc' } }, { module: { sortOrder: 'asc' } }],
    });
  }

  async updateOrgFeature(tenantId: string, moduleId: string, isEnabled: boolean, adminId: string) {
    const feature = await this.prisma.organizationFeature.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId } },
      update: { isEnabled, enabledById: adminId, enabledAt: new Date() },
      create: { tenantId, moduleId, isEnabled, enabledById: adminId, enabledAt: new Date() },
    });
    await this.logPlatformEvent(isEnabled ? 'FEATURE_ENABLED' : 'FEATURE_DISABLED', adminId, 'FEATURE', moduleId, moduleId, `${moduleId} ${isEnabled ? 'enabled' : 'disabled'} for ${tenantId}`);
    return feature;
  }

  async listFeatureModules() {
    return this.prisma.featureModule.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
  }

  async getPlatformAuditLogs(query: any) {
    const { event, from, to, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (event) where.eventType = event;
    if (from || to) where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);

    const [data, total] = await Promise.all([
      this.prisma.platformAuditLog.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      this.prisma.platformAuditLog.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async listDoctors(query: any) {
    const { status, specialty, q, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.ayphenStatus = status;
    if (specialty) where.specialties = { has: specialty };
    if (q) where.OR = [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { registrationNo: { contains: q, mode: 'insensitive' } }];

    const [data, total, verified, pending, suspended] = await Promise.all([
      this.prisma.doctorRegistry.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      this.prisma.doctorRegistry.count({ where }),
      this.prisma.doctorRegistry.count({ where: { ayphenStatus: 'VERIFIED' } }),
      this.prisma.doctorRegistry.count({ where: { ayphenStatus: 'PENDING' } }),
      this.prisma.doctorRegistry.count({ where: { ayphenStatus: 'SUSPENDED' } }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), verified, pending, suspended } };
  }

  async verifyDoctor(id: string, adminId: string) {
    const doctor = await this.prisma.doctorRegistry.update({
      where: { id },
      data: { ayphenStatus: 'VERIFIED', verifiedById: adminId, verifiedAt: new Date() },
    });
    await this.logPlatformEvent('DOCTOR_VERIFIED', adminId, 'DOCTOR', id, `${doctor.firstName} ${doctor.lastName}`, 'Doctor verified');

    // Non-blocking verification approval email
    if (doctor.email) {
      sendEmail(
        doctor.email,
        'Doctor Verification Approved - Ayphen HMS',
        emailTemplate('Verification Approved', `Dear Dr. ${doctor.firstName} ${doctor.lastName},<br><br>Congratulations! Your doctor profile has been verified on Ayphen HMS.<br><br>You can now be affiliated with organizations on the platform. Your verified status grants you full access to clinical features.<br><br>Thank you for being part of Ayphen HMS.`),
      ).catch((err) => console.error('Failed to send doctor verification email:', err));
    }

    return doctor;
  }

  async rejectDoctor(id: string, reason: string, adminId: string) {
    const doctor = await this.prisma.doctorRegistry.update({
      where: { id },
      data: { ayphenStatus: 'REJECTED', rejectionReason: reason },
    });
    await this.logPlatformEvent('DOCTOR_REJECTED', adminId, 'DOCTOR', id, `${doctor.firstName} ${doctor.lastName}`, `Rejected: ${reason}`);

    // Non-blocking rejection email
    if (doctor.email) {
      sendEmail(
        doctor.email,
        'Doctor Verification Update - Ayphen HMS',
        emailTemplate('Verification Update', `Dear Dr. ${doctor.firstName} ${doctor.lastName},<br><br>We regret to inform you that your doctor verification request has not been approved.<br><br><strong>Reason:</strong> ${reason}<br><br>If you believe this was in error or have additional documentation, please contact the platform administrator for further assistance.`),
      ).catch((err) => console.error('Failed to send doctor rejection email:', err));
    }

    return doctor;
  }

  async updateSubscription(id: string, dto: any, adminId: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { subscriptionPlan: dto.subscriptionPlan, subscriptionStatus: dto.subscriptionStatus },
    });
    await this.logPlatformEvent('SUBSCRIPTION_CHANGED', adminId, 'TENANT', id, tenant.legalName, `Plan changed to ${dto.subscriptionPlan}`);
    return tenant;
  }

  async getOrgLocations(tenantId: string) {
    return this.prisma.tenantLocation.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async addOrgLocation(tenantId: string, dto: any, adminId: string) {
    const location = await this.prisma.tenantLocation.create({
      data: {
        tenantId,
        locationCode: dto.locationCode || dto.code,
        name: dto.name,
        type: dto.type || 'BRANCH',
        addressLine1: dto.addressLine1 || dto.address?.line1 || '',
        city: dto.city || dto.address?.city || '',
        state: dto.state || dto.address?.state || '',
        pinCode: dto.pinCode || dto.address?.pin || '',
        country: dto.country || 'IN',
        phone: dto.phone || '',
        email: dto.email || '',
        isActive: true,
      },
    });
    await this.logPlatformEvent('LOCATION_ADDED', adminId, 'LOCATION', location.id, location.name, `Location ${location.name} added to tenant ${tenantId}`);
    return location;
  }

  async updateOrgLocation(tenantId: string, locationId: string, dto: any) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.locationCode !== undefined) data.locationCode = dto.locationCode;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.addressLine1 !== undefined) data.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) data.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.pinCode !== undefined) data.pinCode = dto.pinCode;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.tenantLocation.update({ where: { id: locationId }, data });
  }

  async getOrgUsers(tenantId: string) {
    return this.prisma.tenantUser.findMany({
      where: { tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true, roleId: true, primaryLocationId: true, lastLogin: true, createdAt: true, role: { select: { name: true, systemRoleId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async exportOrganization(tenantId: string) {
    const [tenant, locations, users, features] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.tenantLocation.findMany({ where: { tenantId } }),
      this.prisma.tenantUser.count({ where: { tenantId } }),
      this.prisma.organizationFeature.findMany({ where: { tenantId, isEnabled: true } }),
    ]);
    return { tenant, locations, userCount: users, enabledFeatures: features.length, exportedAt: new Date() };
  }

  private async provisionSystemRoles(tenantId: string, orgType: string) {
    const rolesByType: Record<string, Array<{ systemRoleId: string; name: string; description: string }>> = {
      CLINIC: [
        { systemRoleId: 'SYS_ORG_ADMIN', name: 'Organization Admin', description: 'Full access to all enabled modules' },
        { systemRoleId: 'SYS_DOCTOR', name: 'Doctor', description: 'Consultation, Rx, Lab Orders' },
        { systemRoleId: 'SYS_RECEPTIONIST', name: 'Receptionist', description: 'Queue, registration, appointments' },
        { systemRoleId: 'SYS_BILLING', name: 'Billing Staff', description: 'Invoicing and payments' },
        { systemRoleId: 'SYS_NURSE', name: 'Nurse', description: 'Vitals and triage' },
      ],
      HOSPITAL: [
        { systemRoleId: 'SYS_ORG_ADMIN', name: 'Organization Admin', description: 'Full access to all enabled modules' },
        { systemRoleId: 'SYS_DOCTOR', name: 'Doctor', description: 'Consultation, Rx, Lab Orders' },
        { systemRoleId: 'SYS_SENIOR_DOCTOR', name: 'Senior Consultant', description: 'Doctor + approve referrals' },
        { systemRoleId: 'SYS_HOD', name: 'Head of Department', description: 'Senior Doctor + dept reports' },
        { systemRoleId: 'SYS_RECEPTIONIST', name: 'Receptionist', description: 'Queue, registration, appointments' },
        { systemRoleId: 'SYS_FRONT_OFFICE', name: 'Front Office Manager', description: 'Receptionist + management' },
        { systemRoleId: 'SYS_BILLING', name: 'Billing Staff', description: 'Invoicing and payments' },
        { systemRoleId: 'SYS_BILLING_MANAGER', name: 'Billing Manager', description: 'Billing + discount approval' },
        { systemRoleId: 'SYS_NURSE', name: 'Nurse', description: 'Vitals and triage' },
        { systemRoleId: 'SYS_WARD_NURSE', name: 'Ward Nurse', description: 'Vitals, medication admin, ward tasks' },
        { systemRoleId: 'SYS_CHARGE_NURSE', name: 'Charge Nurse', description: 'All Nurse + ward management' },
        { systemRoleId: 'SYS_PHARMACIST', name: 'Pharmacist', description: 'Full pharmacy module' },
        { systemRoleId: 'SYS_PHARMACY_INCHARGE', name: 'Pharmacist In-Charge', description: 'Pharmacist + PO + returns' },
        { systemRoleId: 'SYS_LAB_TECH', name: 'Lab Technician', description: 'Sample processing, result entry' },
        { systemRoleId: 'SYS_LAB_SUPERVISOR', name: 'Lab Supervisor', description: 'Lab Tech + validation + QC' },
        { systemRoleId: 'SYS_OT_NURSE', name: 'OT Nurse', description: 'OT schedule + equipment' },
        { systemRoleId: 'SYS_OT_COORDINATOR', name: 'OT Coordinator', description: 'Full OT module management' },
        { systemRoleId: 'SYS_COMPLIANCE_OFFICER', name: 'Compliance Officer', description: 'Audit logs + compliance' },
      ],
      MULTISPECIALTY: [
        { systemRoleId: 'SYS_ORG_ADMIN', name: 'Organization Admin', description: 'Full access to all enabled modules' },
        { systemRoleId: 'SYS_NETWORK_ADMIN', name: 'Network Administrator', description: 'All locations admin access' },
        { systemRoleId: 'SYS_MEDICAL_DIRECTOR', name: 'Medical Director', description: 'Read all clinical across locations' },
        { systemRoleId: 'SYS_COO', name: 'COO / Operations Head', description: 'All operational + financial reports' },
        { systemRoleId: 'SYS_REGIONAL_MANAGER', name: 'Regional Manager', description: 'Admin for subset of locations' },
        { systemRoleId: 'SYS_DOCTOR', name: 'Doctor', description: 'Consultation, Rx, Lab Orders' },
        { systemRoleId: 'SYS_SENIOR_DOCTOR', name: 'Senior Consultant', description: 'Doctor + approve referrals' },
        { systemRoleId: 'SYS_HOD', name: 'Head of Department', description: 'Senior Doctor + dept reports' },
        { systemRoleId: 'SYS_VISITING_DOCTOR', name: 'Visiting Doctor', description: 'Own consultation + Rx only' },
        { systemRoleId: 'SYS_LOCUM_DOCTOR', name: 'Locum Doctor', description: 'Temporary: own consultation only' },
        { systemRoleId: 'SYS_RECEPTIONIST', name: 'Receptionist', description: 'Queue, registration, appointments' },
        { systemRoleId: 'SYS_BILLING', name: 'Billing Staff', description: 'Invoicing and payments' },
        { systemRoleId: 'SYS_BILLING_MANAGER', name: 'Billing Manager', description: 'Billing + discount approval' },
        { systemRoleId: 'SYS_INSURANCE_EXEC', name: 'Insurance Executive', description: 'Insurance billing only' },
        { systemRoleId: 'SYS_NURSE', name: 'Nurse', description: 'Vitals and triage' },
        { systemRoleId: 'SYS_WARD_NURSE', name: 'Ward Nurse', description: 'Vitals, medication admin' },
        { systemRoleId: 'SYS_CHARGE_NURSE', name: 'Charge Nurse', description: 'All Nurse + ward management' },
        { systemRoleId: 'SYS_PHARMACIST', name: 'Pharmacist', description: 'Full pharmacy module' },
        { systemRoleId: 'SYS_PHARMACY_INCHARGE', name: 'Pharmacist In-Charge', description: 'Pharmacist + PO + returns' },
        { systemRoleId: 'SYS_LAB_TECH', name: 'Lab Technician', description: 'Sample processing, result entry' },
        { systemRoleId: 'SYS_LAB_SUPERVISOR', name: 'Lab Supervisor', description: 'Lab Tech + validation + QC' },
        { systemRoleId: 'SYS_OT_COORDINATOR', name: 'OT Coordinator', description: 'Full OT module management' },
        { systemRoleId: 'SYS_COMPLIANCE_OFFICER', name: 'Compliance Officer', description: 'Audit logs + compliance' },
      ],
      PHARMACY_STANDALONE: [
        { systemRoleId: 'SYS_ORG_ADMIN', name: 'Organization Admin', description: 'Full access to all enabled modules' },
        { systemRoleId: 'SYS_PHARMACIST', name: 'Pharmacist', description: 'Full pharmacy module' },
        { systemRoleId: 'SYS_PHARMACY_INCHARGE', name: 'Pharmacist In-Charge', description: 'Pharmacist + PO + returns + reports' },
        { systemRoleId: 'SYS_BILLING', name: 'Billing Staff', description: 'Invoicing and payments' },
        { systemRoleId: 'SYS_RECEPTIONIST', name: 'Receptionist', description: 'Counter and customer intake' },
      ],
      LAB_STANDALONE: [
        { systemRoleId: 'SYS_ORG_ADMIN', name: 'Organization Admin', description: 'Full access to all enabled modules' },
        { systemRoleId: 'SYS_LAB_TECH', name: 'Lab Technician', description: 'Sample processing, result entry' },
        { systemRoleId: 'SYS_LAB_SUPERVISOR', name: 'Lab Supervisor', description: 'Lab Tech + validation + QC' },
        { systemRoleId: 'SYS_RECEPTIONIST', name: 'Receptionist', description: 'Sample collection, patient intake' },
        { systemRoleId: 'SYS_BILLING', name: 'Billing Staff', description: 'Invoicing and payments' },
      ],
      DENTAL_CLINIC: [
        { systemRoleId: 'SYS_ORG_ADMIN', name: 'Organization Admin', description: 'Full access to all enabled modules' },
        { systemRoleId: 'SYS_DOCTOR', name: 'Dentist', description: 'Consultation, treatment plans, prescriptions' },
        { systemRoleId: 'SYS_NURSE', name: 'Dental Assistant', description: 'Vitals, chair-side assistance' },
        { systemRoleId: 'SYS_RECEPTIONIST', name: 'Receptionist', description: 'Queue, registration, appointments' },
        { systemRoleId: 'SYS_BILLING', name: 'Billing Staff', description: 'Invoicing and payments' },
      ],
      OPTICAL_CENTRE: [
        { systemRoleId: 'SYS_ORG_ADMIN', name: 'Organization Admin', description: 'Full access to all enabled modules' },
        { systemRoleId: 'SYS_DOCTOR', name: 'Optometrist', description: 'Eye examination, prescriptions' },
        { systemRoleId: 'SYS_PHARMACIST', name: 'Dispensing Optician', description: 'Lens dispensing and inventory' },
        { systemRoleId: 'SYS_RECEPTIONIST', name: 'Receptionist', description: 'Appointments and registration' },
        { systemRoleId: 'SYS_BILLING', name: 'Billing Staff', description: 'Invoicing and payments' },
      ],
      IMAGING_CENTRE: [
        { systemRoleId: 'SYS_ORG_ADMIN', name: 'Organization Admin', description: 'Full access to all enabled modules' },
        { systemRoleId: 'SYS_DOCTOR', name: 'Radiologist', description: 'Image interpretation, reports' },
        { systemRoleId: 'SYS_LAB_TECH', name: 'Radiographer', description: 'Image acquisition, patient positioning' },
        { systemRoleId: 'SYS_RECEPTIONIST', name: 'Receptionist', description: 'Scheduling and patient intake' },
        { systemRoleId: 'SYS_BILLING', name: 'Billing Staff', description: 'Invoicing and payments' },
      ],
      BLOOD_BANK: [
        { systemRoleId: 'SYS_ORG_ADMIN', name: 'Organization Admin', description: 'Full access to all enabled modules' },
        { systemRoleId: 'SYS_LAB_TECH', name: 'Blood Bank Technician', description: 'Donor processing, crossmatch, inventory' },
        { systemRoleId: 'SYS_LAB_SUPERVISOR', name: 'Blood Bank Medical Officer', description: 'Supervision, quality control' },
        { systemRoleId: 'SYS_RECEPTIONIST', name: 'Donor Coordinator', description: 'Donor registration and scheduling' },
        { systemRoleId: 'SYS_BILLING', name: 'Billing Staff', description: 'Component pricing and invoicing' },
      ],
      PHYSIOTHERAPY: [
        { systemRoleId: 'SYS_ORG_ADMIN', name: 'Organization Admin', description: 'Full access to all enabled modules' },
        { systemRoleId: 'SYS_DOCTOR', name: 'Physiotherapist', description: 'Assessment, treatment plans, sessions' },
        { systemRoleId: 'SYS_NURSE', name: 'PT Assistant', description: 'Exercise supervision, vitals' },
        { systemRoleId: 'SYS_RECEPTIONIST', name: 'Receptionist', description: 'Appointments and registration' },
        { systemRoleId: 'SYS_BILLING', name: 'Billing Staff', description: 'Invoicing and payments' },
      ],
    };

    const roles = rolesByType[orgType] || rolesByType['CLINIC'];
    for (const r of roles) {
      await this.prisma.tenantRole.upsert({
        where: { tenantId_name: { tenantId, name: r.name } },
        update: {},
        create: { tenantId, name: r.name, description: r.description, systemRoleId: r.systemRoleId, isSystemRole: true, isActive: true },
      });
    }
  }

  async logPlatformEvent(eventType: string, actorId: string, targetType: string, targetId: string, targetName: string, description: string) {
    const prev = await this.prisma.platformAuditLog.findFirst({ orderBy: { createdAt: 'desc' } });
    const prevHash = prev?.hash || '0';
    const payload = `${eventType}|${actorId}|${targetId}|${new Date().toISOString()}|${prevHash}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    await this.prisma.platformAuditLog.create({
      data: { eventType, actorType: 'PLATFORM_USER', actorId, targetType, targetId, targetName, description, hash },
    });
  }
}
