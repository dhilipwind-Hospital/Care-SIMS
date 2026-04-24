import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BirthDeathService {
  constructor(private prisma: PrismaService) {}

  // ── Birth Registry ──

  async registerBirth(tenantId: string, dto: any, userId: string) {
    return this.prisma.birthRecord.create({
      data: {
        tenantId, locationId: dto.locationId, motherPatientId: dto.motherPatientId,
        fatherName: dto.fatherName, dateOfBirth: new Date(dto.dateOfBirth),
        timeOfBirth: dto.timeOfBirth, gender: dto.gender,
        weightGrams: dto.weightGrams, lengthCm: dto.lengthCm,
        apgarScore1min: dto.apgarScore1min, apgarScore5min: dto.apgarScore5min,
        deliveryType: dto.deliveryType || 'NORMAL', birthOrder: dto.birthOrder || 'SINGLE',
        attendingDoctorId: dto.attendingDoctorId, registrationNumber: dto.registrationNumber,
        notes: dto.notes, createdById: userId,
      },
    });
  }

  async getBirths(tenantId: string, query: any) {
    const { from, to, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (from || to) { where.dateOfBirth = {}; if (from) where.dateOfBirth.gte = new Date(from); if (to) where.dateOfBirth.lte = new Date(to); }
    const [data, total] = await Promise.all([
      this.prisma.birthRecord.findMany({ where, skip, take: Number(limit), orderBy: { dateOfBirth: 'desc' } }),
      this.prisma.birthRecord.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getBirth(tenantId: string, id: string) {
    const r = await this.prisma.birthRecord.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Birth record not found');
    return r;
  }

  async updateBirth(tenantId: string, id: string, dto: any) {
    const r = await this.prisma.birthRecord.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Birth record not found');
    const data: any = {};
    if (dto.registrationNumber !== undefined) data.registrationNumber = dto.registrationNumber;
    if (dto.birthCertIssued !== undefined) data.birthCertIssued = dto.birthCertIssued;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.fatherName !== undefined) data.fatherName = dto.fatherName;
    return this.prisma.birthRecord.update({ where: { id }, data });
  }

  // ── Death Registry ──

  async registerDeath(tenantId: string, dto: any, userId: string) {
    return this.prisma.deathRecord.create({
      data: {
        tenantId, locationId: dto.locationId, patientId: dto.patientId,
        dateOfDeath: new Date(dto.dateOfDeath), timeOfDeath: dto.timeOfDeath,
        causeOfDeath: dto.causeOfDeath, icdCode: dto.icdCode,
        mannerOfDeath: dto.mannerOfDeath || 'NATURAL',
        attendingDoctorId: dto.attendingDoctorId, registrationNumber: dto.registrationNumber,
        postMortemRequired: dto.postMortemRequired || false,
        notes: dto.notes, createdById: userId,
      },
    });
  }

  async getDeaths(tenantId: string, query: any) {
    const { from, to, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (from || to) { where.dateOfDeath = {}; if (from) where.dateOfDeath.gte = new Date(from); if (to) where.dateOfDeath.lte = new Date(to); }
    const [data, total] = await Promise.all([
      this.prisma.deathRecord.findMany({ where, skip, take: Number(limit), orderBy: { dateOfDeath: 'desc' } }),
      this.prisma.deathRecord.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getDeath(tenantId: string, id: string) {
    const r = await this.prisma.deathRecord.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Death record not found');
    return r;
  }

  async updateDeath(tenantId: string, id: string, dto: any) {
    const r = await this.prisma.deathRecord.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Death record not found');
    const data: any = {};
    if (dto.registrationNumber !== undefined) data.registrationNumber = dto.registrationNumber;
    if (dto.deathCertIssued !== undefined) data.deathCertIssued = dto.deathCertIssued;
    if (dto.postMortemDone !== undefined) data.postMortemDone = dto.postMortemDone;
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.prisma.deathRecord.update({ where: { id }, data });
  }

  // ── Dashboard ──

  async dashboard(tenantId: string, query: any) {
    const { from, to } = query;
    const where: any = { tenantId };
    const birthWhere: any = { tenantId };
    const deathWhere: any = { tenantId };
    if (from || to) {
      if (from) { birthWhere.dateOfBirth = { gte: new Date(from) }; deathWhere.dateOfDeath = { gte: new Date(from) }; }
      if (to) { birthWhere.dateOfBirth = { ...birthWhere.dateOfBirth, lte: new Date(to) }; deathWhere.dateOfDeath = { ...deathWhere.dateOfDeath, lte: new Date(to) }; }
    }
    const [totalBirths, totalDeaths, birthsByGender, birthsByType] = await Promise.all([
      this.prisma.birthRecord.count({ where: birthWhere }),
      this.prisma.deathRecord.count({ where: deathWhere }),
      this.prisma.birthRecord.groupBy({ by: ['gender'], where: birthWhere, _count: true }),
      this.prisma.birthRecord.groupBy({ by: ['deliveryType'], where: birthWhere, _count: true }),
    ]);
    return { totalBirths, totalDeaths, birthsByGender, birthsByType };
  }
}
