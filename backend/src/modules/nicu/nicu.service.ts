import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NicuService {
  constructor(private prisma: PrismaService) {}

  async admit(tenantId: string, dto: any) { return this.prisma.nicuAdmission.create({ data: { tenantId, patientId: dto.patientId, motherPatientId: dto.motherPatientId, gestationalWeeks: dto.gestationalWeeks, birthWeightGrams: dto.birthWeightGrams, currentWeightGrams: dto.birthWeightGrams, apgar1min: dto.apgar1min, apgar5min: dto.apgar5min, diagnosis: dto.diagnosis, feedType: dto.feedType, ventilatorSupport: dto.ventilatorSupport || 'NONE', icuBedId: dto.icuBedId, notes: dto.notes } }); }

  async getAdmissions(tenantId: string, query: any) {
    const { status, page = 1, limit = 20 } = query;
    const where: any = { tenantId }; if (status) where.status = status;
    const [data, total] = await Promise.all([this.prisma.nicuAdmission.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { admissionDate: 'desc' } }), this.prisma.nicuAdmission.count({ where })]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getOne(tenantId: string, id: string) { const a = await this.prisma.nicuAdmission.findFirst({ where: { id, tenantId } }); if (!a) throw new NotFoundException('Not found'); return a; }

  async update(tenantId: string, id: string, dto: any) { const a = await this.prisma.nicuAdmission.findFirst({ where: { id, tenantId } }); if (!a) throw new NotFoundException('Not found'); const data: any = {}; ['currentWeightGrams', 'feedType', 'feedVolumeMl', 'phototherapy', 'ventilatorSupport', 'status', 'dischargeDate', 'dischargeWeight', 'notes'].forEach(k => { if (dto[k] !== undefined) data[k] = dto[k]; }); if (dto.status === 'DISCHARGED') data.dischargeDate = new Date(); return this.prisma.nicuAdmission.update({ where: { id }, data }); }

  async addDailyRecord(tenantId: string, dto: any, userId: string) { return this.prisma.nicuDailyRecord.create({ data: { tenantId, nicuAdmissionId: dto.nicuAdmissionId, weightGrams: dto.weightGrams, feedType: dto.feedType, feedVolumeMl: dto.feedVolumeMl, feedFrequency: dto.feedFrequency, urineOutput: dto.urineOutput, stoolCount: dto.stoolCount, bilirubinLevel: dto.bilirubinLevel, phototherapy: dto.phototherapy || false, oxygenSupport: dto.oxygenSupport, temperature: dto.temperature, heartRate: dto.heartRate, spo2: dto.spo2, apneaEpisodes: dto.apneaEpisodes, notes: dto.notes, recordedById: userId } }); }

  async getDailyRecords(tenantId: string, admissionId: string) { return this.prisma.nicuDailyRecord.findMany({ where: { tenantId, nicuAdmissionId: admissionId }, orderBy: { recordDate: 'desc' } }); }

  async dashboard(tenantId: string) { const active = await this.prisma.nicuAdmission.count({ where: { tenantId, status: 'ACTIVE' } }); const total = await this.prisma.nicuAdmission.count({ where: { tenantId } }); return { active, total, discharged: total - active }; }
}
