import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
        isPrn: dto.isPrn || false,
        prnReason: dto.prnReason || null,
        prnMaxDailyDoses: dto.prnMaxDailyDoses || null,
      },
    });
  }

  async schedulePrnDose(tenantId: string, dto: any, administeredById: string) {
    // Check daily PRN limit
    if (dto.prnMaxDailyDoses) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const todayCount = await this.prisma.medicationAdministration.count({
        where: {
          tenantId, admissionId: dto.admissionId, drugName: dto.drugName,
          isPrn: true, status: 'ADMINISTERED',
          administeredTime: { gte: today, lt: tomorrow },
        },
      });
      if (todayCount >= dto.prnMaxDailyDoses) {
        throw new BadRequestException(`PRN limit reached: ${dto.drugName} max ${dto.prnMaxDailyDoses} doses/day (${todayCount} given today)`);
      }
    }

    return this.prisma.medicationAdministration.create({
      data: {
        tenantId, locationId: dto.locationId,
        admissionId: dto.admissionId, patientId: dto.patientId,
        drugName: dto.drugName, dosage: dto.dosage, route: dto.route,
        frequency: 'PRN', scheduledTime: new Date(),
        administeredTime: new Date(), administeredById, status: 'ADMINISTERED',
        isPrn: true, prnReason: dto.prnReason || null,
        prnMaxDailyDoses: dto.prnMaxDailyDoses || null,
        notes: dto.notes,
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

  // ── Medication Reconciliation ──

  async createReconciliation(tenantId: string, userId: string, dto: any) {
    return this.prisma.medicationReconciliation.create({
      data: {
        tenantId, admissionId: dto.admissionId, patientId: dto.patientId,
        reconcType: dto.reconcType || 'ADMISSION',
        homeMedications: dto.homeMedications || [],
        hospitalMeds: dto.hospitalMeds || [],
        discrepancies: dto.discrepancies || [],
        reconciledById: userId, notes: dto.notes,
      },
    });
  }

  async getReconciliation(tenantId: string, admissionId: string) {
    return this.prisma.medicationReconciliation.findMany({
      where: { tenantId, admissionId },
      orderBy: { reconciledAt: 'desc' },
    });
  }
}
