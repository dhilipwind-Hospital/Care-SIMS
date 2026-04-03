import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';

@Injectable()
export class PhysiotherapyService {
  constructor(private prisma: PrismaService) {}

  async listOrders(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.prisma.physiotherapyOrder.findMany({ where, include: { sessions: true }, orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async createOrder(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'PhysiotherapyOrder',
      idColumn: 'orderNumber',
      prefix: 'PT-',
      tenantId,
      callback: async (tx, orderNumber) => {
        return tx.physiotherapyOrder.create({
          data: {
            tenantId, locationId: dto.locationId, orderNumber,
            patientId: dto.patientId, doctorId: dto.doctorId, admissionId: dto.admissionId,
            diagnosis: dto.diagnosis, treatmentPlan: dto.treatmentPlan, frequency: dto.frequency,
            totalSessions: dto.totalSessions, precautions: dto.precautions, goals: dto.goals,
            therapistId: dto.therapistId, therapistName: dto.therapistName, startDate: new Date(dto.startDate),
          },
        });
      },
    });
  }

  async getOrder(tenantId: string, id: string) {
    const o = await this.prisma.physiotherapyOrder.findFirst({ where: { id, tenantId }, include: { sessions: true } });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async updateOrder(tenantId: string, id: string, dto: any) {
    await this.getOrder(tenantId, id);
    const data: any = {};
    if (dto.diagnosis !== undefined) data.diagnosis = dto.diagnosis;
    if (dto.treatmentPlan !== undefined) data.treatmentPlan = dto.treatmentPlan;
    if (dto.frequency !== undefined) data.frequency = dto.frequency;
    if (dto.totalSessions !== undefined) data.totalSessions = dto.totalSessions;
    if (dto.precautions !== undefined) data.precautions = dto.precautions;
    if (dto.goals !== undefined) data.goals = dto.goals;
    if (dto.therapistId !== undefined) data.therapistId = dto.therapistId;
    if (dto.therapistName !== undefined) data.therapistName = dto.therapistName;
    if (dto.status !== undefined) data.status = dto.status;
    return this.prisma.physiotherapyOrder.update({ where: { id }, data });
  }

  async addSession(tenantId: string, orderId: string, dto: any) {
    const order = await this.getOrder(tenantId, orderId);
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.physiotherapySession.create({
        data: {
          tenantId, orderId, sessionNumber: order.completedSessions + 1,
          sessionDate: new Date(dto.sessionDate), treatmentGiven: dto.treatmentGiven,
          painBefore: dto.painBefore, painAfter: dto.painAfter,
          romBefore: dto.romBefore, romAfter: dto.romAfter,
          patientResponse: dto.patientResponse, homeExercises: dto.homeExercises,
          therapistId: dto.therapistId, notes: dto.notes,
        },
      });
      const completed = order.completedSessions + 1;
      await tx.physiotherapyOrder.update({
        where: { id: orderId },
        data: { completedSessions: completed, status: completed >= order.totalSessions ? 'COMPLETED' : 'ACTIVE' },
      });
      return session;
    });
  }

  async removeOrder(tenantId: string, id: string) {
    const order = await this.prisma.physiotherapyOrder.findFirst({ where: { id, tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'COMPLETED') throw new BadRequestException('Cannot delete completed orders');
    return this.prisma.physiotherapyOrder.delete({ where: { id } });
  }

  async listSessions(tenantId: string, orderId: string) {
    return this.prisma.physiotherapySession.findMany({ where: { tenantId, orderId }, orderBy: { sessionNumber: 'asc' } });
  }
}
