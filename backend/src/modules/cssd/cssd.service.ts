import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class CssdService {
  constructor(private prisma: PrismaService) {}

  // ── Sterilization Batches ──

  async createBatch(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'SterilizationBatch',
      idColumn: 'batchNumber',
      prefix: `CSSD-${new Date().getFullYear()}-`,
      tenantId,
      padLength: 5,
      callback: async (tx, batchNumber) => {
        const batch = await tx.sterilizationBatch.create({
          data: {
            tenantId, batchNumber, locationId: dto.locationId,
            loadType: dto.loadType, machineId: dto.machineId,
            operatorId: dto.operatorId, notes: dto.notes,
            status: 'PENDING',
          },
        });
        // Create items in the batch
        if (dto.items?.length) {
          for (const item of dto.items) {
            await tx.sterilizationItem.create({
              data: {
                tenantId, batchId: batch.id,
                instrumentSetId: item.instrumentSetId,
                instrumentName: item.instrumentName,
                departmentId: item.departmentId,
                requestedById: item.requestedById,
                status: 'PENDING',
              },
            });
          }
        }
        return tx.sterilizationBatch.findUnique({ where: { id: batch.id }, include: { items: true } });
      },
    });
  }

  async getBatches(tenantId: string, query: any) {
    const { status, from, to, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId };
    if (status) where.status = status;
    if (from || to) { where.createdAt = {}; if (from) where.createdAt.gte = new Date(from); if (to) where.createdAt.lte = new Date(to); }
    const [data, total] = await Promise.all([
      this.prisma.sterilizationBatch.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' }, include: { items: true } }),
      this.prisma.sterilizationBatch.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getBatch(tenantId: string, id: string) {
    const batch = await this.prisma.sterilizationBatch.findFirst({ where: { id, tenantId }, include: { items: true } });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async startBatch(tenantId: string, id: string, dto: any) {
    const batch = await this.prisma.sterilizationBatch.findFirst({ where: { id, tenantId } });
    if (!batch) throw new NotFoundException('Batch not found');
    return this.prisma.sterilizationBatch.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startTime: new Date(), temperature: dto.temperature, pressure: dto.pressure, durationMins: dto.durationMins },
    });
  }

  async completeBatch(tenantId: string, id: string, dto: any) {
    const batch = await this.prisma.sterilizationBatch.findFirst({ where: { id, tenantId }, include: { items: true } });
    if (!batch) throw new NotFoundException('Batch not found');

    const passed = dto.biologicalIndicator === 'PASS' && dto.chemicalIndicator === 'PASS';
    const newStatus = passed ? 'COMPLETED' : 'FAILED';

    // Update all items in the batch
    await this.prisma.sterilizationItem.updateMany({
      where: { batchId: id },
      data: { status: passed ? 'STERILIZED' : 'PENDING' },
    });

    // Update instrument set sterilization counts
    if (passed) {
      const setIds = batch.items.filter(i => i.instrumentSetId).map(i => i.instrumentSetId as string);
      for (const setId of [...new Set(setIds)]) {
        await this.prisma.instrumentSet.update({
          where: { id: setId },
          data: { totalSterilizations: { increment: 1 }, lastSterilizedAt: new Date() },
        }).catch(() => {}); // ignore if set doesn't exist
      }
    }

    return this.prisma.sterilizationBatch.update({
      where: { id },
      data: { status: newStatus, endTime: new Date(), biologicalIndicator: dto.biologicalIndicator, chemicalIndicator: dto.chemicalIndicator },
      include: { items: true },
    });
  }

  // ── Issue / Return ──

  async issueItem(tenantId: string, itemId: string, dto: any) {
    const item = await this.prisma.sterilizationItem.findFirst({ where: { id: itemId, tenantId, status: 'STERILIZED' } });
    if (!item) throw new BadRequestException('Item not found or not sterilized');
    return this.prisma.sterilizationItem.update({
      where: { id: itemId },
      data: { status: 'ISSUED', issuedAt: new Date(), issuedToId: dto.issuedToId },
    });
  }

  async returnItem(tenantId: string, itemId: string, returnedById: string) {
    const item = await this.prisma.sterilizationItem.findFirst({ where: { id: itemId, tenantId, status: 'ISSUED' } });
    if (!item) throw new BadRequestException('Item not found or not issued');
    return this.prisma.sterilizationItem.update({
      where: { id: itemId },
      data: { status: 'RETURNED', returnedAt: new Date(), returnedById },
    });
  }

  // ── Instrument Sets ──

  async createInstrumentSet(tenantId: string, dto: any) {
    return this.prisma.instrumentSet.create({
      data: { tenantId, setName: dto.setName, department: dto.department, items: dto.items || [], condition: dto.condition || 'GOOD' },
    });
  }

  async getInstrumentSets(tenantId: string) {
    return this.prisma.instrumentSet.findMany({ where: { tenantId, isActive: true }, orderBy: { setName: 'asc' } });
  }

  async updateInstrumentSet(tenantId: string, id: string, dto: any) {
    const set = await this.prisma.instrumentSet.findFirst({ where: { id, tenantId } });
    if (!set) throw new NotFoundException('Instrument set not found');
    const data: any = {};
    if (dto.setName !== undefined) data.setName = dto.setName;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.items !== undefined) data.items = dto.items;
    if (dto.condition !== undefined) data.condition = dto.condition;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.instrumentSet.update({ where: { id }, data });
  }

  // ── Dashboard ──

  async dashboard(tenantId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalBatches, todayBatches, pendingItems, sterilizedItems, issuedItems, failedBatches] = await Promise.all([
      this.prisma.sterilizationBatch.count({ where: { tenantId } }),
      this.prisma.sterilizationBatch.count({ where: { tenantId, createdAt: { gte: today } } }),
      this.prisma.sterilizationItem.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.sterilizationItem.count({ where: { tenantId, status: 'STERILIZED' } }),
      this.prisma.sterilizationItem.count({ where: { tenantId, status: 'ISSUED' } }),
      this.prisma.sterilizationBatch.count({ where: { tenantId, status: 'FAILED' } }),
    ]);
    const totalSets = await this.prisma.instrumentSet.count({ where: { tenantId, isActive: true } });
    return { totalBatches, todayBatches, pendingItems, sterilizedItems, issuedItems, failedBatches, totalSets };
  }
}
