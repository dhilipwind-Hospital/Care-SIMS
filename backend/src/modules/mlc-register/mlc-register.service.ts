import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class MlcRegisterService {
  constructor(private prisma: PrismaService) {}

  async register(tenantId: string, dto: any, userId: string) { return generateSequentialId(this.prisma, { table: 'MlcRecord', idColumn: 'mlcNumber', prefix: `MLC-${new Date().getFullYear()}-`, tenantId, padLength: 5, callback: async (tx, mlcNumber) => tx.mlcRecord.create({ data: { tenantId, mlcNumber, patientId: dto.patientId, dateTime: dto.dateTime ? new Date(dto.dateTime) : new Date(), broughtBy: dto.broughtBy || 'SELF', policeStation: dto.policeStation, firNumber: dto.firNumber, firDate: dto.firDate ? new Date(dto.firDate) : null, firSection: dto.firSection, natureOfInjury: dto.natureOfInjury, weaponUsed: dto.weaponUsed, circumstance: dto.circumstance, attendingDoctorId: dto.attendingDoctorId, informedPolice: dto.informedPolice || false, notes: dto.notes, createdById: userId } }) }); }

  async getAll(tenantId: string, query: any) { const { status, page = 1, limit = 20 } = query; const where: any = { tenantId }; if (status) where.status = status; const [data, total] = await Promise.all([this.prisma.mlcRecord.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { createdAt: 'desc' } }), this.prisma.mlcRecord.count({ where })]); return { data, meta: { total, page: Number(page), limit: Number(limit) } }; }

  async getOne(tenantId: string, id: string) { const r = await this.prisma.mlcRecord.findFirst({ where: { id, tenantId } }); if (!r) throw new NotFoundException('Not found'); return r; }

  async update(tenantId: string, id: string, dto: any) { const r = await this.prisma.mlcRecord.findFirst({ where: { id, tenantId } }); if (!r) throw new NotFoundException('Not found'); const data: any = {}; ['informedPolice', 'informedAt', 'status', 'woundCertificateId', 'notes'].forEach(k => { if (dto[k] !== undefined) data[k] = dto[k]; }); if (dto.informedPolice && !r.informedAt) data.informedAt = new Date(); return this.prisma.mlcRecord.update({ where: { id }, data }); }
}
