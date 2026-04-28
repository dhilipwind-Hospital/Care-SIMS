import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class MrdService {
  constructor(private prisma: PrismaService) {}

  async createFile(tenantId: string, dto: any) { return generateSequentialId(this.prisma, { table: 'MedicalRecordFile', idColumn: 'fileNumber', prefix: `MRD-${new Date().getFullYear()}-`, tenantId, padLength: 6, callback: async (tx, fileNumber) => tx.medicalRecordFile.create({ data: { tenantId, patientId: dto.patientId, fileNumber, currentLocation: 'RECORDS_ROOM' } }) }); }

  async getFiles(tenantId: string, query: any) { const { patientId, location, incomplete, page = 1, limit = 20 } = query; const where: any = { tenantId }; if (patientId) where.patientId = patientId; if (location) where.currentLocation = location; if (incomplete === 'true') where.incompleteNotes = true; const [data, total] = await Promise.all([this.prisma.medicalRecordFile.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { createdAt: 'desc' } }), this.prisma.medicalRecordFile.count({ where })]); return { data, meta: { total, page: Number(page), limit: Number(limit) } }; }

  async checkOut(tenantId: string, id: string, dto: any, userId: string) { const f = await this.prisma.medicalRecordFile.findFirst({ where: { id, tenantId } }); if (!f) throw new NotFoundException('Not found'); return this.prisma.medicalRecordFile.update({ where: { id }, data: { currentLocation: dto.department || dto.currentLocation, checkedOutById: userId, checkedOutAt: new Date(), returnedAt: null } }); }

  async checkIn(tenantId: string, id: string) { const f = await this.prisma.medicalRecordFile.findFirst({ where: { id, tenantId } }); if (!f) throw new NotFoundException('Not found'); return this.prisma.medicalRecordFile.update({ where: { id }, data: { currentLocation: 'RECORDS_ROOM', returnedAt: new Date() } }); }

  async updateCoding(tenantId: string, id: string, dto: any, userId: string) { const f = await this.prisma.medicalRecordFile.findFirst({ where: { id, tenantId } }); if (!f) throw new NotFoundException('Not found'); const data: any = {}; if (dto.icdCodes !== undefined) data.icdCodes = dto.icdCodes; if (dto.codingComplete !== undefined) { data.codingComplete = dto.codingComplete; if (dto.codingComplete) { data.codedById = userId; data.codedAt = new Date(); } } if (dto.incompleteNotes !== undefined) data.incompleteNotes = dto.incompleteNotes; return this.prisma.medicalRecordFile.update({ where: { id }, data }); }

  async dashboard(tenantId: string) { const [total, checkedOut, incomplete, uncoded] = await Promise.all([this.prisma.medicalRecordFile.count({ where: { tenantId } }), this.prisma.medicalRecordFile.count({ where: { tenantId, currentLocation: { not: 'RECORDS_ROOM' } } }), this.prisma.medicalRecordFile.count({ where: { tenantId, incompleteNotes: true } }), this.prisma.medicalRecordFile.count({ where: { tenantId, codingComplete: false } })]); return { total, checkedOut, incomplete, uncoded }; }
}
