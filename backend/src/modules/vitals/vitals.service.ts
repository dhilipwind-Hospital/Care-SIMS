import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VitalsService {
  constructor(private prisma: PrismaService) {}

  async record(tenantId: string, dto: any, recordedById: string) {
    // Auto-resolve locationId from user's primary location if not provided
    let locationId = dto.locationId;
    if (!locationId) {
      const user = await this.prisma.tenantUser.findUnique({ where: { id: recordedById }, select: { primaryLocationId: true } });
      locationId = user?.primaryLocationId;
    }
    return this.prisma.vital.create({
      data: {
        tenantId, locationId, patientId: dto.patientId,
        consultationId: dto.consultationId, admissionId: dto.admissionId,
        temperatureC: dto.temperatureC,
        systolicBp: dto.systolicBp, diastolicBp: dto.diastolicBp,
        heartRate: dto.heartRate, respiratoryRate: dto.respiratoryRate,
        spo2: dto.spo2, weightKg: dto.weightKg,
        heightCm: dto.heightCm, bloodGlucoseMg: dto.bloodGlucoseMg,
        gcs: dto.gcs, painScore: dto.painScore, notes: dto.notes,
        hasAbnormal: dto.hasAbnormal || false, abnormalFields: dto.abnormalFields || [],
        recordedById,
      },
    });
  }

  async getForPatient(tenantId: string, patientId: string, limit = 20) {
    return this.prisma.vital.findMany({ where: { tenantId, patientId }, orderBy: { recordedAt: 'desc' }, take: Number(limit) });
  }

  async getForConsultation(tenantId: string, consultationId: string) {
    return this.prisma.vital.findMany({ where: { tenantId, consultationId }, orderBy: { recordedAt: 'asc' } });
  }

  async getForAdmission(tenantId: string, admissionId: string) {
    return this.prisma.vital.findMany({ where: { tenantId, admissionId }, orderBy: { recordedAt: 'asc' } });
  }
}
