import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConsentService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, patientId?: string, consentType?: string) {
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (consentType) where.consentType = consentType;
    return this.prisma.consentForm.findMany({ where, orderBy: { consentDate: 'desc' }, take: 500 });
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.consentForm.create({
      data: {
        tenantId, locationId: dto.locationId, patientId: dto.patientId, admissionId: dto.admissionId,
        consentType: dto.consentType, procedureName: dto.procedureName, description: dto.description,
        risks: dto.risks, alternatives: dto.alternatives, consentGivenBy: dto.consentGivenBy,
        relationship: dto.relationship, witnessName: dto.witnessName, witnessId: dto.witnessId,
        doctorId: dto.doctorId, doctorName: dto.doctorName, signatureUrl: dto.signatureUrl,
      },
    });
  }

  async get(tenantId: string, id: string) {
    const c = await this.prisma.consentForm.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Consent form not found');
    return c;
  }

  async update(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.consentForm.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Consent form not found');
      if (record.status !== 'ACTIVE' && record.status !== 'PENDING') throw new BadRequestException('Only ACTIVE or PENDING consents can be edited');
      return tx.consentForm.update({ where: { id }, data: { consentType: dto.consentType, procedureName: dto.procedureName, description: dto.description, risks: dto.risks, alternatives: dto.alternatives, consentGivenBy: dto.consentGivenBy, relationship: dto.relationship, witnessName: dto.witnessName } });
    });
  }

  async revoke(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.consentForm.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Consent form not found');
      return tx.consentForm.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: dto.reason } });
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const consent = await tx.consentForm.findFirst({ where: { id, tenantId } });
      if (!consent) throw new NotFoundException('Consent form not found');
      if (consent.status !== 'PENDING') throw new BadRequestException('Only PENDING consents can be deleted');
      await tx.consentForm.update({ where: { id }, data: { status: 'CANCELLED' } });
      return { message: 'Consent form deleted successfully' };
    });
  }

  async byPatient(tenantId: string, patientId: string) {
    return this.prisma.consentForm.findMany({ where: { tenantId, patientId }, orderBy: { consentDate: 'desc' }, take: 500 });
  }
}
