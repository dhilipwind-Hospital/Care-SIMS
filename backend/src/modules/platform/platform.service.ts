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

// Module → resource string used in TenantRolePermission.resource. Kept in sync with
// frontend/src/pages/admin/RolesPage.tsx MODULES so the role-edit UI lights up.
const MODULE_RESOURCE: Record<string, string> = {
  MOD_QUEUE: 'queue',
  MOD_PATIENTS: 'patients',
  MOD_APPOINTMENTS: 'appointments',
  MOD_CONSULT: 'consultations',
  MOD_RX: 'prescriptions',
  MOD_LAB_ORD: 'lab_orders',
  MOD_LAB_RES: 'lab_results',
  MOD_VITALS: 'vitals',
  MOD_TRIAGE: 'triage',
  MOD_WARD: 'wards',
  MOD_MED_ADMIN: 'medication_admin',
  MOD_BILLING: 'invoices',
  MOD_PHARMA_FULL: 'pharmacy_dispense',
  MOD_INVENTORY: 'inventory',
  MOD_PO: 'purchase_orders',
  MOD_OT: 'ot',
  MOD_REPORTS: 'reports',
  MOD_AUDIT: 'audit_logs',
  MOD_USERS: 'users',
  MOD_ROLES: 'roles',
};

const FULL = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT'];
const RW = ['VIEW', 'CREATE', 'EDIT'];
const RO = ['VIEW'];

