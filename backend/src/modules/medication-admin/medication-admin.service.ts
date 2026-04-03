import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MedicationAdminService {
  constructor(private prisma: PrismaService) {}

  async getMARForAdmission(tenantId: string, admissionId: string) {
    return this.prisma.medicationAdministration.findMany({
      where: { tenantId, admissionId },
      orderBy: { scheduledTime: 'asc' },
    });
  }

  async scheduleMedication(tenantId: string, dto: any) {
    return this.prisma.medicationAdministration.create({
      data: {
        tenantId, locationId: dto.locationId,
        admissionId: dto.admissionId, patientId: dto.patientId,
        prescriptionItemId: dto.prescriptionItemId, drugName: dto.drugName,
        dosage: dto.dosage, route: dto.route, frequency: dto.frequency,
        scheduledTime: new Date(dto.scheduledTime), status: 'SCHEDULED',
      },
    });
  }

  async recordAdministration(tenantId: string, id: string, dto: any, administeredById: string) {
    return this.prisma.$transaction(async (tx) => {
      const mar = await tx.medicationAdministration.findFirst({ where: { id, tenantId } });
      if (!mar) throw new NotFoundException('MAR record not found');
      return tx.medicationAdministration.update({
        where: { id },
        data: {
          status: dto.status,
          administeredTime: new Date(),
          administeredById,
          notes: dto.notes,
          withheldReason: dto.withheldReason,
        },
      });
    });
  }

  async getPendingForNurse(tenantId: string, locationId: string) {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 60 * 1000);
    const to = new Date(now.getTime() + 60 * 60 * 1000);
    return this.prisma.medicationAdministration.findMany({
      where: { tenantId, locationId, status: 'SCHEDULED', scheduledTime: { gte: from, lte: to } },
      orderBy: { scheduledTime: 'asc' },
    });
  }
}
