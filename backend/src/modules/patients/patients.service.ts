import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

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
    try {
      return await this._createImpl(tenantId, dto, registeredById);
    } catch (err: any) {
      // Temporarily surface the real error for debugging
      throw new (await import('@nestjs/common')).BadRequestException(
        `Patient create failed: ${err?.message || String(err)}`,
      );
    }
  }

  private async _createImpl(tenantId: string, dto: any, registeredById: string) {
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

    return generateSequentialId(this.prisma, {
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

}
