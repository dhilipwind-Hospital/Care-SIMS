import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    const validity = new Date(); validity.setDate(validity.getDate() + 30);
    return generateSequentialId(this.prisma, {
      table: 'Prescription',
      idColumn: 'rxNumber',
      prefix: `RX-${Date.now()}-`,
      tenantId,
      padLength: 5,
      callback: async (tx, rxNumber) => {
        return tx.prescription.create({
          data: { tenantId, rxNumber, locationId: dto.locationId, consultationId: dto.consultationId, patientId: dto.patientId, doctorId: dto.doctorId, validityDate: validity, notes: dto.notes, status: 'PENDING', items: { create: dto.items.map((item: any, i: number) => ({ drugName: item.drugName, genericName: item.genericName, dosageForm: item.dosageForm, strength: item.strength, dosage: item.dosage, frequency: item.frequency, durationDays: item.durationDays, route: item.route, instructions: item.instructions, quantity: item.quantity, refillsAllowed: item.refillsAllowed || 0, isControlled: item.isControlled || false, status: 'PENDING', sortOrder: i })) } },
          include: { items: true, patient: { select: { patientId: true, firstName: true, lastName: true } } },
        });
      },
    });
  }

  async findAll(tenantId: string, query: any) {
    const { patientId, doctorId, status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({ where, skip, take: Number(limit), orderBy: { issuedAt: 'desc' }, include: { items: true, patient: { select: { patientId: true, firstName: true, lastName: true } } } }),
      this.prisma.prescription.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const rx = await this.prisma.prescription.findFirst({ where: { id, tenantId }, include: { items: true, patient: true } });
    if (!rx) throw new NotFoundException('Prescription not found');
    return rx;
  }

  async sendToPharmacy(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.findFirst({ where: { id, tenantId } });
      if (!rx) throw new NotFoundException('Prescription not found');
      return tx.prescription.update({ where: { id }, data: { status: 'SENT_TO_PHARMACY', sentToPharmacyAt: new Date() } });
    });
  }

  async cancel(tenantId: string, id: string, reason: string, cancelledById: string) {
    return this.prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.findFirst({ where: { id, tenantId } });
      if (!rx) throw new NotFoundException('Prescription not found');
      return tx.prescription.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById, cancellationReason: reason } });
    });
  }

  async updatePrescriptionStatus(tenantId: string, id: string, status: string) {
    return this.prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.findFirst({ where: { id, tenantId } });
      if (!rx) throw new NotFoundException('Prescription not found');
      return tx.prescription.update({ where: { id }, data: { status } });
    });
  }
}
