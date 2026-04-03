import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateSequentialId } from '../../common/utils/id-generator';
@Injectable()
export class RadiologyService {
  constructor(private prisma: PrismaService) {}
  async listOrders(tenantId: string, status?: string, modality?: string) {
    const where: any = { tenantId }; if (status) where.status = status; if (modality) where.modality = modality;
    return this.prisma.radiologyOrder.findMany({ where, include: { results: true }, orderBy: { createdAt: 'desc' } });
  }
  async createOrder(tenantId: string, dto: any) {
    return generateSequentialId(this.prisma, {
      table: 'RadiologyOrder',
      idColumn: 'orderNumber',
      prefix: 'RAD-',
      tenantId,
      callback: async (tx, orderNumber) => {
        return tx.radiologyOrder.create({ data: { tenantId, orderNumber, locationId: dto.locationId, patientId: dto.patientId, doctorId: dto.doctorId, consultationId: dto.consultationId, admissionId: dto.admissionId, modality: dto.modality, examType: dto.examType, bodyPart: dto.bodyPart, laterality: dto.laterality, priority: dto.priority||'ROUTINE', clinicalHistory: dto.clinicalHistory, contrast: dto.contrast||false, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null, status: 'ORDERED' } });
      },
    });
  }
  async getOrder(tenantId: string, id: string) {
    const o = await this.prisma.radiologyOrder.findFirst({ where: { id, tenantId }, include: { results: true } });
    if (!o) throw new NotFoundException('Order not found'); return o;
  }
  async updateOrder(tenantId: string, id: string, dto: any) {
    const order = await this.prisma.radiologyOrder.findFirst({ where: { id, tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'ORDERED') throw new BadRequestException('Can only edit orders in ORDERED status');
    return this.prisma.radiologyOrder.update({ where: { id }, data: { modality: dto.modality, examType: dto.examType, bodyPart: dto.bodyPart, laterality: dto.laterality, priority: dto.priority, clinicalHistory: dto.clinicalHistory, contrast: dto.contrast, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : order.scheduledAt } });
  }

  async addResult(tenantId: string, userId: string, dto: any) {
    const order = await this.prisma.radiologyOrder.findFirst({ where: { id: dto.orderId, tenantId } }); if (!order) throw new NotFoundException('Radiology order not found');
    await this.prisma.radiologyOrder.update({ where: { id: dto.orderId }, data: { status: 'REPORTED' } });
    return this.prisma.radiologyResult.create({ data: { tenantId, orderId: dto.orderId, locationId: dto.locationId, findings: dto.findings, impression: dto.impression, recommendation: dto.recommendation, isCritical: dto.isCritical||false, imageUrls: dto.imageUrls||[], reportedById: userId, reportedAt: new Date(), status: 'REPORTED' } });
  }
  async validateResult(tenantId: string, id: string, userId: string) {
    const result = await this.prisma.radiologyResult.findFirst({ where: { id, tenantId } }); if (!result) throw new NotFoundException('Radiology result not found');
    return this.prisma.radiologyResult.update({ where: { id }, data: { validatedById: userId, validatedAt: new Date(), status: 'VALIDATED' } });
  }

  async remove(tenantId: string, id: string) {
    const order = await this.prisma.radiologyOrder.findFirst({ where: { id, tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'COMPLETED' || order.status === 'VALIDATED') throw new BadRequestException('Cannot delete completed or validated orders');
    return this.prisma.radiologyOrder.delete({ where: { id } });
  }
}