// Default permission matrix per system role. Matches each role's description.
// Admins can edit/add/remove permissions afterwards from /admin/roles.
const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  // Admin / governance
  SYS_ORG_ADMIN: Object.fromEntries(Object.keys(MODULE_RESOURCE).map(m => [m, FULL])),
  SYS_NETWORK_ADMIN: Object.fromEntries(Object.keys(MODULE_RESOURCE).map(m => [m, FULL])),
  SYS_COO: Object.fromEntries(Object.keys(MODULE_RESOURCE).map(m => [m, ['VIEW', 'EXPORT']])),
  SYS_MEDICAL_DIRECTOR: {
    MOD_PATIENTS: RO, MOD_CONSULT: RO, MOD_RX: RO, MOD_LAB_ORD: RO, MOD_LAB_RES: RO,
    MOD_VITALS: RO, MOD_TRIAGE: RO, MOD_WARD: RO, MOD_MED_ADMIN: RO, MOD_REPORTS: ['VIEW', 'EXPORT'], MOD_AUDIT: RO,
  },
  SYS_REGIONAL_MANAGER: {
    MOD_QUEUE: RW, MOD_PATIENTS: RW, MOD_APPOINTMENTS: RW, MOD_BILLING: RW, MOD_REPORTS: ['VIEW', 'EXPORT'], MOD_USERS: RW,
  },
  SYS_COMPLIANCE_OFFICER: { MOD_AUDIT: ['VIEW', 'EXPORT'], MOD_REPORTS: ['VIEW', 'EXPORT'] },

  // Doctors
  SYS_DOCTOR: {
    MOD_QUEUE: RO, MOD_PATIENTS: RO, MOD_APPOINTMENTS: RO,
    MOD_CONSULT: RW, MOD_RX: RW, MOD_LAB_ORD: RW, MOD_LAB_RES: RO, MOD_VITALS: RO, MOD_TRIAGE: RO,
  },
  SYS_SENIOR_DOCTOR: {
    MOD_QUEUE: RO, MOD_PATIENTS: RO, MOD_APPOINTMENTS: RO,
    MOD_CONSULT: RW, MOD_RX: RW, MOD_LAB_ORD: RW, MOD_LAB_RES: RW, MOD_VITALS: RO, MOD_TRIAGE: RO,
    MOD_WARD: RO, MOD_MED_ADMIN: RO,
  },
  SYS_HOD: {
    MOD_QUEUE: RO, MOD_PATIENTS: RO, MOD_APPOINTMENTS: RO,
    MOD_CONSULT: RW, MOD_RX: RW, MOD_LAB_ORD: RW, MOD_LAB_RES: RW, MOD_VITALS: RO, MOD_TRIAGE: RO,
    MOD_WARD: RW, MOD_MED_ADMIN: RW, MOD_REPORTS: ['VIEW', 'EXPORT'],
  },
  SYS_VISITING_DOCTOR: { MOD_PATIENTS: RO, MOD_CONSULT: RW, MOD_RX: RW },
  SYS_LOCUM_DOCTOR: { MOD_PATIENTS: RO, MOD_CONSULT: RW },

  // Reception / front office
  SYS_RECEPTIONIST: {
    MOD_QUEUE: RW, MOD_PATIENTS: RW, MOD_APPOINTMENTS: RW, MOD_TRIAGE: RO,
  },
  SYS_FRONT_OFFICE: {
    MOD_QUEUE: RW, MOD_PATIENTS: RW, MOD_APPOINTMENTS: RW, MOD_TRIAGE: RO, MOD_REPORTS: RO,
  },

  // Billing
  SYS_BILLING: { MOD_BILLING: RW, MOD_PATIENTS: RO },
  SYS_BILLING_MANAGER: { MOD_BILLING: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'EXPORT'], MOD_PATIENTS: RO, MOD_REPORTS: ['VIEW', 'EXPORT'] },
  SYS_INSURANCE_EXEC: { MOD_BILLING: RW, MOD_PATIENTS: RO },

  // Nursing
  SYS_NURSE: { MOD_QUEUE: RO, MOD_PATIENTS: RO, MOD_VITALS: RW, MOD_TRIAGE: RW },
  SYS_WARD_NURSE: { MOD_QUEUE: RO, MOD_PATIENTS: RO, MOD_VITALS: RW, MOD_TRIAGE: RW, MOD_WARD: RW, MOD_MED_ADMIN: RW },
  SYS_CHARGE_NURSE: { MOD_QUEUE: RO, MOD_PATIENTS: RO, MOD_VITALS: RW, MOD_TRIAGE: RW, MOD_WARD: ['VIEW', 'CREATE', 'EDIT', 'APPROVE'], MOD_MED_ADMIN: RW },

  // Pharmacy
  SYS_PHARMACIST: { MOD_RX: RO, MOD_PHARMA_FULL: RW, MOD_INVENTORY: RO },
  SYS_PHARMACY_INCHARGE: { MOD_RX: RO, MOD_PHARMA_FULL: RW, MOD_INVENTORY: RW, MOD_PO: RW, MOD_REPORTS: ['VIEW', 'EXPORT'] },

  // Lab
  SYS_LAB_TECH: { MOD_LAB_ORD: RO, MOD_LAB_RES: RW },
  SYS_LAB_SUPERVISOR: { MOD_LAB_ORD: RO, MOD_LAB_RES: ['VIEW', 'CREATE', 'EDIT', 'APPROVE'], MOD_REPORTS: ['VIEW', 'EXPORT'] },

  // OT
  SYS_OT_NURSE: { MOD_OT: RW },
  SYS_OT_COORDINATOR: { MOD_OT: ['VIEW', 'CREATE', 'EDIT', 'APPROVE'], MOD_REPORTS: RO },
};

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

    // Provision features — use frontend enabledModules if provided, else defaults.
    // Batched: 1 findMany + 1 createMany instead of 2N sequential round-trips.
    const requestedFeatures = (dto.enabledModules && dto.enabledModules.length > 0)
      ? dto.enabledModules
      : (DEFAULT_FEATURES[dto.orgType] || DEFAULT_FEATURES['CLINIC']);
    const validModules = await this.prisma.featureModule.findMany({
      where: { moduleId: { in: requestedFeatures } },
      select: { moduleId: true },
    });
    if (validModules.length) {
      const now = new Date();
      await this.prisma.organizationFeature.createMany({
        data: validModules.map(m => ({
          tenantId: tenant.id, moduleId: m.moduleId, isEnabled: true, enabledAt: now, enabledById: adminId,
        })),
        skipDuplicates: true,
      });
    }

    // Provision system roles (batched inside)
    await this.provisionSystemRoles(tenant.id, dto.orgType);

    // Create primary admin user — support both flat and nested field formats
    const adminEmail = dto.adminUser?.email || dto.primaryAdminEmail;
    let adminTempPassword: string | null = null;
    if (adminEmail) {
      const tempPassword = 'Ayphen@' + Math.random().toString(36).slice(2, 10).toUpperCase();
      adminTempPassword = tempPassword;
      const hash = await bcrypt.hash(tempPassword, 10);
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

  // Hard-delete an organization and ALL its data. Irreversible.
  // Requires the caller to confirm by passing the tenant's slug — protects
  // against accidental clicks. Platform-admin only (PlatformGuard at the route).
  async deleteOrganization(id: string, confirmSlug: string, adminId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Organization not found');
    if (tenant.slug !== confirmSlug) {
      throw new BadRequestException(`Slug mismatch — type the org's slug "${tenant.slug}" to confirm`);
    }

    // Tenant-scoped tables grouped by deletion order. Within each group,
    // tables have no FKs to other tables in later groups. Groups before
    // [tenant_locations, tenants] handle inter-table FKs that aren't
    // covered by onDelete: Cascade.
    //
    // Note: tables wired with onDelete: Cascade (lab result items, invoice
    // line items, prescription items, role permissions, etc.) get wiped
    // automatically when their parent is deleted. We only list parents.
    await this.prisma.$transaction(async (tx) => {
      const where = { tenantId: id };

      // Group 1 — clinical workflow leaves that reference Patient/Doctor/Order/Appointment
      await tx.medicationAdministration.deleteMany({ where });
      await tx.medicationReconciliation.deleteMany({ where });
      await tx.payment.deleteMany({ where });
      await tx.insuranceClaim.deleteMany({ where });
      await tx.dietMeal.deleteMany({ where });
      await tx.physiotherapySession.deleteMany({ where });
      await tx.icuMonitoring.deleteMany({ where });
      await tx.icuRound.deleteMany({ where });
      await tx.preOpAssessment.deleteMany({ where });
      await tx.anaesthesiaRecord.deleteMany({ where });
      await tx.bloodTransfusion.deleteMany({ where });
      await tx.bloodDonation.deleteMany({ where });
      await tx.bloodInventory.deleteMany({ where });
      await tx.dialysisSession.deleteMany({ where });
      await tx.nicuDailyRecord.deleteMany({ where });
      await tx.ambulanceTrip.deleteMany({ where });
      await tx.queueToken.deleteMany({ where });
      await tx.vital.deleteMany({ where });
      await tx.triageRecord.deleteMany({ where });
      await tx.consentForm.deleteMany({ where });
      await tx.referral.deleteMany({ where });
      await tx.dischargeSummary.deleteMany({ where });
      await tx.medicalCertificate.deleteMany({ where });
      await tx.medicalRecordFile.deleteMany({ where });
      await tx.patientAccessLog.deleteMany({ where });
      await tx.patientPathway.deleteMany({ where });
      await tx.feedbackSurvey.deleteMany({ where });
      await tx.notification.deleteMany({ where });
      await tx.payroll.deleteMany({ where });
      await tx.payrollConfig.deleteMany({ where });
      await tx.staffAttendance.deleteMany({ where });
      await tx.leaveRequest.deleteMany({ where });
      await tx.dutyRoster.deleteMany({ where });
      await tx.shiftHandover.deleteMany({ where });
      await tx.qualityIncident.deleteMany({ where });
      await tx.qualityIndicator.deleteMany({ where });
      await tx.grievance.deleteMany({ where });
      await tx.infectionControlRecord.deleteMany({ where });
      await tx.antibioticUsage.deleteMany({ where });
      await tx.wasteCollection.deleteMany({ where });
      await tx.linenTransaction.deleteMany({ where });
      await tx.sterilizationItem.deleteMany({ where });
      await tx.assetMaintenance.deleteMany({ where });
      await tx.storeTransaction.deleteMany({ where });
      await tx.inventoryTransaction.deleteMany({ where });
      await tx.pharmacyReturn.deleteMany({ where });
      await tx.purchaseIndent.deleteMany({ where });
      await tx.vendorContract.deleteMany({ where });
      await tx.healthPackageBooking.deleteMany({ where });
      await tx.workOrder.deleteMany({ where });
      await tx.woundAssessment.deleteMany({ where });
      await tx.palliativeCareRecord.deleteMany({ where });
      await tx.homeVisit.deleteMany({ where });
      await tx.mortuaryRecord.deleteMany({ where });
      await tx.mlcRecord.deleteMany({ where });
      await tx.birthRecord.deleteMany({ where });
      await tx.deathRecord.deleteMany({ where });
      await tx.visitor.deleteMany({ where });
      await tx.housekeepingTask.deleteMany({ where });
      await tx.emergencyVisit.deleteMany({ where });
      await tx.teleconsultSession.deleteMany({ where });
      await tx.labCalibration.deleteMany({ where });
      await tx.labQCRun.deleteMany({ where });
      await tx.orgAuditLog.deleteMany({ where });

      // Group 2 — order-level records (children of Patient/Doctor)
      await tx.labResult.deleteMany({ where });
      await tx.labOrder.deleteMany({ where });
      await tx.radiologyResult.deleteMany({ where });
      await tx.radiologyOrder.deleteMany({ where });
      await tx.prescription.deleteMany({ where });
      await tx.consultation.deleteMany({ where });
      await tx.dietOrder.deleteMany({ where });
      await tx.physiotherapyOrder.deleteMany({ where });
      await tx.oTBooking.deleteMany({ where });
      await tx.appointment.deleteMany({ where });
      await tx.invoice.deleteMany({ where });
      await tx.insurancePolicy.deleteMany({ where });
      await tx.nicuAdmission.deleteMany({ where });
      await tx.admission.deleteMany({ where });
      await tx.bed.deleteMany({ where });
      await tx.icuBed.deleteMany({ where });

      // Group 3 — top-level domain entities
      await tx.patient.deleteMany({ where });
      await tx.ward.deleteMany({ where });
      await tx.dialysisMachine.deleteMany({ where });
      await tx.ambulance.deleteMany({ where });
      await tx.drugBatch.deleteMany({ where });
      await tx.inventoryBatch.deleteMany({ where });
      await tx.drug.deleteMany({ where });
      await tx.inventoryItem.deleteMany({ where });
      await tx.storeItem.deleteMany({ where });
      await tx.vendor.deleteMany({ where });
      await tx.healthPackage.deleteMany({ where });
      await tx.careProtocol.deleteMany({ where });
      await tx.oTEquipment.deleteMany({ where });
      await tx.oTRoom.deleteMany({ where });
      await tx.instrumentSet.deleteMany({ where });
      await tx.sterilizationBatch.deleteMany({ where });
      await tx.linenItem.deleteMany({ where });
      await tx.bloodDonor.deleteMany({ where });
      await tx.asset.deleteMany({ where });

      // Group 4 — directory / access
      await tx.doctorOrgAffiliation.deleteMany({ where });
      await tx.tenantUser.deleteMany({ where });
      await tx.tenantRole.deleteMany({ where });
      await tx.department.deleteMany({ where });

      // Group 5 — tenant scaffolding
      await tx.organizationFeature.deleteMany({ where });
      await tx.tenantLocation.deleteMany({ where });

      await tx.tenant.delete({ where: { id } });
    }, { timeout: 60000 });

    await this.logPlatformEvent('TENANT_DELETED', adminId, 'TENANT', id, tenant.legalName,
      `Organization "${tenant.legalName}" (${tenant.slug}) and all its data permanently deleted`);
    return { message: 'Organization permanently deleted', slug: tenant.slug };
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
    // Batched insert; skipDuplicates handles the unique (tenantId, name) constraint
    // that the previous per-row upsert was guarding against.
    await this.prisma.tenantRole.createMany({
      data: roles.map(r => ({
        tenantId, name: r.name, description: r.description, systemRoleId: r.systemRoleId, isSystemRole: true, isActive: true,
      })),
      skipDuplicates: true,
    });

    // Seed default permissions per system role. Without this every fresh org
    // shows "0 permissions" on every role and the admin has to click through
    // hundreds of checkboxes before staff can log in productively.
    const created = await this.prisma.tenantRole.findMany({
      where: { tenantId, systemRoleId: { in: roles.map(r => r.systemRoleId) } },
      select: { id: true, systemRoleId: true },
    });
    const permRows: { roleId: string; moduleId: string; resource: string; action: string }[] = [];
    for (const role of created) {
      const matrix = DEFAULT_ROLE_PERMISSIONS[role.systemRoleId || ''] || {};
      for (const [moduleId, actions] of Object.entries(matrix)) {
        const resource = MODULE_RESOURCE[moduleId] || moduleId.toLowerCase();
        for (const action of actions) {
          permRows.push({ roleId: role.id, moduleId, resource, action });
        }
      }
    }
    if (permRows.length) {
      await this.prisma.tenantRolePermission.createMany({ data: permRows, skipDuplicates: true });
    }
  }

  // Idempotent backfill: re-seed default permissions for an existing org's
  // system roles. Safe to run multiple times — skipDuplicates handles the
  // (roleId, moduleId, resource, action) unique constraint.
  async seedRolePermissionsForOrg(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Organization not found');
    const sysRoles = await this.prisma.tenantRole.findMany({
      where: { tenantId, isSystemRole: true, systemRoleId: { not: null } },
      select: { id: true, systemRoleId: true, name: true },
    });
    const permRows: { roleId: string; moduleId: string; resource: string; action: string }[] = [];
    for (const role of sysRoles) {
      const matrix = DEFAULT_ROLE_PERMISSIONS[role.systemRoleId || ''] || {};
      for (const [moduleId, actions] of Object.entries(matrix)) {
        const resource = MODULE_RESOURCE[moduleId] || moduleId.toLowerCase();
        for (const action of actions) {
          permRows.push({ roleId: role.id, moduleId, resource, action });
        }
      }
    }
    let inserted = 0;
    if (permRows.length) {
      const result = await this.prisma.tenantRolePermission.createMany({ data: permRows, skipDuplicates: true });
      inserted = result.count;
    }
    return { rolesUpdated: sysRoles.length, permissionsInserted: inserted };
  }

  // Reset every tenant user's password (and clear MFA) to Demo@1234. Used
  // to salvage an already-seeded demo org where the admin password got
  // baked in incorrectly. Platform-admin only.
  async resetDemoPasswords(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Organization not found');
    const password = 'Demo@1234';
    const passwordHash = await bcrypt.hash(password, 10);
    const users = await this.prisma.tenantUser.findMany({ where: { tenantId }, select: { id: true, email: true } });
    for (const u of users) {
      await this.prisma.tenantUser.update({
        where: { id: u.id },
        data: { passwordHash, forcePasswordChange: false, mfaEnabled: false, mfaSecret: null, isActive: true },
      });
    }
    // Also reset associated PatientAccounts (matched by email domain on slug).
    const patientAccounts = await this.prisma.patientAccount.findMany({
      where: { email: { endsWith: `@${tenant.slug}.demo` } },
      select: { id: true, email: true },
    });
    for (const pa of patientAccounts) {
      await this.prisma.patientAccount.update({ where: { id: pa.id }, data: { passwordHash } });
    }
    return {
      message: 'Passwords reset',
      password,
      staff: users.map(u => u.email),
      patientAccounts: patientAccounts.map(p => p.email),
    };
  }

  // Turn ON every applicable feature module for this tenant. Used when an
  // older org is missing recently-added modules (e.g. MOD_TRIAGE) and
  // FeatureFlagGuard is throwing 403s on the demo. Idempotent.
  async enableAllFeaturesForOrg(tenantId: string, adminId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Organization not found');

    // What's already on the tenant
    const existing = await this.prisma.organizationFeature.findMany({
      where: { tenantId },
      select: { moduleId: true, isEnabled: true },
    });
    const existingMap = new Map(existing.map(f => [f.moduleId, f.isEnabled]));

    // All applicable feature modules (everything for HOSPITAL+MULTISPECIALTY,
    // which covers the demo flows).
    const allModules = Array.from(new Set([
      ...(DEFAULT_FEATURES['HOSPITAL'] || []),
      ...(DEFAULT_FEATURES['MULTISPECIALTY'] || []),
    ]));
    const validModules = await this.prisma.featureModule.findMany({
      where: { moduleId: { in: allModules } },
      select: { moduleId: true },
    });

    let inserted = 0;
    let enabledNowOn = 0;
    const now = new Date();
    for (const m of validModules) {
      if (!existingMap.has(m.moduleId)) {
        await this.prisma.organizationFeature.create({
          data: { tenantId, moduleId: m.moduleId, isEnabled: true, enabledAt: now, enabledById: adminId },
        });
        inserted++;
      } else if (existingMap.get(m.moduleId) === false) {
        await this.prisma.organizationFeature.updateMany({
          where: { tenantId, moduleId: m.moduleId },
          data: { isEnabled: true, enabledAt: now, enabledById: adminId },
        });
        enabledNowOn++;
      }
    }
    return {
      message: 'All applicable features are now enabled',
      featuresInserted: inserted,
      featuresTurnedOn: enabledNowOn,
      totalApplicable: validModules.length,
    };
  }

  // Backfill an existing org with starter master data so its OPD/IPD
  // workflows have something to operate on out of the box: departments,
  // wards + beds, drug catalog + opening stock, and a sample doctor with
  // an affiliation. Idempotent — safe to click multiple times; existing
  // rows are left alone.
  async seedStarterDataForOrg(tenantId: string, adminId?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Organization not found');
    const location = await this.prisma.tenantLocation.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' } });
    if (!location) throw new BadRequestException('Organization has no active location — add one first');
    const locationId = location.id;

    // Early exit: if the org already has staff + departments + wards + drugs
    // + patients, the seed has nothing meaningful to add. Skip the full
    // pipeline so we don't hold the request open while every block does
    // findFirst → no-op for ~50 rows. Saves the 30s proxy timeout window.
    const [hasStaff, hasDept, hasWard, hasDrug, hasPat] = await Promise.all([
      this.prisma.tenantUser.count({ where: { tenantId } }),
      this.prisma.department.count({ where: { tenantId } }),
      this.prisma.ward.count({ where: { tenantId } }),
      this.prisma.drug.count({ where: { tenantId } }),
      this.prisma.patient.count({ where: { tenantId } }),
    ]);
    const alreadySeeded = hasStaff >= 5 && hasDept >= 3 && hasWard >= 2 && hasDrug >= 5 && hasPat >= 2;
    if (alreadySeeded) {
      // Even on the skip path we still want to enable all features —
      // older orgs that were seeded before recent modules existed (e.g.
      // MOD_TRIAGE) need this to dodge the 403 from FeatureFlagGuard.
      let featuresInserted = 0;
      let featuresTurnedOn = 0;
      try {
        if (adminId) {
          const r = await this.enableAllFeaturesForOrg(tenantId, adminId);
          featuresInserted = r.featuresInserted;
          featuresTurnedOn = r.featuresTurnedOn;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[seed-starter] enable-all-features failed:', err);
      }
      return {
        message: 'Starter data already present — features synced',
        tenant: { id: tenantId, slug: tenant.slug, name: tenant.legalName },
        created: { staffUsers: 0, departments: 0, drugs: 0, drugBatches: 0, wards: 0, beds: 0, doctorAffiliated: false, patients: 0, queueTokens: 0, vitals: 0, appointments: 0, errors: [] },
        sharedPassword: 'Demo@1234',
        note: featuresInserted + featuresTurnedOn > 0
          ? `Enabled ${featuresInserted + featuresTurnedOn} feature module(s) that were missing or off. Existing data was left alone.`
          : 'This org already has staff, departments, wards, drugs and patients. Click Refresh Data Counts to see totals.',
        staff: [],
        sampleDoctor: null,
        skipped: true,
        featuresEnabled: featuresInserted + featuresTurnedOn,
      };
    }

    const summary: any = { staffUsers: 0, departments: 0, drugs: 0, drugBatches: 0, wards: 0, beds: 0, doctorAffiliated: false, patients: 0, queueTokens: 0, vitals: 0, appointments: 0, errors: [] as string[] };

    // Each subsystem runs in its own try block so a partial failure doesn't
    // wipe out everything. The errors array is returned so the platform admin
    // can see which step misbehaved.
    const safe = async (label: string, fn: () => Promise<void>) => {
      try { await fn(); } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error(`[seed-starter] ${label} failed:`, err?.message || err);
        summary.errors.push(`${label}: ${err?.message || 'unknown'}`);
      }
    };

    // ── Staff users (one per role) ───────────────────────────────────────
    const host = `${tenant.slug}.local`;
    const sharedPassword = 'Demo@1234';
    const passwordHash = await bcrypt.hash(sharedPassword, 10);

    const staffDefs = [
      { firstName: 'Org',      lastName: 'Admin',        role: 'SYS_ORG_ADMIN',         emailLocal: 'admin' },
      { firstName: 'Nikhil',   lastName: 'Reception',    role: 'SYS_RECEPTIONIST',      emailLocal: 'reception' },
      { firstName: 'Priya',    lastName: 'Nurse',        role: 'SYS_NURSE',             emailLocal: 'nurse' },
      { firstName: 'Meena',    lastName: 'Ward',         role: 'SYS_WARD_NURSE',        emailLocal: 'wardnurse' },
      { firstName: 'Kavya',    lastName: 'Charge',       role: 'SYS_CHARGE_NURSE',      emailLocal: 'chargenurse' },
      { firstName: 'Vikram',   lastName: 'Pharma',       role: 'SYS_PHARMACIST',        emailLocal: 'pharmacy' },
      { firstName: 'Anjali',   lastName: 'Lab',          role: 'SYS_LAB_TECH',          emailLocal: 'lab' },
      { firstName: 'Suresh',   lastName: 'Billing',      role: 'SYS_BILLING',           emailLocal: 'billing' },
    ];
    const createdStaff: Array<{ role: string; email: string }> = [];

    await safe('staff users', async () => {
      const roleRows = await this.prisma.tenantRole.findMany({
        where: { tenantId, isSystemRole: true },
        select: { id: true, systemRoleId: true },
      });
      const roleByName: Record<string, string> = {};
      for (const r of roleRows) if (r.systemRoleId) roleByName[r.systemRoleId] = r.id;

      for (const s of staffDefs) {
        const email = `${s.emailLocal}@${host}`;
        const roleId = roleByName[s.role];
        if (!roleId) {
          // eslint-disable-next-line no-console
          console.warn(`[seed-starter] No role row for ${s.role}, skipping ${email}`);
          continue;
        }
        const existing = await this.prisma.tenantUser.findFirst({ where: { tenantId, email } });
        if (existing) {
          await this.prisma.tenantUser.update({
            where: { id: existing.id },
            data: { roleId, primaryLocationId: locationId, isActive: true },
          });
        } else {
          await this.prisma.tenantUser.create({
            data: {
              tenantId, email, passwordHash,
              firstName: s.firstName, lastName: s.lastName,
              phone: '9000000000',
              roleId, primaryLocationId: locationId,
              locationScope: 'ALL',
              forcePasswordChange: false, isActive: true, mfaEnabled: false,
            },
          });
          summary.staffUsers++;
        }
        createdStaff.push({ role: s.role, email });
      }
    });

    // ── Departments ──────────────────────────────────────────────────────
    await safe('departments', async () => {
      const deptDefs = [
        { name: 'General Medicine', code: 'GMED' },
        { name: 'Pediatrics',       code: 'PEDS' },
        { name: 'Pharmacy',         code: 'PHARM' },
        { name: 'Laboratory',       code: 'LAB' },
        { name: 'Emergency',        code: 'EMRG' },
      ];
      for (const d of deptDefs) {
        const ex = await this.prisma.department.findFirst({ where: { tenantId, code: d.code } });
        if (!ex) {
          await this.prisma.department.create({
            data: { tenantId, locationId, name: d.name, code: d.code, isActive: true } as any,
          });
          summary.departments++;
        }
      }
    });

    // ── Wards + Beds ─────────────────────────────────────────────────────
    await safe('wards + beds', async () => {
      const wardDefs: Array<{ name: string; code: string; type: string; floor: number; bedCount: number; bedPrefix: string }> = [
        { name: 'General Ward',  code: 'GW',  type: 'GENERAL', floor: 1, bedCount: 6, bedPrefix: 'GW' },
        { name: 'ICU',           code: 'ICU', type: 'ICU',     floor: 2, bedCount: 4, bedPrefix: 'ICU' },
        { name: 'Private Rooms', code: 'PVT', type: 'PRIVATE', floor: 3, bedCount: 4, bedPrefix: 'PVT' },
      ];
      for (const w of wardDefs) {
        let ward = await this.prisma.ward.findFirst({ where: { tenantId, locationId, code: w.code } });
        if (!ward) {
          ward = await this.prisma.ward.create({
            data: {
              tenantId, locationId, name: w.name, code: w.code, type: w.type,
              floor: w.floor, totalBeds: w.bedCount, isActive: true,
            } as any,
          });
          summary.wards++;
        }
        const existingBeds = await this.prisma.bed.count({ where: { wardId: ward.id } });
        const needed = w.bedCount - existingBeds;
        if (needed > 0) {
          const bedRows = Array.from({ length: needed }, (_, i) => ({
            tenantId, wardId: ward!.id,
            bedNumber: `${w.bedPrefix}-${String(existingBeds + i + 1).padStart(2, '0')}`,
            type: w.type === 'ICU' ? 'ICU' : (w.type === 'PRIVATE' ? 'PRIVATE' : 'GENERAL'),
            status: 'AVAILABLE',
          }));
          const result = await this.prisma.bed.createMany({ data: bedRows as any, skipDuplicates: true });
          summary.beds += result.count;
        }
      }
    });

    // ── Drug catalog + opening stock ─────────────────────────────────────
    await safe('drugs + batches', async () => {
      const drugDefs = [
        { brandName: 'Calpol 500',        genericName: 'Paracetamol',                   dosageForm: 'TABLET',    strength: '500mg', category: 'ANALGESICS' },
        { brandName: 'Augmentin 625',     genericName: 'Amoxicillin + Clavulanate',     dosageForm: 'TABLET',    strength: '625mg', category: 'ANTIBIOTICS' },
        { brandName: 'Pan 40',            genericName: 'Pantoprazole',                  dosageForm: 'TABLET',    strength: '40mg',  category: 'OTC' },
        { brandName: 'Crocin Cold & Flu', genericName: 'Paracetamol + Phenylephrine',   dosageForm: 'TABLET',    strength: '500mg', category: 'ANALGESICS' },
        { brandName: 'ORS Powder',        genericName: 'Oral Rehydration Salts',        dosageForm: 'POWDER',    strength: '21g',   category: 'OTC' },
        { brandName: 'Asthalin Inhaler',  genericName: 'Salbutamol',                    dosageForm: 'INHALER',   strength: '100mcg',category: 'OTC' },
        { brandName: 'Cetzine',           genericName: 'Cetirizine',                    dosageForm: 'TABLET',    strength: '10mg',  category: 'OTC' },
        { brandName: 'Saline IV',         genericName: 'Sodium Chloride 0.9%',          dosageForm: 'INJECTION', strength: '500ml', category: 'IV_FLUIDS' },
      ];
      for (const d of drugDefs) {
        const ex = await this.prisma.drug.findFirst({ where: { tenantId, brandName: d.brandName } });
        if (!ex) {
          const drug = await this.prisma.drug.create({
            data: {
              tenantId,
              brandName: d.brandName,
              genericName: d.genericName,
              dosageForm: d.dosageForm,
              strength: d.strength,
              category: d.category,
              gstPct: 12,
              reorderLevel: 20,
              maxStockLevel: 500,
              storageCondition: 'ROOM_TEMPERATURE',
              isControlled: false,
            } as any,
          });
          summary.drugs++;
          const exp = new Date(); exp.setFullYear(exp.getFullYear() + 1);
          await this.prisma.drugBatch.create({
            data: {
              tenantId,
              drugId: drug.id,
              locationId,
              batchNumber: `B-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
              expiryDate: exp,
              quantityInStock: 200,
              unitCost: 5,
              status: 'ACTIVE',
              receivedDate: new Date(),
            } as any,
          });
          summary.drugBatches++;
        }
      }
    });

    // ── Sample doctor + affiliation ──────────────────────────────────────
    const doctorEmail = `doctor.demo@${tenant.slug}.local`;
    let doctor: { id: string } | null = null;
    await safe('sample doctor', async () => {
      let d = await this.prisma.doctorRegistry.findUnique({ where: { email: doctorEmail } });
      if (!d) {
        d = await this.prisma.doctorRegistry.create({
          data: {
            email: doctorEmail,
            passwordHash,
            firstName: 'Rahul',
            lastName: 'Sharma',
            phone: `+91${Math.floor(7000000000 + Math.random() * 999999999)}`,
            gender: 'MALE',
            dateOfBirth: new Date('1985-06-15'),
            primaryDegree: 'MBBS',
            pgDegree: 'MD',
            pgSpecialization: 'General Medicine',
            experienceYears: 12,
            specialties: ['General Medicine', 'Internal Medicine'],
            subspecialties: [],
            languages: ['English', 'Hindi', 'Tamil'],
            medicalCouncil: 'TNMC',
            registrationNo: `TN-${Math.floor(10000 + Math.random() * 89999)}`,
            registrationDate: new Date('2010-01-01'),
            ayphenStatus: 'VERIFIED',
            mfaEnabled: false,
          } as any,
        });
      }
      doctor = { id: d.id };
      const existingAff = await this.prisma.doctorOrgAffiliation.findFirst({
        where: { doctorId: d.id, tenantId },
      });
      if (!existingAff) {
        await this.prisma.doctorOrgAffiliation.create({
          data: {
            doctorId: d.id,
            tenantId,
            locationId,
            designation: 'Consultant',
            employmentType: 'FULL_TIME',
            departmentName: 'General Medicine',
            availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
            slotDurationMinutes: 15,
            consultationFee: 500,
            status: 'ACTIVE',
            isActive: true,
            acceptedAt: new Date(),
            joinedAt: new Date(),
          },
        });
        summary.doctorAffiliated = true;
      }
    });

    // ── Sample patients (3) — so reception/queue/triage have records ─────
    const patientDefs = [
      { firstName: 'Ravi',   lastName: 'Kumar',  gender: 'MALE',   bloodGroup: 'O+',  mobile: '9988776601', dob: '1988-04-12', email: `patient1@${tenant.slug}.local` },
      { firstName: 'Sneha',  lastName: 'Patel',  gender: 'FEMALE', bloodGroup: 'A+',  mobile: '9988776602', dob: '1995-11-22', email: `patient2@${tenant.slug}.local` },
      { firstName: 'Arjun',  lastName: 'Mehta',  gender: 'MALE',   bloodGroup: 'B+',  mobile: '9988776603', dob: '1972-03-30', email: `patient3@${tenant.slug}.local` },
    ];
    const createdPatients: Array<{ id: string; patientId: string; firstName: string; lastName: string }> = [];
    await safe('sample patients', async () => {
      for (let i = 0; i < patientDefs.length; i++) {
        const p = patientDefs[i];
        let pat = await this.prisma.patient.findFirst({ where: { tenantId, email: p.email } });
        if (!pat) {
          const pid = `P${Date.now().toString().slice(-6)}${i}`;
          pat = await this.prisma.patient.create({
            data: {
              tenantId, locationId, patientId: pid,
              registrationType: 'WALKIN',
              firstName: p.firstName, lastName: p.lastName,
              dateOfBirth: new Date(p.dob),
              gender: p.gender, bloodGroup: p.bloodGroup,
              mobile: p.mobile, email: p.email,
              address: { line1: '1 Demo Street', city: 'Chennai', state: 'TN' },
            } as any,
          });
          summary.patients++;
        }
        createdPatients.push({ id: pat.id, patientId: pat.patientId, firstName: pat.firstName, lastName: pat.lastName });
      }
    });

    // Pull the seeded nurse user — needed for Vital.recordedById (required).
    let nurseUserId: string | null = null;
    await safe('nurse lookup', async () => {
      const nurse = await this.prisma.tenantUser.findFirst({
        where: { tenantId, email: `nurse@${host}` },
        select: { id: true },
      });
      nurseUserId = nurse?.id || null;
    });

    // ── Today's queue tokens — gives reception + nurse + doctor screens content
    // QueueToken.tokenNumber is Int (not String) per schema.
    await safe('queue tokens', async () => {
      if (!doctor || !createdPatients.length) return;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const existingToday = await this.prisma.queueToken.count({
        where: { tenantId, queueDate: today },
      });
      if (existingToday >= 2) return;
      for (let i = 0; i < Math.min(2, createdPatients.length); i++) {
        const pat = createdPatients[i];
        await this.prisma.queueToken.create({
          data: {
            tenantId, locationId,
            tokenNumber: existingToday + i + 1,
            patientId: pat.id,
            doctorId: doctor!.id,
            visitType: 'OPD',
            priority: 'NORMAL',
            status: 'WAITING',
            queueDate: today,
            checkInTime: new Date(),
          } as any,
        });
        summary.queueTokens++;
      }
    });

    // ── A vitals record on the first patient — so nurse sees historic data ──
    // Vital.recordedById is required; skip if we couldn't resolve a nurse.
    await safe('vitals', async () => {
      if (!createdPatients.length || !nurseUserId) return;
      const pat = createdPatients[0];
      const existing = await this.prisma.vital.count({ where: { tenantId, patientId: pat.id } });
      if (existing > 0) return;
      await this.prisma.vital.create({
        data: {
          tenantId, locationId, patientId: pat.id,
          systolicBp: 130, diastolicBp: 85,
          heartRate: 78, temperatureC: 37.1, spo2: 98,
          respiratoryRate: 16, weightKg: 72, heightCm: 175,
          recordedById: nurseUserId,
          recordedAt: new Date(),
        } as any,
      });
      summary.vitals++;
    });

    // ── A future appointment on patient 2 — populates appointments screen ──
    await safe('sample appointment', async () => {
      if (!doctor || createdPatients.length < 2) return;
      const pat = createdPatients[1];
      const existing = await this.prisma.appointment.count({ where: { tenantId, patientId: pat.id } });
      if (existing > 0) return;
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
      await this.prisma.appointment.create({
        data: {
          tenantId, locationId,
          patientId: pat.id,
          doctorId: doctor!.id,
          appointmentDate: tomorrow,
          appointmentTime: '10:30',
          durationMinutes: 15,
          type: 'CONSULTATION',
          source: 'WALK_IN',
          status: 'SCHEDULED',
          chiefComplaint: 'Routine follow-up',
        } as any,
      });
      summary.appointments++;
    });

    // Also turn on every applicable feature module — covers the
    // FeatureFlagGuard 403 trap on older orgs that were created before a
    // module (e.g. MOD_TRIAGE) was added to defaults. Best-effort.
    await safe('enable all features', async () => {
      if (!adminId) return;
      await this.enableAllFeaturesForOrg(tenantId, adminId);
    });

    const prettyRole = (sysRole: string) =>
      sysRole.replace('SYS_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

    return {
      message: 'Starter data provisioned',
      tenant: { id: tenantId, slug: tenant.slug, name: tenant.legalName },
      created: summary,
      sharedPassword,
      note: 'All staff and the sample doctor share the password. Passwords are NOT reset for users that already existed.',
      staff: createdStaff.map(s => ({ role: prettyRole(s.role), email: s.email })),
      sampleDoctor: { email: doctorEmail, password: sharedPassword, name: 'Dr. Rahul Sharma', loginUrl: '/doctor/login' },
    };
  }

  // Lightweight read-only endpoint: returns current row counts for every
  // table the starter seed touches. UI calls this separately so the seed
  // request itself stays fast (Vercel proxies time out at ~30s and seeding
  // a slow remote DB doesn't leave budget for 11 extra count queries).
  async getDataCountsForOrg(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Organization not found');
    const [staffN, deptN, drugN, batchN, wardN, bedN, patN, tokN, vitN, apptN, affN] = await Promise.all([
      this.prisma.tenantUser.count({ where: { tenantId } }),
      this.prisma.department.count({ where: { tenantId } }),
      this.prisma.drug.count({ where: { tenantId } }),
      this.prisma.drugBatch.count({ where: { tenantId } }),
      this.prisma.ward.count({ where: { tenantId } }),
      this.prisma.bed.count({ where: { tenantId } }),
      this.prisma.patient.count({ where: { tenantId } }),
      this.prisma.queueToken.count({ where: { tenantId } }),
      this.prisma.vital.count({ where: { tenantId } }),
      this.prisma.appointment.count({ where: { tenantId } }),
      this.prisma.doctorOrgAffiliation.count({ where: { tenantId, isActive: true } }),
    ]);
    return {
      staffUsers: staffN, departments: deptN, drugs: drugN, drugBatches: batchN,
      wards: wardN, beds: bedN, patients: patN, queueTokens: tokN,
      vitals: vitN, appointments: apptN, doctorAffiliations: affN,
    };
  }

  // One-shot demo provisioning. Creates a complete hospital with one user
  // per system role, an affiliated doctor, sample departments, drugs, and
  // a sample patient — everything the OPD demo flow needs. Returns the
  // credentials so the platform admin can hand them out at the demo.
  // Idempotent on the org slug: if the slug already exists, throws so the
  // caller can pick a different one.
  async seedDemoOrganization(input: { name?: string; slug?: string } = {}, platformAdminId: string) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const slug = (input.slug || `demo-${stamp}-${Math.random().toString(36).slice(2, 6)}`).toLowerCase();
    const name = input.name || `Demo Hospital — ${stamp}`;

    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException(`Slug '${slug}' already exists — pick another`);

    const sharedPassword = 'Demo@1234';
    const passwordHash = await bcrypt.hash(sharedPassword, 10);

    // Step 1 — Tenant + location + features + system roles via the existing
    // createOrganization path. We DON'T pass adminUser here — createOrganization
    // would create the admin with an auto-generated random password and
    // re-overriding that hash is racy. We create the admin ourselves below
    // alongside the rest of the staff, with the known shared password.
    const tenant = await this.createOrganization({
      legalName: name,
      tradeName: name,
      orgType: 'HOSPITAL',
      slug,
      primaryEmail: `admin@${slug}.demo`,
      primaryPhone: '9999999999',
      subscriptionPlan: 'STANDARD',
      trialDays: 30,
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      location: {
        name: `${name} — Main Campus`,
        code: 'MAIN',
        type: 'MAIN',
        address: { line1: '1 Demo Road', city: 'Chennai', state: 'Tamil Nadu', pin: '600001', country: 'IN' },
        phone: '9999999999',
        email: `info@${slug}.demo`,
      },
      // intentionally no adminUser — we'll create all staff (including admin)
      // ourselves in step 2 with deterministic passwords.
    }, platformAdminId);

    const tenantId = tenant.id as string;
    const location = await this.prisma.tenantLocation.findFirst({ where: { tenantId } });
    if (!location) throw new BadRequestException('Demo seed: primary location creation failed');
    const locationId = location.id;

    // Step 2 — One staff user per role we need for the demo, plus the org admin.
    const staffUsers = [
      { firstName: 'Admin',    lastName: 'Demo',      role: 'SYS_ORG_ADMIN',        emailLocal: 'admin' },
      { firstName: 'Nikhil',   lastName: 'Reception', role: 'SYS_RECEPTIONIST',     emailLocal: 'reception' },
      { firstName: 'Priya',    lastName: 'Nurse',     role: 'SYS_NURSE',            emailLocal: 'nurse' },
      { firstName: 'Vikram',   lastName: 'Pharma',    role: 'SYS_PHARMACIST',       emailLocal: 'pharmacy' },
      { firstName: 'Anjali',   lastName: 'Lab',       role: 'SYS_LAB_TECH',         emailLocal: 'lab' },
      { firstName: 'Suresh',   lastName: 'Billing',   role: 'SYS_BILLING',          emailLocal: 'billing' },
    ];
    const roleByName: Record<string, string> = {};
    const rolesInOrg = await this.prisma.tenantRole.findMany({
      where: { tenantId, isSystemRole: true },
      select: { id: true, systemRoleId: true },
    });
    for (const r of rolesInOrg) if (r.systemRoleId) roleByName[r.systemRoleId] = r.id;

    const createdStaff: Array<{ role: string; email: string }> = [];
    for (const s of staffUsers) {
      const email = `${s.emailLocal}@${slug}.demo`;
      const roleId = roleByName[s.role];
      if (!roleId) {
        // eslint-disable-next-line no-console
        console.warn(`[seed-demo] No role row for ${s.role}, skipping ${email}`);
        continue;
      }
      // find-then-update-or-create. Simpler than upsert and easier to debug:
      // we always end up with a single user record whose passwordHash matches
      // the bcrypt(sharedPassword) we generated above.
      const existing = await this.prisma.tenantUser.findFirst({ where: { tenantId, email } });
      if (existing) {
        await this.prisma.tenantUser.update({
          where: { id: existing.id },
          data: {
            passwordHash, roleId, primaryLocationId: locationId,
            isActive: true, forcePasswordChange: false, mfaEnabled: false, mfaSecret: null,
          },
        });
      } else {
        await this.prisma.tenantUser.create({
          data: {
            tenantId, email, passwordHash,
            firstName: s.firstName, lastName: s.lastName,
            phone: '9000000000',
            roleId, primaryLocationId: locationId,
            locationScope: 'ALL',
            forcePasswordChange: false, isActive: true, mfaEnabled: false,
          },
        });
      }
      createdStaff.push({ role: s.role, email });
    }
    // eslint-disable-next-line no-console
    console.log(`[seed-demo] ${name} (${slug}): created/updated ${createdStaff.length} staff users with password '${sharedPassword}'`);

    // Step 3 — Sample doctor (DoctorRegistry is global, email unique).
    const doctorEmail = `doctor@${slug}.demo`;
    let doctor = await this.prisma.doctorRegistry.findUnique({ where: { email: doctorEmail } });
    if (!doctor) {
      doctor = await this.prisma.doctorRegistry.create({
        data: {
          email: doctorEmail,
          passwordHash,
          firstName: 'Rahul',
          lastName: 'Sharma',
          phone: `+91${Math.floor(7000000000 + Math.random() * 999999999)}`,
          gender: 'MALE',
          dateOfBirth: new Date('1985-06-15'),
          primaryDegree: 'MBBS',
          pgDegree: 'MD',
          pgSpecialization: 'General Medicine',
          experienceYears: 12,
          specialties: ['General Medicine', 'Internal Medicine'],
          subspecialties: [],
          languages: ['English', 'Hindi', 'Tamil'],
          medicalCouncil: 'TNMC',
          registrationNo: `TN-${Math.floor(10000 + Math.random() * 89999)}`,
          registrationDate: new Date('2010-01-01'),
          ayphenStatus: 'VERIFIED',
          mfaEnabled: false,
        } as any,
      });
    }

    // Affiliate the doctor to this tenant (single affiliation, single location).
    const existingAff = await this.prisma.doctorOrgAffiliation.findFirst({
      where: { doctorId: doctor.id, tenantId },
    });
    if (!existingAff) {
      await this.prisma.doctorOrgAffiliation.create({
        data: {
          doctorId: doctor.id,
          tenantId,
          locationId,
          designation: 'Consultant',
          employmentType: 'FULL_TIME',
          departmentName: 'General Medicine',
          availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
          slotDurationMinutes: 15,
          consultationFee: 500,
          status: 'ACTIVE',
          isActive: true,
          acceptedAt: new Date(),
          joinedAt: new Date(),
        },
      });
    }

    // Step 4 — A couple of departments so the patient-portal selector and
    // doctor filter have something to show.
    const deptDefs = [
      { name: 'General Medicine', code: 'GMED' },
      { name: 'Pediatrics',       code: 'PEDS' },
      { name: 'Pharmacy',         code: 'PHARM' },
      { name: 'Laboratory',       code: 'LAB' },
    ];
    for (const d of deptDefs) {
      const ex = await this.prisma.department.findFirst({ where: { tenantId, code: d.code } });
      if (!ex) {
        await this.prisma.department.create({
          data: { tenantId, locationId, name: d.name, code: d.code, isActive: true } as any,
        });
      }
    }

    // Step 5 — Sample patient so the OPD flow has someone to triage on.
    const patientId = `PAT-${stamp}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    let patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: `patient@${slug}.demo` },
    });
    if (!patient) {
      patient = await this.prisma.patient.create({
        data: {
          tenantId,
          locationId,
          patientId,
          registrationType: 'WALKIN',
          firstName: 'Demo',
          lastName: 'Patient',
          dateOfBirth: new Date('1990-04-12'),
          gender: 'MALE',
          bloodGroup: 'O+',
          mobile: '9988776655',
          email: `patient@${slug}.demo`,
          address: { line1: '12 Patient Lane', city: 'Chennai', state: 'TN' },
          allergies: ['Penicillin'],
        } as any,
      });
    }

    // Also create a PatientAccount so the patient portal login works.
    const patientAccountEmail = `patient@${slug}.demo`;
    let patientAccount = await this.prisma.patientAccount.findUnique({ where: { email: patientAccountEmail } });
    if (!patientAccount) {
      patientAccount = await this.prisma.patientAccount.create({
        data: {
          email: patientAccountEmail,
          passwordHash,
          firstName: 'Demo',
          lastName: 'Patient',
          phone: '9988776655',
          dateOfBirth: new Date('1990-04-12'),
          gender: 'MALE',
          bloodGroup: 'O+',
        } as any,
      });
    } else {
      // Reset password if the account already existed
      await this.prisma.patientAccount.update({
        where: { id: patientAccount.id },
        data: { passwordHash },
      });
    }

    // Step 6 — A handful of drugs so the doctor's Rx can pick from a real list.
    const drugDefs = [
      { brandName: 'Calpol 500', genericName: 'Paracetamol', dosageForm: 'TABLET', strength: '500mg', category: 'ANALGESICS' },
      { brandName: 'Augmentin 625', genericName: 'Amoxicillin + Clavulanate', dosageForm: 'TABLET', strength: '625mg', category: 'ANTIBIOTICS' },
      { brandName: 'Pan 40', genericName: 'Pantoprazole', dosageForm: 'TABLET', strength: '40mg', category: 'OTC' },
      { brandName: 'Crocin Cold & Flu', genericName: 'Paracetamol + Phenylephrine', dosageForm: 'TABLET', strength: '500mg', category: 'ANALGESICS' },
      { brandName: 'ORS Powder', genericName: 'Oral Rehydration Salts', dosageForm: 'POWDER', strength: '21g', category: 'OTC' },
    ];
    for (const d of drugDefs) {
      const ex = await this.prisma.drug.findFirst({ where: { tenantId, brandName: d.brandName } });
      if (!ex) {
        const drug = await this.prisma.drug.create({
          data: {
            tenantId,
            brandName: d.brandName,
            genericName: d.genericName,
            dosageForm: d.dosageForm,
            strength: d.strength,
            category: d.category,
            gstPct: 12,
            reorderLevel: 20,
            maxStockLevel: 500,
            storageCondition: 'ROOM_TEMPERATURE',
            isControlled: false,
          } as any,
        });
        // Stock with one batch so dispense actually has inventory
        const exp = new Date(); exp.setFullYear(exp.getFullYear() + 1);
        await this.prisma.drugBatch.create({
          data: {
            tenantId,
            drugId: drug.id,
            locationId,
            batchNumber: `B-${Date.now().toString().slice(-6)}`,
            expiryDate: exp,
            quantityInStock: 200,
            unitCost: 5,
            status: 'ACTIVE',
            receivedDate: new Date(),
          } as any,
        });
      }
    }

    await this.logPlatformEvent('TENANT_DEMO_SEEDED', platformAdminId, 'TENANT', tenantId, name, `Demo organization seeded with full staff + sample data`);

    const prettyRole = (sysRole: string) =>
      sysRole.replace('SYS_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

    return {
      tenant: { id: tenantId, name, slug },
      credentials: {
        password: sharedPassword,
        loginUrl: '/login',
        platformAdminNote: 'All staff and patient accounts share this password. Use /login for staff (incl. admin).',
        staff: createdStaff.map(s => ({ role: prettyRole(s.role), email: s.email })),
        doctor: { email: doctorEmail, loginUrl: '/doctor/login' },
        patient: { email: patientAccountEmail, loginUrl: '/patient/login' },
      },
      tip: 'Log in as reception → register a walk-in (or use Demo Patient), nurse triages, doctor sees triage card on consult page, writes Rx (auto-routes to pharmacy), orders lab, completes (auto invoice). Pharmacist dispenses, lab tech enters result, reception finalises bill. Then log in as patient (patient@<slug>.demo) → Timeline shows the whole journey.',
    };
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
