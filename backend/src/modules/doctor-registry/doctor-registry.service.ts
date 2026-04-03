import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class DoctorRegistryService {
  constructor(private prisma: PrismaService) {}

  async getDoctors(query: any) {
    const { q, specialty, ayphenStatus, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (specialty) where.specialties = { has: specialty };
    if (ayphenStatus) where.ayphenStatus = ayphenStatus;
    if (q) where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { registrationNo: { contains: q, mode: 'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      this.prisma.doctorRegistry.findMany({
        where, skip, take: Number(limit), orderBy: { lastName: 'asc' },
        select: { id: true, email: true, firstName: true, lastName: true, specialties: true, registrationNo: true, ayphenStatus: true, createdAt: true },
      }),
      this.prisma.doctorRegistry.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getDoctor(id: string) {
    const doc = await this.prisma.doctorRegistry.findUnique({ where: { id }, include: { affiliations: { include: { location: true } } } });
    if (!doc) throw new NotFoundException('Doctor not found');
    const { passwordHash: _pw, mfaSecret: _mfa, ...safe } = doc as any;
    return safe;
  }

  async register(dto: any) {
    const existing = await this.prisma.doctorRegistry.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already registered on Ayphen Doctor Registry');
    // Password is set by the doctor after verification email — use placeholder hash until then
    const rawPwd = dto.password || ('Pending@' + Math.random().toString(36).slice(2, 12));
    const hash = await bcryptjs.hash(rawPwd, 10);
    const doc = await this.prisma.doctorRegistry.create({
      data: {
        email: dto.email, passwordHash: hash,
        firstName: dto.firstName, lastName: dto.lastName,
        phone: dto.phone, gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        primaryDegree: dto.primaryDegree,
        specialties: dto.specialties || [],
        subspecialties: dto.subspecialties || [],
        languages: dto.languages || [],
        medicalCouncil: dto.medicalCouncil,
        registrationNo: dto.registrationNo,
        registrationDate: new Date(dto.registrationDate),
        registrationExpiry: dto.registrationExpiry ? new Date(dto.registrationExpiry) : null,
        bio: dto.bio, ayphenStatus: 'PENDING',
      },
    });
    const { passwordHash: _pw, mfaSecret: _mfa, ...safe } = doc as any;
    return safe;
  }

  async updateDoctor(id: string, dto: any) {
    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.specialties !== undefined) data.specialties = dto.specialties;
    if (dto.subspecialties !== undefined) data.subspecialties = dto.subspecialties;
    if (dto.languages !== undefined) data.languages = dto.languages;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.ayphenStatus !== undefined) data.ayphenStatus = dto.ayphenStatus;
    if (dto.profilePictureUrl !== undefined) data.profilePictureUrl = dto.profilePictureUrl;
    return this.prisma.doctorRegistry.update({ where: { id }, data });
  }

  async getAffiliations(tenantId: string) {
    return this.prisma.doctorOrgAffiliation.findMany({
      where: { tenantId },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true, specialties: true, ayphenStatus: true } },
        location: { select: { id: true, locationCode: true, name: true } },
      },
    });
  }

  async addAffiliation(tenantId: string, dto: any) {
    return this.prisma.doctorOrgAffiliation.create({
      data: {
        tenantId, doctorId: dto.doctorId, locationId: dto.locationId,
        employmentType: dto.employmentType || 'VISITING',
        departmentName: dto.departmentName, designation: dto.designation,
        consultationFee: dto.consultationFee,
        availableDays: dto.availableDays || [],
        availableSlots: dto.availableSlots,
        slotDurationMinutes: dto.slotDurationMinutes || 15,
        maxPatientsPerDay: dto.maxPatientsPerDay || 30,
        isActive: true, status: 'ACTIVE',
      },
    });
  }

  async updateAffiliation(tenantId: string, affiliationId: string, dto: any) {
    const data: any = {};
    if (dto.designation !== undefined) data.designation = dto.designation;
    if (dto.departmentName !== undefined) data.departmentName = dto.departmentName;
    if (dto.consultationFee !== undefined) data.consultationFee = dto.consultationFee;
    if (dto.availableDays !== undefined) data.availableDays = dto.availableDays;
    if (dto.availableSlots !== undefined) data.availableSlots = dto.availableSlots;
    if (dto.slotDurationMinutes !== undefined) data.slotDurationMinutes = dto.slotDurationMinutes;
    if (dto.maxPatientsPerDay !== undefined) data.maxPatientsPerDay = dto.maxPatientsPerDay;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.employmentType !== undefined) data.employmentType = dto.employmentType;
    return this.prisma.doctorOrgAffiliation.update({ where: { id: affiliationId }, data });
  }

  async getDoctorsByLocation(tenantId: string, locationId: string) {
    return this.prisma.doctorOrgAffiliation.findMany({
      where: { tenantId, locationId, isActive: true },
      include: { doctor: { select: { id: true, firstName: true, lastName: true, specialties: true, bio: true } } },
    });
  }
}
