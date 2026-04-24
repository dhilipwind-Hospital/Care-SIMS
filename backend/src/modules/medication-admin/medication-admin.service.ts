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

  // ── Barcode Verification ──

  async verifyMedicationBarcode(tenantId: string, dto: { marId: string; drugBarcode: string; patientBarcode: string }) {
    const mar = await this.prisma.medicationAdministration.findFirst({ where: { id: dto.marId, tenantId } });
    if (!mar) throw new NotFoundException('MAR record not found');

    const errors: string[] = [];

    // Verify drug barcode matches the scheduled drug
    // In production this would look up a drug barcode database.
    // For now, we check if the drug barcode matches any batch of the scheduled drug.
    if (dto.drugBarcode) {
      const batch = await this.prisma.drugBatch.findFirst({
        where: { barcode: dto.drugBarcode, tenantId },
      });
      const drug = batch ? await this.prisma.drug.findUnique({ where: { id: batch.drugId } }) : null;
      if (!batch || !drug) {
        errors.push(`Drug barcode "${dto.drugBarcode}" not found in inventory`);
      } else {
        const drugLabel = drug.brandName || drug.genericName;
        if (drugLabel.toLowerCase() !== mar.drugName.toLowerCase() && drug.genericName.toLowerCase() !== mar.drugName.toLowerCase()) {
          errors.push(`WRONG DRUG: Scanned "${drugLabel}" but scheduled "${mar.drugName}"`);
        } else if (batch.expiryDate && batch.expiryDate < new Date()) {
          errors.push(`EXPIRED: ${drugLabel} batch expired ${batch.expiryDate.toLocaleDateString()}`);
        }
      }
    }

    // Verify patient barcode matches the patient on this MAR entry
    if (dto.patientBarcode) {
      const patient = await this.prisma.patient.findFirst({
        where: { tenantId, OR: [{ patientId: dto.patientBarcode }, { id: dto.patientBarcode }] },
      });
      if (!patient) {
        errors.push(`Patient barcode "${dto.patientBarcode}" not found`);
      } else if (patient.id !== mar.patientId) {
        errors.push(`WRONG PATIENT: Scanned patient does not match scheduled patient`);
      }
    }

    return {
      verified: errors.length === 0,
      errors,
      marId: dto.marId,
      drugName: mar.drugName,
      dosage: mar.dosage,
      route: mar.route,
      scheduledTime: mar.scheduledTime,
    };
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
