import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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

  async updateAffiliation(tenantId: string, affiliationId: string, dto: any, opts?: { actorDoctorId?: string }) {
    // Tenant scoping: row must belong to this tenant.
    const row = await this.prisma.doctorOrgAffiliation.findFirst({ where: { id: affiliationId, tenantId } });
    if (!row) throw new NotFoundException('Affiliation not found');
    // When a doctor edits their OWN row, they can only edit availability-related
    // fields and only their own. Admin path (no actorDoctorId) skips this.
    if (opts?.actorDoctorId && row.doctorId !== opts.actorDoctorId) {
      throw new ForbiddenException('You can only edit your own availability');
    }
    const data: any = {};
    if (dto.designation !== undefined) data.designation = dto.designation;
    if (dto.departmentName !== undefined) data.departmentName = dto.departmentName;
    if (dto.consultationFee !== undefined) data.consultationFee = dto.consultationFee;
    if (dto.availableDays !== undefined) data.availableDays = dto.availableDays;
    if (dto.availableSlots !== undefined) data.availableSlots = dto.availableSlots;
    if (dto.slotDurationMinutes !== undefined) data.slotDurationMinutes = dto.slotDurationMinutes;
    if (dto.maxPatientsPerDay !== undefined) data.maxPatientsPerDay = dto.maxPatientsPerDay;
    // Doctor self-edit cannot deactivate themselves or change employment type — admin-only.
    if (!opts?.actorDoctorId) {
      if (dto.isActive !== undefined) data.isActive = dto.isActive;
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.employmentType !== undefined) data.employmentType = dto.employmentType;
    }
    return this.prisma.doctorOrgAffiliation.update({ where: { id: affiliationId }, data });
  }

  async getMyAffiliations(tenantId: string, doctorId: string) {
    return this.prisma.doctorOrgAffiliation.findMany({
      where: { tenantId, doctorId },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true, specialties: true, ayphenStatus: true } },
        location: { select: { id: true, locationCode: true, name: true } },
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        leaves: { where: { endDate: { gte: new Date() } }, orderBy: { startDate: 'asc' } },
      },
    });
  }

  // ─── Per-day schedule (DoctorSchedule) ────────────────────────────────
  // upsertSchedules replaces the entire weekly grid for an affiliation in a
  // single transaction. The frontend sends an array — we delete rows for
  // weekdays not in the payload and upsert the rest.
  async listSchedules(tenantId: string, affiliationId: string, opts?: { actorDoctorId?: string }) {
    const aff = await this.prisma.doctorOrgAffiliation.findFirst({ where: { id: affiliationId, tenantId } });
    if (!aff) throw new NotFoundException('Affiliation not found');
    if (opts?.actorDoctorId && aff.doctorId !== opts.actorDoctorId) {
      throw new ForbiddenException('You can only view your own schedule');
    }
    return this.prisma.doctorSchedule.findMany({
      where: { affiliationId, tenantId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async upsertSchedules(tenantId: string, affiliationId: string, rows: any[], opts?: { actorDoctorId?: string }) {
    const aff = await this.prisma.doctorOrgAffiliation.findFirst({ where: { id: affiliationId, tenantId } });
    if (!aff) throw new NotFoundException('Affiliation not found');
    if (opts?.actorDoctorId && aff.doctorId !== opts.actorDoctorId) {
      throw new ForbiddenException('You can only edit your own schedule');
    }
    const valid = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const safe = (rows || []).filter(r => valid.includes(r.dayOfWeek));
    return this.prisma.$transaction(async (tx) => {
      // Delete weekdays not in the payload (= doctor turned them off)
      const keepDays = safe.map(r => r.dayOfWeek);
      await tx.doctorSchedule.deleteMany({
        where: { affiliationId, tenantId, ...(keepDays.length ? { dayOfWeek: { notIn: keepDays } } : {}) },
      });
      // Upsert each kept day
      for (const r of safe) {
        await tx.doctorSchedule.upsert({
          where: { affiliationId_dayOfWeek: { affiliationId, dayOfWeek: r.dayOfWeek } },
          create: {
            affiliationId, tenantId, dayOfWeek: r.dayOfWeek,
            startTime: r.startTime || '09:00',
            endTime: r.endTime || '17:00',
            breakStart: r.breakStart || null,
            breakEnd: r.breakEnd || null,
            slotDurationMinutes: Number(r.slotDurationMinutes) || aff.slotDurationMinutes || 15,
            maxPatients: r.maxPatients != null ? Number(r.maxPatients) : null,
            isActive: r.isActive !== false,
          },
          update: {
            startTime: r.startTime || '09:00',
            endTime: r.endTime || '17:00',
            breakStart: r.breakStart || null,
            breakEnd: r.breakEnd || null,
            slotDurationMinutes: Number(r.slotDurationMinutes) || aff.slotDurationMinutes || 15,
            maxPatients: r.maxPatients != null ? Number(r.maxPatients) : null,
            isActive: r.isActive !== false,
          },
        });
      }
      // Mirror to legacy availableDays so existing slot logic keeps working
      await tx.doctorOrgAffiliation.update({
        where: { id: affiliationId },
        data: { availableDays: keepDays },
      });
      return tx.doctorSchedule.findMany({ where: { affiliationId, tenantId }, orderBy: { dayOfWeek: 'asc' } });
    });
  }

  // ─── Leave (DoctorLeave) ──────────────────────────────────────────────
  async listLeaves(tenantId: string, affiliationId: string, opts?: { actorDoctorId?: string; includePast?: boolean }) {
    const aff = await this.prisma.doctorOrgAffiliation.findFirst({ where: { id: affiliationId, tenantId } });
    if (!aff) throw new NotFoundException('Affiliation not found');
    if (opts?.actorDoctorId && aff.doctorId !== opts.actorDoctorId) {
      throw new ForbiddenException('You can only view your own leaves');
    }
    const where: any = { affiliationId, tenantId };
    if (!opts?.includePast) where.endDate = { gte: new Date() };
    return this.prisma.doctorLeave.findMany({ where, orderBy: { startDate: 'asc' } });
  }

  async addLeave(tenantId: string, affiliationId: string, dto: any, opts?: { actorDoctorId?: string }) {
    const aff = await this.prisma.doctorOrgAffiliation.findFirst({ where: { id: affiliationId, tenantId } });
    if (!aff) throw new NotFoundException('Affiliation not found');
    if (opts?.actorDoctorId && aff.doctorId !== opts.actorDoctorId) {
      throw new ForbiddenException('You can only add your own leaves');
    }
    if (!dto.startDate || !dto.endDate) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('endDate cannot be before startDate');
    return this.prisma.doctorLeave.create({
      data: {
        affiliationId, tenantId,
        startDate: start, endDate: end,
        reason: dto.reason || null,
        leaveType: dto.leaveType || 'LEAVE',
        status: 'APPROVED',
      },
    });
  }

  async deleteLeave(tenantId: string, leaveId: string, opts?: { actorDoctorId?: string }) {
    const row = await this.prisma.doctorLeave.findFirst({
      where: { id: leaveId, tenantId },
      include: { affiliation: { select: { doctorId: true } } },
    });
    if (!row) throw new NotFoundException('Leave not found');
    if (opts?.actorDoctorId && row.affiliation.doctorId !== opts.actorDoctorId) {
      throw new ForbiddenException('You can only delete your own leaves');
    }
    await this.prisma.doctorLeave.delete({ where: { id: leaveId } });
    return { ok: true };
  }

  async getDoctorsByLocation(tenantId: string, locationId: string) {
    return this.prisma.doctorOrgAffiliation.findMany({
      where: { tenantId, locationId, isActive: true },
      include: { doctor: { select: { id: true, firstName: true, lastName: true, specialties: true, bio: true } } },
    });
  }
}
