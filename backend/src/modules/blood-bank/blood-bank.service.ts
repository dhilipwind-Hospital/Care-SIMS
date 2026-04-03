import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class BloodBankService {
  constructor(private prisma: PrismaService) {}

  async listDonors(tenantId: string, bloodGroup?: string) {
    const where: any = { tenantId };
    if (bloodGroup) where.bloodGroup = bloodGroup;
    return this.prisma.bloodDonor.findMany({ where, orderBy: { createdAt: 'desc' } });
  }
  async addDonor(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'BloodDonor',
      idColumn: 'donorId',
      prefix: 'DNR-',
      tenantId,
      callback: async (tx, donorId) => {
        return tx.bloodDonor.create({ data: { tenantId, locationId: dto.locationId, donorId, firstName: dto.firstName, lastName: dto.lastName, dateOfBirth: new Date(dto.dateOfBirth), gender: dto.gender, bloodGroup: dto.bloodGroup, rhFactor: dto.rhFactor || 'POSITIVE', phone: dto.phone, email: dto.email, address: dto.address, nationalId: dto.nationalId } });
      },
    });
  }
  async getDonor(tenantId: string, id: string) {
    const d = await this.prisma.bloodDonor.findFirst({ where: { id, tenantId }, include: { donations: true } });
    if (!d) throw new NotFoundException('Donor not found');
    return d;
  }
  async recordDonation(tenantId: string, userId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'BloodDonation',
      idColumn: 'donationNumber',
      prefix: 'BLD-',
      tenantId,
      callback: async (tx, donationNumber) => {
        const donation = await tx.bloodDonation.create({ data: { tenantId, locationId: dto.locationId, donorId: dto.donorId, donationNumber, donationType: dto.donationType || 'VOLUNTARY', bagNumber: dto.bagNumber, bloodGroup: dto.bloodGroup, rhFactor: dto.rhFactor, hemoglobinGdl: dto.hemoglobinGdl, expiryDate: new Date(dto.expiryDate), collectedById: userId, status: 'COLLECTED' } });
        await tx.bloodDonor.update({ where: { id: dto.donorId }, data: { lastDonationDate: new Date(), totalDonations: { increment: 1 } } });
        return donation;
      },
    });
  }
  async listInventory(tenantId: string, bloodGroup?: string, status?: string) {
    const where: any = { tenantId };
    if (bloodGroup) where.bloodGroup = bloodGroup;
    if (status) where.status = status;
    return this.prisma.bloodInventory.findMany({ where, orderBy: { expiryDate: 'asc' } });
  }
  async inventorySummary(tenantId: string) {
    const inv = await this.prisma.bloodInventory.findMany({ where: { tenantId, status: 'AVAILABLE' } });
    const groups: Record<string, number> = {};
    inv.forEach(i => { const key = `${i.bloodGroup}${i.rhFactor === 'POSITIVE' ? '+' : '-'}`; groups[key] = (groups[key] || 0) + 1; });
    return { total: inv.length, byGroup: groups };
  }
  async listTransfusions(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.prisma.bloodTransfusion.findMany({ where, orderBy: { createdAt: 'desc' } });
  }
  async orderTransfusion(tenantId: string, dto: any) {
    return this.prisma.bloodTransfusion.create({ data: { tenantId, locationId: dto.locationId, patientId: dto.patientId, admissionId: dto.admissionId, bagNumber: dto.bagNumber, component: dto.component, bloodGroup: dto.bloodGroup, rhFactor: dto.rhFactor, volumeMl: dto.volumeMl, orderedById: dto.orderedById, status: 'ORDERED' } });
  }
  async crossMatch(tenantId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.bloodTransfusion.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Blood transfusion not found');
      return tx.bloodTransfusion.update({ where: { id }, data: { crossMatchVerified: true, crossMatchById: userId, status: 'CROSS_MATCHED' } });
    });
  }
  async administer(tenantId: string, id: string, userId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.bloodTransfusion.findFirst({ where: { id, tenantId } });
      if (!record) throw new NotFoundException('Blood transfusion not found');
      return tx.bloodTransfusion.update({ where: { id }, data: { administeredById: userId, startTime: new Date(), status: 'ADMINISTERING', reaction: dto.reaction, reactionDetails: dto.reactionDetails } });
    });
  }
}
