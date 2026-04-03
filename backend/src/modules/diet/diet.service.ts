import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DietService {
  constructor(private prisma: PrismaService) {}

  async listOrders(tenantId: string, status?: string, wardId?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    if (wardId) where.wardId = wardId;
    return this.prisma.dietOrder.findMany({ where, include: { meals: true }, orderBy: { createdAt: 'desc' } });
  }

  async createOrder(tenantId: string, dto: any) {
    return this.prisma.dietOrder.create({
      data: {
        tenantId, locationId: dto.locationId, patientId: dto.patientId, admissionId: dto.admissionId,
        wardId: dto.wardId, bedId: dto.bedId, doctorId: dto.doctorId, dietType: dto.dietType,
        caloricTarget: dto.caloricTarget, proteinTarget: dto.proteinTarget,
        restrictions: dto.restrictions || [], allergies: dto.allergies || [],
        preferences: dto.preferences, specialInstructions: dto.specialInstructions,
        npoStatus: dto.npoStatus || false, npoReason: dto.npoReason,
      },
    });
  }

  async getOrder(tenantId: string, id: string) {
    const o = await this.prisma.dietOrder.findFirst({ where: { id, tenantId }, include: { meals: { orderBy: { mealDate: 'desc' } } } });
    if (!o) throw new NotFoundException('Diet order not found');
    return o;
  }

  async updateOrder(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const o = await tx.dietOrder.findFirst({ where: { id, tenantId } });
      if (!o) throw new NotFoundException('Diet order not found');
      const data: any = {};
      if (dto.dietType !== undefined) data.dietType = dto.dietType;
      if (dto.caloricTarget !== undefined) data.caloricTarget = dto.caloricTarget;
      if (dto.proteinTarget !== undefined) data.proteinTarget = dto.proteinTarget;
      if (dto.restrictions !== undefined) data.restrictions = dto.restrictions;
      if (dto.allergies !== undefined) data.allergies = dto.allergies;
      if (dto.preferences !== undefined) data.preferences = dto.preferences;
      if (dto.specialInstructions !== undefined) data.specialInstructions = dto.specialInstructions;
      if (dto.npoStatus !== undefined) data.npoStatus = dto.npoStatus;
      if (dto.npoReason !== undefined) data.npoReason = dto.npoReason;
      if (dto.status !== undefined) data.status = dto.status;
      return tx.dietOrder.update({ where: { id }, data });
    });
  }

  async removeOrder(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.dietOrder.findFirst({ where: { id, tenantId } });
      if (!order) throw new NotFoundException('Diet order not found');
      if (order.status !== 'PENDING') throw new BadRequestException('Can only delete orders with PENDING status');
      return tx.dietOrder.delete({ where: { id } });
    });
  }

  async cancelOrder(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const o = await tx.dietOrder.findFirst({ where: { id, tenantId } });
      if (!o) throw new NotFoundException('Diet order not found');
      return tx.dietOrder.update({ where: { id }, data: { status: 'CANCELLED', endDate: new Date() } });
    });
  }

  async planMeal(tenantId: string, dto: any) {
    return this.prisma.dietMeal.create({
      data: {
        tenantId, orderId: dto.orderId, mealType: dto.mealType,
        mealDate: new Date(dto.mealDate), items: dto.items, notes: dto.notes,
      },
    });
  }

  async serveMeal(tenantId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const meal = await tx.dietMeal.findFirst({ where: { id, tenantId } });
      if (!meal) throw new NotFoundException('Meal not found');
      return tx.dietMeal.update({ where: { id }, data: { servedAt: new Date(), servedById: userId, status: 'SERVED' } });
    });
  }

  async mealFeedback(tenantId: string, id: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const meal = await tx.dietMeal.findFirst({ where: { id, tenantId } });
      if (!meal) throw new NotFoundException('Meal not found');
      return tx.dietMeal.update({ where: { id }, data: { consumedPercent: dto.consumedPercent, refusalReason: dto.refusalReason, status: dto.consumedPercent > 0 ? 'CONSUMED' : 'REFUSED' } });
    });
  }

  async todayMeals(tenantId: string, wardId?: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const where: any = { tenantId, mealDate: { gte: today, lt: tomorrow } };
    if (wardId) {
      const orders = await this.prisma.dietOrder.findMany({ where: { tenantId, wardId, status: 'ACTIVE' }, select: { id: true } });
      where.orderId = { in: orders.map(o => o.id) };
    }
    return this.prisma.dietMeal.findMany({ where, include: { order: true }, orderBy: { mealType: 'asc' } });
  }
}
