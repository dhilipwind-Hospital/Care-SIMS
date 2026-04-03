import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}
  async listPolicies(tenantId: string, patientId?: string) {
    const where: any = { tenantId }; if (patientId) where.patientId = patientId;
    return this.prisma.insurancePolicy.findMany({ where, orderBy: { createdAt: 'desc' } });
  }
  async addPolicy(tenantId: string, dto: any) {
    return this.prisma.insurancePolicy.create({ data: { tenantId, patientId: dto.patientId, providerName: dto.providerName, policyNumber: dto.policyNumber, groupNumber: dto.groupNumber, tpaName: dto.tpaName, planType: dto.planType, coverageAmount: dto.coverageAmount, copayPercent: dto.copayPercent||0, deductible: dto.deductible||0, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), primaryInsured: dto.primaryInsured, relationship: dto.relationship } });
  }
  async getPolicy(tenantId: string, id: string) { const p = await this.prisma.insurancePolicy.findFirst({ where: { id, tenantId }, include: { claims: true } }); if (!p) throw new NotFoundException('Policy not found'); return p; }
  async updatePolicy(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const p = await tx.insurancePolicy.findFirst({ where: { id, tenantId }, include: { claims: true } });
      if (!p) throw new NotFoundException('Policy not found');
      const data: any = {};
      if (dto.providerName !== undefined) data.providerName = dto.providerName;
      if (dto.policyNumber !== undefined) data.policyNumber = dto.policyNumber;
      if (dto.groupNumber !== undefined) data.groupNumber = dto.groupNumber;
      if (dto.tpaName !== undefined) data.tpaName = dto.tpaName;
      if (dto.planType !== undefined) data.planType = dto.planType;
      if (dto.coverageAmount !== undefined) data.coverageAmount = dto.coverageAmount;
      if (dto.copayPercent !== undefined) data.copayPercent = dto.copayPercent;
      if (dto.deductible !== undefined) data.deductible = dto.deductible;
      if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
      if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
      if (dto.status !== undefined) data.status = dto.status;
      return tx.insurancePolicy.update({ where: { id }, data });
    });
  }
  async listClaims(tenantId: string, status?: string) {
    const where: any = { tenantId }; if (status) where.status = status;
    return this.prisma.insuranceClaim.findMany({ where, include: { policy: true }, orderBy: { createdAt: 'desc' } });
  }
  async addClaim(tenantId: string, userId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'InsuranceClaim',
      idColumn: 'claimNumber',
      prefix: 'CLM-',
      tenantId,
      callback: async (tx, claimNumber) => {
        return tx.insuranceClaim.create({ data: { tenantId, claimNumber, policyId: dto.policyId, patientId: dto.patientId, admissionId: dto.admissionId, invoiceId: dto.invoiceId, claimType: dto.claimType, preAuthCode: dto.preAuthCode, preAuthAmount: dto.preAuthAmount, claimAmount: dto.claimAmount, processedById: userId, status: 'DRAFT' } });
      },
    });
  }
  async updateClaim(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.insuranceClaim.findFirst({ where: { id, tenantId } });
      if (!claim) throw new NotFoundException('Claim not found');
      const data: any = {};
      if (dto.claimType !== undefined) data.claimType = dto.claimType;
      if (dto.claimAmount !== undefined) data.claimAmount = dto.claimAmount;
      if (dto.preAuthCode !== undefined) data.preAuthCode = dto.preAuthCode;
      if (dto.preAuthAmount !== undefined) data.preAuthAmount = dto.preAuthAmount;
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.rejectionReason !== undefined) data.rejectionReason = dto.rejectionReason;
      return tx.insuranceClaim.update({ where: { id }, data });
    });
  }
  async submitClaim(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.insuranceClaim.findFirst({ where: { id, tenantId } });
      if (!c) throw new NotFoundException('Claim not found');
      return tx.insuranceClaim.update({ where: { id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
    });
  }
  async approveClaim(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.insuranceClaim.findFirst({ where: { id, tenantId } });
      if (!c) throw new NotFoundException('Claim not found');
      return tx.insuranceClaim.update({ where: { id }, data: { status: 'APPROVED', approvedAmount: dto.approvedAmount, approvedAt: new Date() } });
    });
  }
}
