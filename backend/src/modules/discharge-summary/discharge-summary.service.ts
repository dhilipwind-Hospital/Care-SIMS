import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DischargeSummaryService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, filters: { locationId?: string; status?: string; patientId?: string }) {
    const where: any = { tenantId };
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patientId = filters.patientId;
    return this.prisma.dischargeSummary.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async create(tenantId: string, userId: string, dto: any) {
    const existing = await this.prisma.dischargeSummary.findUnique({
      where: { tenantId_admissionId: { tenantId, admissionId: dto.admissionId } },
    });
    if (existing) throw new BadRequestException('Discharge summary already exists for this admission');
    return this.prisma.dischargeSummary.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        admissionId: dto.admissionId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        admissionDate: new Date(dto.admissionDate),
        dischargeDate: dto.dischargeDate ? new Date(dto.dischargeDate) : null,
        diagnosisOnAdmission: dto.diagnosisOnAdmission,
        diagnosisOnDischarge: dto.diagnosisOnDischarge,
        proceduresPerformed: dto.proceduresPerformed,
        treatmentGiven: dto.treatmentGiven,
        investigationSummary: dto.investigationSummary,
        conditionAtDischarge: dto.conditionAtDischarge,
        dischargeMedications: dto.dischargeMedications,
        followUpInstructions: dto.followUpInstructions,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        dietaryAdvice: dto.dietaryAdvice,
        activityRestrictions: dto.activityRestrictions,
        status: 'DRAFT',
        preparedById: userId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const rec = await this.prisma.dischargeSummary.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Discharge summary not found');
    if (rec.status === 'APPROVED') throw new BadRequestException('Cannot edit approved discharge summary');
    const { id: _, tenantId: __, ...data } = dto;
    if (data.dischargeDate) data.dischargeDate = new Date(data.dischargeDate);
    if (data.followUpDate) data.followUpDate = new Date(data.followUpDate);
    return this.prisma.dischargeSummary.update({ where: { id }, data });
  }

  async approve(tenantId: string, id: string, userId: string) {
    const rec = await this.prisma.dischargeSummary.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Discharge summary not found');
    return this.prisma.dischargeSummary.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async getByAdmission(tenantId: string, admissionId: string) {
    return this.prisma.dischargeSummary.findUnique({
      where: { tenantId_admissionId: { tenantId, admissionId } },
    });
  }

  async getOne(tenantId: string, id: string) {
    const rec = await this.prisma.dischargeSummary.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Discharge summary not found');
    return rec;
  }
}
