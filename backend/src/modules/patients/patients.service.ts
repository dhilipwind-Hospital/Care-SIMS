import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { sendEmail } from '../../common/utils/mailer';
import { AiService } from '../ai/ai.service';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);
  constructor(private prisma: PrismaService, private ai: AiService) {}

  async findAll(tenantId: string, query: any) {
    const { locationId, q, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, isDeleted: false };
    if (locationId) where.locationId = locationId;
    if (q) where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { mobile: { contains: q } },
      { patientId: { contains: q, mode: 'insensitive' } },
      { nationalId: { contains: q } },
    ];
    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      this.prisma.patient.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
  }

  async create(tenantId: string, dto: any, registeredById: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const prefix = `${(tenant?.slug?.slice(0, 4) || 'PAT').toUpperCase()}-`;

    // Resolve locationId — fall back to user's primary location if not provided
    let locationId = dto.locationId;
    if (!locationId) {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: registeredById } });
      locationId = user?.primaryLocationId || undefined;
    }
    if (!locationId) {
      const loc = await this.prisma.tenantLocation.findFirst({ where: { tenantId } });
      locationId = loc?.id;
    }
    if (!locationId) throw new Error('No location available for patient registration');

    // Map frontend fields (phone, addressLine*, etc.) to schema shape
    const mobile = dto.mobile || dto.phone;
    if (!mobile) throw new Error('Mobile/phone number is required');

    // Build structured address JSON if any address fields present
    let addressJson: any = undefined;
    if (dto.address && typeof dto.address === 'object') {
      addressJson = dto.address;
    } else if (dto.addressLine1 || dto.addressLine2 || dto.city || dto.state || dto.pinCode) {
      addressJson = {
        line1: dto.addressLine1 || undefined,
        line2: dto.addressLine2 || undefined,
        city: dto.city || undefined,
        state: dto.state || undefined,
        pinCode: dto.pinCode || undefined,
      };
    } else if (typeof dto.address === 'string' && dto.address.trim()) {
      addressJson = { line1: dto.address };
    }

    // Build emergency contact JSON
    let emergencyContactJson: any = undefined;
    if (dto.emergencyContact && typeof dto.emergencyContact === 'object') {
      emergencyContactJson = dto.emergencyContact;
    } else if (dto.emergencyContactName || dto.emergencyContactPhone || dto.emergencyRelationship) {
      emergencyContactJson = {
        name: dto.emergencyContactName || undefined,
        phone: dto.emergencyContactPhone || undefined,
        relationship: dto.emergencyRelationship || undefined,
      };
    }

    // Allergies: accept array OR comma-separated string
    const allergiesArray: string[] = Array.isArray(dto.allergies)
      ? dto.allergies
      : (typeof dto.knownAllergies === 'string' && dto.knownAllergies.trim()
          ? dto.knownAllergies.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []);

    // Existing conditions: array OR comma-separated string
    const existingConditionsArray: string[] = Array.isArray(dto.existingConditions)
      ? dto.existingConditions
      : (typeof dto.preExistingConditions === 'string' && dto.preExistingConditions.trim()
          ? dto.preExistingConditions.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []);

    // Insurance JSON
    let insuranceJson: any = undefined;
    if (dto.insurance && typeof dto.insurance === 'object') {
      insuranceJson = dto.insurance;
    } else if (dto.insuranceProvider || dto.policyNumber) {
      insuranceJson = {
        provider: dto.insuranceProvider || undefined,
        policyNumber: dto.policyNumber || undefined,
      };
    }

    const created = await generateSequentialId(this.prisma, {
      table: 'Patient',
      idColumn: 'patientId',
      prefix,
      tenantId,
      callback: async (tx, patientId) => {
        return tx.patient.create({
          data: {
            tenantId, patientId,
            locationId,
            registrationType: dto.registrationType || 'WALKIN',
            firstName: dto.firstName,
            lastName: dto.lastName || '',
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
            ageYears: dto.ageYears,
            gender: dto.gender || 'OTHER',
            bloodGroup: dto.bloodGroup,
            nationalId: dto.nationalId || dto.idNumber,
            mobile,
            alternatePhone: dto.alternatePhone,
            email: dto.email,
            address: addressJson,
            emergencyContact: emergencyContactJson,
            allergies: allergiesArray,
            existingConditions: existingConditionsArray,
            pastSurgeries: dto.pastSurgeries,
            familyHistory: dto.familyHistory,
            insurance: insuranceJson,
            registeredById,
          },
        });
      },
    });

    if (dto.email) {
      const orgName = tenant?.tradeName || tenant?.legalName || 'our hospital';
      let tempPassword: string | null = null;
      try {
        const existing = await this.prisma.patientAccount.findUnique({ where: { email: dto.email } });
        if (!existing) {
          tempPassword = this.generateTempPassword();
          const hash = await bcrypt.hash(tempPassword, 12);
          await this.prisma.patientAccount.create({
            data: {
              email: dto.email,
              passwordHash: hash,
              firstName: dto.firstName,
              lastName: dto.lastName || '',
              phone: mobile,
              dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
              gender: dto.gender,
              bloodGroup: dto.bloodGroup,
            },
          });
        }
      } catch (err) {
        // Don't block registration if portal-account creation fails (duplicate
        // email race, etc.). Patient still gets the welcome email with their
        // Patient ID and can self-register for the portal later.
        this.logger.error(`Failed to auto-create portal account for ${dto.email}`, err as any);
        tempPassword = null;
      }

      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5555'}/patient/login`;
      const credentialsBlock = tempPassword
        ? `<div style="margin-top:20px;padding:14px 16px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;">
            <p style="color:#0f766e;font-weight:600;margin:0 0 8px;">Patient Portal Access</p>
            <p style="color:#334155;font-size:13px;margin:0;">You can now sign in to the patient portal to view appointments, lab results and invoices.</p>
            <p style="color:#334155;font-size:13px;margin:10px 0 0;">
              <strong>Login URL:</strong> <a href="${loginUrl}" style="color:#0f766e;">${loginUrl}</a><br/>
              <strong>Email:</strong> ${dto.email}<br/>
              <strong>Temporary Password:</strong> <code style="background:#fff;padding:2px 6px;border:1px solid #cbd5e1;border-radius:4px;font-family:monospace;">${tempPassword}</code>
            </p>
            <p style="color:#b45309;font-size:12px;margin:10px 0 0;">
              For your security, please sign in and change this password as soon as possible.
            </p>
          </div>`
        : '';

      const welcomeHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0F766E;">Welcome to ${orgName}, ${dto.firstName}!</h2>
          <p>You have been registered as a patient at <strong>${orgName}</strong>.</p>
          <p style="color:#666;font-size:13px;margin-top:16px;">
            <strong>Your details</strong><br/>
            Patient ID: ${(created as any)?.patientId || '-'}<br/>
            Name: ${dto.firstName} ${dto.lastName || ''}<br/>
            Phone: ${mobile}<br/>
            Email: ${dto.email}
          </p>
          <p style="color:#666;font-size:13px;margin-top:16px;">
            Please keep your Patient ID handy for future visits, appointments and billing.
          </p>
          ${credentialsBlock}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#aaa;font-size:12px;">${orgName} &middot; Powered by Ayphen HMS</p>
        </div>
      `;
      sendEmail(dto.email, `Welcome to ${orgName} – your patient registration is confirmed`, welcomeHtml).catch((err) =>
        this.logger.error(`Failed to send patient welcome email to ${dto.email}`, err),
      );
    }

    return created;
  }

  private generateTempPassword(): string {
    // 12 chars from URL-safe alphabet — enough entropy, easy to type from email.
    return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
  }

  async findOne(tenantId: string, id: string) {
    const patient = await this.prisma.patient.findFirst({ where: { id, tenantId, isDeleted: false } });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async findByPatientId(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { tenantId, patientId, isDeleted: false } });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.ageYears !== undefined) data.ageYears = dto.ageYears;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.bloodGroup !== undefined) data.bloodGroup = dto.bloodGroup;
    if (dto.nationalId !== undefined) data.nationalId = dto.nationalId;
    if (dto.mobile !== undefined) data.mobile = dto.mobile;
    if (dto.alternatePhone !== undefined) data.alternatePhone = dto.alternatePhone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.emergencyContact !== undefined) data.emergencyContact = dto.emergencyContact;
    if (dto.allergies !== undefined) data.allergies = dto.allergies;
    if (dto.allergyDetails !== undefined) data.allergyDetails = dto.allergyDetails;
    if (dto.existingConditions !== undefined) data.existingConditions = dto.existingConditions;
    if (dto.currentMedications !== undefined) data.currentMedications = dto.currentMedications;
    if (dto.pastSurgeries !== undefined) data.pastSurgeries = dto.pastSurgeries;
    if (dto.familyHistory !== undefined) data.familyHistory = dto.familyHistory;
    if (dto.insurance !== undefined) data.insurance = dto.insurance;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.patient.update({ where: { id }, data });
  }

  async getHistory(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const [consultations, prescriptions, labOrders, vitals, admissions, invoices] = await Promise.all([
      this.prisma.consultation.findMany({ where: { tenantId, patientId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.prescription.findMany({ where: { tenantId, patientId: id }, orderBy: { createdAt: 'desc' }, take: 20, include: { items: true } }),
      this.prisma.labOrder.findMany({ where: { tenantId, patientId: id }, orderBy: { orderedAt: 'desc' }, take: 20, include: { items: true } }),
      this.prisma.vital.findMany({ where: { tenantId, patientId: id }, orderBy: { recordedAt: 'desc' }, take: 20 }),
      this.prisma.admission.findMany({ where: { tenantId, patientId: id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.invoice.findMany({ where: { tenantId, patientId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    return { consultations, prescriptions, labOrders, vitals, admissions, invoices };
  }

  async getAccessLog(tenantId: string, id: string) {
    return this.prisma.patientAccessLog.findMany({ where: { tenantId, patientId: id }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  /**
   * Mobile-optimized patient summary endpoint.
   * Returns a lightweight overview in a single API call.
   */
  async getSummary(tenantId: string, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const [vitals, activePrescriptions, upcomingAppointments, lastConsultation] = await Promise.all([
      // Last 5 vitals
      this.prisma.vital.findMany({
        where: { tenantId, patientId: id },
        orderBy: { recordedAt: 'desc' },
        take: 5,
      }),
      // Active prescriptions count
      this.prisma.prescription.count({
        where: { tenantId, patientId: id, status: 'ACTIVE' },
      }),
      // Upcoming appointments count
      this.prisma.appointment.count({
        where: {
          tenantId,
          patientId: id,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          appointmentDate: { gte: new Date() },
        },
      }),
      // Last consultation date
      this.prisma.consultation.findFirst({
        where: { tenantId, patientId: id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      id: patient.id,
      patientId: (patient as any).patientId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      ageYears: (patient as any).ageYears,
      gender: patient.gender,
      bloodGroup: (patient as any).bloodGroup,
      allergies: (patient as any).allergies || [],
      recentVitals: vitals,
      activePrescriptionsCount: activePrescriptions,
      upcomingAppointmentsCount: upcomingAppointments,
      lastConsultationDate: lastConsultation?.createdAt || null,
    };
  }

  // AI summary of the patient's history. Returns the cached summary if one
  // exists and refresh wasn't requested, otherwise regenerates by feeding
  // Gemini a compact view of past consultations + prescriptions + lab
  // orders + admissions + triages and saves the result back to the patient.
  //
  // Defensive: if the ai_history_summary column doesn't exist yet (migration
  // hasn't run), still generates fresh on every call — the save just fails
  // silently. Caller's experience is identical except slower per-visit.
  async getAiHistorySummary(tenantId: string, patientId: string, userId: string, opts: { refresh?: boolean } = {}) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: {
        id: true, firstName: true, lastName: true, gender: true, ageYears: true,
        dateOfBirth: true, allergies: true, existingConditions: true,
        currentMedications: true, pastSurgeries: true, familyHistory: true,
        bloodGroup: true,
        aiHistorySummary: true, aiHistorySummaryAt: true,
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    if (patient.aiHistorySummary && !opts.refresh) {
      return { summary: patient.aiHistorySummary, generatedAt: patient.aiHistorySummaryAt, cached: true };
    }

    // Pull last ~12 months of clinical events. Cap at sane row counts so
    // long-tail patients don't blow out the token budget.
    const since = new Date(); since.setMonth(since.getMonth() - 12);
    const [consultations, prescriptions, labOrders, admissions, triages] = await Promise.all([
      this.prisma.consultation.findMany({
        where: { tenantId, patientId, startedAt: { gte: since } },
        orderBy: { startedAt: 'desc' }, take: 20,
        select: { chiefComplaint: true, assessment: true, plan: true, startedAt: true,
                  diagnoses: { select: { description: true, icdCode: true } } },
      }),
      this.prisma.prescription.findMany({
        where: { tenantId, patientId, issuedAt: { gte: since } },
        orderBy: { issuedAt: 'desc' }, take: 20,
        select: { rxNumber: true, issuedAt: true, status: true,
                  items: { select: { drugName: true, strength: true, frequency: true, durationDays: true } } },
      }),
      this.prisma.labOrder.findMany({
        where: { tenantId, patientId, orderedAt: { gte: since } },
        orderBy: { orderedAt: 'desc' }, take: 20,
        select: { orderNumber: true, orderedAt: true, items: { select: { testName: true } } },
      }),
      this.prisma.admission.findMany({
        where: { tenantId, patientId },
        orderBy: { admissionDate: 'desc' }, take: 5,
        select: { admissionDate: true, dischargeDate: true, diagnosisOnAdmission: true, status: true },
      }),
      this.prisma.triageRecord.findMany({
        where: { tenantId, patientId, triageTime: { gte: since } },
        orderBy: { triageTime: 'desc' }, take: 10,
        select: { triageTime: true, chiefComplaint: true, triageLevel: true },
      }),
    ]);

    const headerLine = `${patient.firstName} ${patient.lastName}, ${patient.gender || '?'}${patient.ageYears ? `, ${patient.ageYears}y` : ''}${patient.bloodGroup ? `, blood ${patient.bloodGroup}` : ''}`;
    const allergies = Array.isArray(patient.allergies) && patient.allergies.length ? patient.allergies.join(', ') : 'None known';
    const conditions = Array.isArray(patient.existingConditions) && patient.existingConditions.length ? patient.existingConditions.join(', ') : 'None known';

    const consultLines = consultations.map((c: any) => {
      const diag = (c.diagnoses || []).map((d: any) => `${d.icdCode || ''} ${d.description}`.trim()).join('; ');
      return `- ${c.startedAt?.toISOString().slice(0, 10)}: CC=${c.chiefComplaint || '—'}${diag ? `; Dx=${diag}` : ''}`;
    }).join('\n') || '(none)';

    const rxLines = prescriptions.map((rx: any) => {
      const meds = (rx.items || []).map((it: any) => `${it.drugName}${it.strength ? ` ${it.strength}` : ''}${it.frequency ? ` ${it.frequency}` : ''}${it.durationDays ? ` x${it.durationDays}d` : ''}`).join(', ');
      return `- ${rx.issuedAt?.toISOString().slice(0, 10)} [${rx.status}]: ${meds}`;
    }).join('\n') || '(none)';

    const labLines = labOrders.map((lo: any) =>
      `- ${lo.orderedAt?.toISOString().slice(0, 10)}: ${(lo.items || []).map((i: any) => i.testName).join(', ')}`,
    ).join('\n') || '(none)';

    const admLines = admissions.map((a: any) =>
      `- ${a.admissionDate?.toISOString().slice(0, 10)} → ${a.dischargeDate ? a.dischargeDate.toISOString().slice(0, 10) : 'current'} [${a.status}]: ${a.diagnosisOnAdmission || '—'}`,
    ).join('\n') || '(none)';

    const triageLines = triages.map((t: any) =>
      `- ${t.triageTime?.toISOString().slice(0, 10)} [${t.triageLevel}]: ${t.chiefComplaint || '—'}`,
    ).join('\n') || '(none)';

    const systemInstruction = `You are a senior physician writing a 5–7 bullet history summary for another doctor about to see this patient. Be concise and clinical. Cover ONLY what's clearly present in the data — never invent diagnoses, drug allergies, or test results.

Format: plain markdown bullets, no preamble or sign-off. Each bullet ≤ 20 words. Cover, in this order:
  • Demographics + allergies + active chronic conditions
  • Last visit (when + why)
  • Recurring patterns (e.g. "5 visits for migraine in past 6 months")
  • Notable diagnoses from past year
  • Currently active prescriptions
  • Any inpatient admission in past year
  • Anything that warrants caution today

If a section has no data, skip the bullet — don't write "no data".`;

    const prompt = `PATIENT: ${headerLine}
ALLERGIES: ${allergies}
EXISTING CONDITIONS: ${conditions}
PAST SURGERIES: ${patient.pastSurgeries || '(none recorded)'}
FAMILY HISTORY: ${patient.familyHistory || '(none recorded)'}

CONSULTATIONS (last 12 months, newest first):
${consultLines}

PRESCRIPTIONS (last 12 months):
${rxLines}

LAB ORDERS (last 12 months):
${labLines}

ADMISSIONS:
${admLines}

TRIAGE RECORDS (last 12 months):
${triageLines}

Write the bullet summary now.`;

    const result = await this.ai.complete({
      tenantId,
      feature: 'PATIENT_HISTORY',
      userId,
      patientId: patient.id,
      referenceType: 'PATIENT',
      referenceId: patient.id,
      systemInstruction,
      prompt,
      maxOutputTokens: 600,
    });

    const summary = result.text.trim();
    const now = new Date();
    // Save the cache. If the column doesn't exist yet (migration pending),
    // swallow the error — the feature still returns fresh content.
    try {
      await this.prisma.patient.update({
        where: { id: patient.id },
        data: { aiHistorySummary: summary, aiHistorySummaryAt: now } as any,
      });
    } catch (err) {
      this.logger.warn(`Could not cache AI summary for ${patient.id}: ${(err as any)?.message}`);
    }

    return { summary, generatedAt: now, cached: false, model: result.model, durationMs: result.durationMs };
  }

}
