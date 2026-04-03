import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class DialysisService {
  constructor(private prisma: PrismaService) {}

  async listMachines(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.prisma.dialysisMachine.findMany({ where, orderBy: { machineNumber: 'asc' } });
  }

  async addMachine(tenantId: string, dto: any) {
    return this.prisma.dialysisMachine.create({
      data: { tenantId, locationId: dto.locationId, machineNumber: dto.machineNumber, brand: dto.brand, model: dto.model, serialNumber: dto.serialNumber, lastServiceDate: dto.lastServiceDate ? new Date(dto.lastServiceDate) : undefined, nextServiceDate: dto.nextServiceDate ? new Date(dto.nextServiceDate) : undefined },
    });
  }

  async updateMachine(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.dialysisMachine.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Machine not found');
      const data: any = {};
      if (dto.machineNumber !== undefined) data.machineNumber = dto.machineNumber;
      if (dto.brand !== undefined) data.brand = dto.brand;
      if (dto.model !== undefined) data.model = dto.model;
      if (dto.serialNumber !== undefined) data.serialNumber = dto.serialNumber;
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;
      if (dto.lastServiceDate !== undefined) data.lastServiceDate = dto.lastServiceDate ? new Date(dto.lastServiceDate) : null;
      if (dto.nextServiceDate !== undefined) data.nextServiceDate = dto.nextServiceDate ? new Date(dto.nextServiceDate) : null;
      return tx.dialysisMachine.update({ where: { id }, data });
    });
  }

  async listSessions(tenantId: string, date?: string, status?: string) {
    const where: any = { tenantId };
    if (date) where.scheduledDate = new Date(date);
    if (status) where.status = status;
    return this.prisma.dialysisSession.findMany({ where, include: { machine: true }, orderBy: { scheduledDate: 'desc' } });
  }

  async createSession(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'DialysisSession',
      idColumn: 'sessionNumber',
      prefix: 'DLY-',
      tenantId,
      callback: async (tx, sessionNumber) => {
        return tx.dialysisSession.create({
          data: {
            tenantId, locationId: dto.locationId, sessionNumber,
            patientId: dto.patientId, doctorId: dto.doctorId, machineId: dto.machineId, admissionId: dto.admissionId,
            dialysisType: dto.dialysisType || 'HEMODIALYSIS', scheduledDate: new Date(dto.scheduledDate),
            scheduledTime: dto.scheduledTime, durationMinutes: dto.durationMinutes || 240,
            accessType: dto.accessType, dialyzerType: dto.dialyzerType, dryWeightKg: dto.dryWeightKg,
          },
        });
      },
    });
  }

  async getSession(tenantId: string, id: string) {
    const s = await this.prisma.dialysisSession.findFirst({ where: { id, tenantId }, include: { machine: true } });
    if (!s) throw new NotFoundException('Session not found');
    return s;
  }

  async startSession(tenantId: string, id: string, nurseId: string) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.dialysisSession.findFirst({ where: { id, tenantId } });
      if (!session) throw new NotFoundException('Session not found');
      await tx.dialysisMachine.update({ where: { id: session.machineId }, data: { status: 'IN_USE' } });
      return tx.dialysisSession.update({ where: { id }, data: { status: 'IN_PROGRESS', nurseId, startedAt: new Date() } });
    });
  }

  async endSession(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.dialysisSession.findFirst({ where: { id, tenantId }, include: { machine: true } });
      if (!session) throw new NotFoundException('Session not found');
      await tx.dialysisMachine.update({ where: { id: session.machineId }, data: { status: 'AVAILABLE' } });
      return tx.dialysisSession.update({
        where: { id },
        data: { status: 'COMPLETED', endedAt: new Date(), postWeightKg: dto.postWeightKg, postBp: dto.postBp, ufAchievedMl: dto.ufAchievedMl, complications: dto.complications || [], notes: dto.notes },
      });
    });
  }

  async dashboard(tenantId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const [todaySessions, machines, inProgress] = await Promise.all([
      this.prisma.dialysisSession.count({ where: { tenantId, scheduledDate: { gte: today, lt: tomorrow } } }),
      this.prisma.dialysisMachine.findMany({ where: { tenantId, isActive: true } }),
      this.prisma.dialysisSession.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
    ]);
    return { todaySessions, totalMachines: machines.length, available: machines.filter(m => m.status === 'AVAILABLE').length, inProgress };
  }
}
