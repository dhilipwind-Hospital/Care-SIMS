import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class PharmacyService {
  constructor(private prisma: PrismaService, private billing: BillingService) {}

  /**
   * Every stock number on both pharmacy screens is derived from `batches`,
   * `totalStock` and `stockStatus` — and none of the three were ever returned.
   * The Rx panel therefore badged every drug "Out", the dashboard counted all
   * 8 drugs as critical, and the inventory table showed 0 / ADEQUATE for stock
   * that was actually 200 units. The projection below is the single place all
   * of that is now computed.
   *
   * NOT scoped to the caller's location on purpose: the pharmacist's JWT
   * location holds no batches while the stock sits at Main Campus, so filtering
   * by it would report zero for a fully stocked tenant. Location-specific
   * numbers stay on /pharmacy/stock, which takes an explicit locationId.
   */
  async getDrugs(tenantId: string, query: any) {
    const { q, category, page = 1, limit = 20, withBatches } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    if (q) where.OR = [{ brandName: { contains: q, mode: 'insensitive' } }, { genericName: { contains: q, mode: 'insensitive' } }];
    // The CSV export pulls limit=10000 and renders no stock column, so it opts
    // out rather than dragging every batch row along.
    const includeBatches = withBatches !== false && String(withBatches) !== 'false';
    const [rows, total] = await Promise.all([
      this.prisma.drug.findMany({
        where, skip, take: Number(limit), orderBy: { brandName: 'asc' },
        ...(includeBatches
          ? { include: { batches: { where: { status: 'ACTIVE' }, select: { id: true, batchNumber: true, quantityInStock: true, expiryDate: true, unitCost: true, locationId: true }, orderBy: { expiryDate: 'asc' as const } } } }
          : {}),
      }),
      this.prisma.drug.count({ where }),
    ]);
    return {
      data: includeBatches ? rows.map(d => this.withStockStatus(d)) : rows,
      meta: { total, page: Number(page), limit: Number(limit) },
    };
  }

  /** Expired stock is not dispensable, so it is excluded from the sellable total. */
  private withStockStatus(drug: any) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const soon = new Date(today); soon.setDate(soon.getDate() + 90);
    const batches: any[] = drug.batches || [];
    const sellable = batches.filter(b => !b.expiryDate || new Date(b.expiryDate) >= today);
    const totalStock = sellable.reduce((s, b) => s + Number(b.quantityInStock || 0), 0);
    const reorder = Number(drug.reorderLevel ?? 0);
    const expiringSoon = sellable.some(b => Number(b.quantityInStock || 0) > 0 && b.expiryDate && new Date(b.expiryDate) <= soon);
    // Shortage always outranks expiry — an out-of-stock drug is not "expiring".
    const stockStatus =
      totalStock === 0 ? 'OUT_OF_STOCK'
      : reorder > 0 && totalStock <= Math.ceil(reorder / 2) ? 'CRITICAL_STOCK'
      : reorder > 0 && totalStock <= reorder ? 'LOW_STOCK'
      : expiringSoon ? 'EXPIRING_SOON'
      : 'ADEQUATE';
    return { ...drug, totalStock, expiringSoon, stockStatus };
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

    // Track what was dispensed so we can bill outside the transaction.
    type Dispensed = { batchId: string; quantity: number; drugId: string; drugName: string; unitCost: number | null };
    const dispensedDetails: Dispensed[] = [];

    // Items the pharmacist handed over but that inventory could not account for.
    const shortfalls: Array<{ drugName: string; requested: number; dispensed: number; reason: string }> = [];

    const explicit = Array.isArray(dto.dispensedItems) && dto.dispensedItems.length > 0;
    // Catalog lookup is immutable reference data — kept outside the transaction
    // so an unbounded findMany never eats the interactive-transaction budget.
    const catalog = explicit
      ? []
      : await this.prisma.drug.findMany({ where: { tenantId, isActive: true }, select: { id: true, brandName: true, genericName: true } });

    await this.prisma.$transaction(async (tx) => {
      // Claim the prescription first. The status pre-check above runs outside
      // the transaction, so two concurrent dispenses could both pass it and
      // both decrement stock. Only the request whose updateMany matches a
      // not-yet-DISPENSED row proceeds; the loser rolls back untouched.
      // Prescription.notes already holds the DOCTOR's clinical note (written by
      // prescriptions.service.create from the Rx form), so the pharmacist's
      // note is appended under a label rather than overwriting it. Dispense can
      // only ever win this claim once, so it cannot append twice.
      const pharmNote = typeof dto.notes === 'string' ? dto.notes.trim() : '';
      const mergedNotes = pharmNote
        ? [(rx as any).notes, `[Pharmacy] ${pharmNote}`].filter(Boolean).join('\n')
        : undefined;
      const claim = await tx.prescription.updateMany({
        where: { id: prescriptionId, tenantId, status: { not: 'DISPENSED' } },
        data: {
          status: 'DISPENSED',
          ...(mergedNotes !== undefined ? { notes: mergedNotes } : {}),
        },
      });
      if (claim.count === 0) throw new BadRequestException('Already dispensed');

      if (explicit) {
        // Caller named exact batches — keep the original strict behaviour,
        // including the hard failure on insufficient stock.
        for (const item of dto.dispensedItems) {
          const batch = await tx.drugBatch.findFirst({
            where: { id: item.batchId, tenantId, quantityInStock: { gte: item.quantity } },
            include: { drug: { select: { brandName: true } } },
          });
          if (!batch) throw new BadRequestException(`Insufficient stock for batch ${item.batchId}`);
          await tx.drugBatch.update({ where: { id: item.batchId }, data: { quantityInStock: { decrement: item.quantity } } });
          dispensedDetails.push({
            batchId: batch.id,
            quantity: Number(item.quantity),
            drugId: batch.drugId,
            drugName: (batch as any).drug?.brandName || 'Medication',
            unitCost: batch.unitCost != null ? Number(batch.unitCost) : null,
          });
        }
      } else {
        // The Dispense button posts only { notes }, so this loop used to run
        // zero times: stock was never decremented yet the Rx was still marked
        // DISPENSED. Allocate first-expiry-first-out from the Rx itself.
        //
        // Deliberately non-fatal: legacy Rx items carry drugId = null and match
        // the catalog only by name, so throwing here would block dispensing
        // outright. Anything inventory cannot account for is returned as a
        // shortfall for the pharmacist to reconcile.
        const today = new Date(); today.setHours(0, 0, 0, 0);
        for (const it of (rx as any).items || []) {
          const requested = it.quantity != null ? Math.ceil(Number(it.quantity)) : 0;
          if (requested <= 0) {
            // Older prescriptions (and any written before the Rx form captured
            // a quantity) have none. Previously this line was skipped in
            // silence, so the pharmacist saw "dispensed successfully" with no
            // stock movement and no warning. Surface it instead.
            shortfalls.push({ drugName: it.drugName, requested: 0, dispensed: 0, reason: 'No quantity on the prescription' });
            continue;
          }
          const drugId = it.drugId || this.matchDrugByName(catalog, it.drugName)?.id;
          if (!drugId) { shortfalls.push({ drugName: it.drugName, requested, dispensed: 0, reason: 'No matching drug in catalog' }); continue; }
          const batches = await tx.drugBatch.findMany({
            where: { tenantId, drugId, status: 'ACTIVE', quantityInStock: { gt: 0 }, expiryDate: { gte: today } },
            orderBy: { expiryDate: 'asc' },
            include: { drug: { select: { brandName: true } } },
          });
          let remaining = requested;
          for (const b of batches) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, b.quantityInStock);
            // Conditional decrement: if a concurrent dispense already drained
            // this batch the update matches nothing and we fall through to the
            // next one, so stock can never go negative.
            const res = await tx.drugBatch.updateMany({
              where: { id: b.id, quantityInStock: { gte: take } },
              data: { quantityInStock: { decrement: take } },
            });
            if (res.count === 0) continue;
            dispensedDetails.push({
              batchId: b.id,
              quantity: take,
              drugId: b.drugId,
              drugName: (b as any).drug?.brandName || it.drugName || 'Medication',
              unitCost: b.unitCost != null ? Number(b.unitCost) : null,
            });
            remaining -= take;
          }
          if (remaining > 0) shortfalls.push({ drugName: it.drugName, requested, dispensed: requested - remaining, reason: 'Insufficient stock on hand' });
        }
      }

      // Line status stayed PENDING forever, so the MAR and the Rx detail view
      // never reflected that the medication had actually been handed over.
      // (Status and the pharmacist's notes were already written by the claim.)
      await tx.prescriptionItem.updateMany({ where: { prescriptionId }, data: { status: 'DISPENSED' } });
    });

    // Route billing through the shared Rx-level helper. If the doctor already
    // hit "Send to Pharmacy", those charges are on the open invoice; the
    // helper's referenceId dedup makes this call a no-op. If they dispensed
    // straight from PENDING without a send step, this is where the bill is
    // created. Either way the patient is charged exactly once per Rx item.
    //
    // The per-batch unitCost data is no longer reflected in the bill — the
    // bill is now driven by the catalog price (cheapest active batch ×
    // markup, captured at commitment time). Batch substitutions are an
    // inventory concern, not a billing one.
    try {
      await this.billing.billPrescription(tenantId, prescriptionId);
      if (dispensedDetails.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[pharmacy→billing] Rx ${(rx as any).rxNumber}: dispensed ${dispensedDetails.length} batch(es)`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[pharmacy→billing] Failed to add pharmacy charges to invoice:', err);
    }

    return {
      message: 'Prescription dispensed successfully',
      dispensed: dispensedDetails.map(d => ({ drugName: d.drugName, quantity: d.quantity, batchId: d.batchId })),
      shortfalls,
    };
  }

  /**
   * Doctors store a concatenated free-text drugName ("Calpol 500 500mg
   * TABLET"), so exact equality misses. Try exact brand/generic first, then
   * longest containment so "Calpol 500" beats a stray "500".
   */
  private matchDrugByName(catalog: Array<{ id: string; brandName: string; genericName: string | null }>, drugName?: string | null) {
    if (!drugName) return null;
    const n = drugName.toLowerCase().trim();
    const exact = catalog.find(d => d.brandName?.toLowerCase() === n || d.genericName?.toLowerCase() === n);
    if (exact) return exact;
    const partial = catalog
      .filter(d => (d.brandName && n.includes(d.brandName.toLowerCase())) || (d.genericName && n.includes(d.genericName.toLowerCase())))
      .sort((a, b) => (b.brandName?.length || 0) - (a.brandName?.length || 0));
    return partial[0] || null;
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

  // Walk-in / prescription-less dispense: records a free-text manual dispense entry.
  async manualDispense(tenantId: string, dto: any, dispensedById: string) {
    if (!dto.patientName || !dto.drugName) throw new BadRequestException('Patient name and drug name are required');
    return this.prisma.manualDispense.create({
      data: {
        tenantId,
        patientName: dto.patientName,
        drugName: dto.drugName,
        quantity: Number(dto.quantity) || 0,
        dosage: dto.dosage || null,
        instructions: dto.instructions || null,
        notes: dto.notes || null,
        dispensedById: dispensedById || null,
      },
    });
  }
}
