import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class PharmacyService {
  constructor(private prisma: PrismaService) {}

  async getDrugs(tenantId: string, query: any) {
    const { q, category, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    if (q) where.OR = [{ brandName: { contains: q, mode: 'insensitive' } }, { genericName: { contains: q, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([
      this.prisma.drug.findMany({ where, skip, take: Number(limit), orderBy: { brandName: 'asc' } }),
      this.prisma.drug.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async createDrug(tenantId: string, dto: any) {
    return this.prisma.drug.create({ data: { tenantId, brandName: dto.brandName, genericName: dto.genericName, category: dto.category, dosageForm: dto.dosageForm, strength: dto.strength, manufacturer: dto.manufacturer, hsnCode: dto.hsnCode, gstPct: dto.gstPct || 12, unitOfMeasure: dto.unitOfMeasure, reorderLevel: dto.reorderLevel || 50, maxStockLevel: dto.maxStockLevel || 500, storageCondition: dto.storageCondition || 'ROOM_TEMPERATURE', isControlled: dto.isControlled || false } });
  }

  async updateDrug(tenantId: string, id: string, dto: any) {
    const drug = await this.prisma.drug.findFirst({ where: { id, tenantId } });
    if (!drug) throw new NotFoundException('Drug not found');
    const data: any = {};
    if (dto.brandName !== undefined) data.brandName = dto.brandName;
    if (dto.genericName !== undefined) data.genericName = dto.genericName;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.dosageForm !== undefined) data.dosageForm = dto.dosageForm;
    if (dto.strength !== undefined) data.strength = dto.strength;
    if (dto.manufacturer !== undefined) data.manufacturer = dto.manufacturer;
    if (dto.hsnCode !== undefined) data.hsnCode = dto.hsnCode;
    if (dto.gstPct !== undefined) data.gstPct = dto.gstPct;
    if (dto.unitOfMeasure !== undefined) data.unitOfMeasure = dto.unitOfMeasure;
    if (dto.reorderLevel !== undefined) data.reorderLevel = dto.reorderLevel;
    if (dto.maxStockLevel !== undefined) data.maxStockLevel = dto.maxStockLevel;
    if (dto.storageCondition !== undefined) data.storageCondition = dto.storageCondition;
    if (dto.isControlled !== undefined) data.isControlled = dto.isControlled;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.drug.update({ where: { id }, data });
  }

  async getStock(tenantId: string, locationId: string) {
    return this.prisma.drugBatch.findMany({
      where: { tenantId, locationId, status: 'ACTIVE' },
      include: { drug: { select: { brandName: true, genericName: true, dosageForm: true, strength: true, reorderLevel: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async receiveBatch(tenantId: string, dto: any) {
    return this.prisma.drugBatch.create({
      data: {
        tenantId, drugId: dto.drugId, locationId: dto.locationId,
        batchNumber: dto.batchNumber, expiryDate: new Date(dto.expiryDate),
        unitCost: dto.unitCost,
        quantityInStock: dto.quantity,
        shelfLocation: dto.shelfLocation,
        receivedDate: new Date(),
      },
      include: { drug: { select: { brandName: true } } },
    });
  }

  async dispensePrescription(tenantId: string, prescriptionId: string, dto: any, dispensedById: string) {
    const rx = await this.prisma.prescription.findFirst({ where: { id: prescriptionId, tenantId }, include: { items: true } });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.status === 'DISPENSED') throw new BadRequestException('Already dispensed');

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.dispensedItems) {
        const batch = await tx.drugBatch.findFirst({ where: { id: item.batchId, tenantId, quantityInStock: { gte: item.quantity } } });
        if (!batch) throw new BadRequestException(`Insufficient stock for batch ${item.batchId}`);
        await tx.drugBatch.update({ where: { id: item.batchId }, data: { quantityInStock: { decrement: item.quantity } } });
      }
      await tx.prescription.update({ where: { id: prescriptionId }, data: { status: 'DISPENSED' } });
      return { message: 'Prescription dispensed successfully' };
    });
  }

  async getLowStockAlerts(tenantId: string, locationId: string) {
    const batches = await this.prisma.drugBatch.findMany({
      where: { tenantId, locationId, status: 'ACTIVE' },
      include: { drug: true },
    });
    return batches.filter(b => Number(b.quantityInStock) <= Number(b.drug.reorderLevel));
  }

  async getExpiryAlerts(tenantId: string, locationId?: string, daysAhead = 90) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + Number(daysAhead) || 90);
    const where: any = { tenantId, expiryDate: { lte: cutoff }, quantityInStock: { gt: 0 } };
    if (locationId) where.locationId = locationId;
    return this.prisma.drugBatch.findMany({
      where,
      include: { drug: { select: { brandName: true, genericName: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 500,
    });
  }

  async getReturns(tenantId: string, query?: any) {
    const where: any = { tenantId };
    if (query?.status) where.status = query.status;
    if (query?.source) where.source = query.source;
    return this.prisma.pharmacyReturn.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async createReturn(tenantId: string, dto: any, createdById: string) {
    return generateSequentialId(this.prisma, {
      table: 'PharmacyReturn',
      idColumn: 'returnNumber',
      prefix: 'RET-',
      tenantId,
      callback: async (tx, returnNumber) => {
        return tx.pharmacyReturn.create({
          data: {
            tenantId,
            returnNumber,
            locationId: dto.locationId,
            source: dto.source || 'PATIENT',
            patientId: dto.patientId,
            drugId: dto.drugId,
            drugName: dto.drugName,
            batchNumber: dto.batchNumber,
            quantityReturned: dto.quantityReturned,
            returnReason: dto.returnReason,
            condition: dto.condition || 'SEALED',
            disposition: dto.disposition || 'RETURN_TO_STOCK',
            notes: dto.notes,
            createdById,
            status: 'PENDING_REVIEW',
          },
        });
      },
    });
  }

  async reviewReturn(tenantId: string, id: string, dto: any, reviewedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const ret = await tx.pharmacyReturn.findFirst({ where: { id, tenantId } });
      if (!ret) throw new NotFoundException('Return not found');
      if (ret.status !== 'PENDING_REVIEW') throw new BadRequestException('Only pending returns can be reviewed');

      const updated = await tx.pharmacyReturn.update({
        where: { id },
        data: {
          status: dto.status,
          creditAmount: dto.creditAmount,
          reviewedById,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes,
        },
      });

      // If approved and disposition is RETURN_TO_STOCK, add back to stock
      if (dto.status === 'APPROVED' && ret.disposition === 'RETURN_TO_STOCK' && ret.drugId) {
        const batch = await tx.drugBatch.findFirst({
          where: { drugId: ret.drugId, batchNumber: ret.batchNumber || undefined },
        });
        if (batch) {
          await tx.drugBatch.update({
            where: { id: batch.id },
            data: { quantityInStock: { increment: ret.quantityReturned } },
          });
        }
      }

      return updated;
    });
  }
}
