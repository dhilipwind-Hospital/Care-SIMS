import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class MortuaryService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.prisma.mortuaryRecord.findMany({ where, orderBy: { receivedAt: 'desc' }, take: 500 });
  }

  async create(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'MortuaryRecord',
      idColumn: 'recordNumber',
      prefix: 'MRT-',
      tenantId,
      callback: async (tx, recordNumber) => {
        return tx.mortuaryRecord.create({
          data: {
            tenantId, locationId: dto.locationId, recordNumber,
            patientId: dto.patientId, admissionId: dto.admissionId, deceasedName: dto.deceasedName,
            age: dto.age, gender: dto.gender, dateOfDeath: new Date(dto.dateOfDeath), timeOfDeath: dto.timeOfDeath,
            causeOfDeath: dto.causeOfDeath, attendingDoctorId: dto.attendingDoctorId, pronouncedById: dto.pronouncedById,
            deathCertificateNo: dto.deathCertificateNo, unitNumber: dto.unitNumber,
            policeNotified: dto.policeNotified || false, autopsyRequired: dto.autopsyRequired || false,
            notes: dto.notes,
          },
        });
      },
    });
  }

  async get(tenantId: string, id: string) {
    const r = await this.prisma.mortuaryRecord.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Record not found');
    return r;
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.mortuaryRecord.findFirst({ where: { id, tenantId } });
      if (!r) throw new NotFoundException('Record not found');
      const data: any = {};
      if (dto.causeOfDeath !== undefined) data.causeOfDeath = dto.causeOfDeath;
      if (dto.notes !== undefined) data.notes = dto.notes;
      if (dto.storageLocation !== undefined) data.storageLocation = dto.storageLocation;
      if (dto.nextOfKinName !== undefined) data.nextOfKinName = dto.nextOfKinName;
      if (dto.nextOfKinPhone !== undefined) data.nextOfKinPhone = dto.nextOfKinPhone;
      if (dto.nextOfKinRelation !== undefined) data.nextOfKinRelation = dto.nextOfKinRelation;
      return tx.mortuaryRecord.update({ where: { id }, data });
    });
  }

  async release(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.mortuaryRecord.findFirst({ where: { id, tenantId } });
      if (!r) throw new NotFoundException('Record not found');
      return tx.mortuaryRecord.update({
        where: { id },
        data: { status: 'RELEASED', releasedAt: new Date(), releasedTo: dto.releasedTo, releasedToRelation: dto.releasedToRelation, releasedToId: dto.releasedToId },
      });
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.mortuaryRecord.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Record not found');
      if (record.status === 'RELEASED') throw new BadRequestException('Cannot delete released records');
      return tx.mortuaryRecord.delete({ where: { id } });
    });
  }

  async dashboard(tenantId: string) {
    const [inCustody, released, total] = await Promise.all([
      this.prisma.mortuaryRecord.count({ where: { tenantId, status: 'IN_CUSTODY' } }),
      this.prisma.mortuaryRecord.count({ where: { tenantId, status: 'RELEASED' } }),
      this.prisma.mortuaryRecord.count({ where: { tenantId } }),
    ]);
    return { inCustody, released, total };
  }
}
