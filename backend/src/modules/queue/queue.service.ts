import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WsGateway } from '../ws-gateway/ws-gateway.gateway';

@Injectable()
export class QueueService {
  constructor(private prisma: PrismaService, private ws: WsGateway) {}

  async getTodayQueue(tenantId: string, locationId: string, doctorId?: string, date?: string) {
    const queueDate = date ? new Date(date) : new Date();
    queueDate.setHours(0, 0, 0, 0);
    const where: any = { tenantId, locationId, queueDate };
    if (doctorId) where.doctorId = doctorId;
    const tokens = await this.prisma.queueToken.findMany({
      where,
      include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true, gender: true, ageYears: true, dateOfBirth: true, mobile: true, allergies: true } } },
      orderBy: [{ priority: 'asc' }, { tokenNumber: 'asc' }],
      take: 500,
    });
    const stats = {
      total: tokens.length,
      waiting: tokens.filter(t => t.status === 'WAITING').length,
      inConsultation: tokens.filter(t => t.status === 'IN_CONSULTATION').length,
      completed: tokens.filter(t => t.status === 'COMPLETED').length,
      skipped: tokens.filter(t => t.status === 'SKIPPED').length,
    };
    return { tokens, stats };
  }

  async issueToken(tenantId: string, dto: any, createdById: string) {
    const queueDate = new Date();
    queueDate.setHours(0, 0, 0, 0);

    const lastToken = await this.prisma.queueToken.findFirst({
      where: { tenantId, locationId: dto.locationId, queueDate },
      orderBy: { tokenNumber: 'desc' },
    });
    const tokenNumber = (lastToken?.tokenNumber || 0) + 1;

    const token = await this.prisma.queueToken.create({
      data: {
        tenantId, tokenNumber,
        locationId: dto.locationId,
        queueDate,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        doctorId: dto.doctorId,
        departmentId: dto.departmentId,
        visitType: dto.visitType || 'NEW',
        priority: dto.priority || 'NORMAL',
        status: 'WAITING',
        notes: dto.notes,
        createdById,
      },
      include: { patient: { select: { patientId: true, firstName: true, lastName: true, mobile: true } } },
    });
    this.ws.emitToTenant(tenantId, 'queue:updated', { action: 'token_issued', token });
    return token;
  }

  async callNext(tenantId: string, locationId: string, doctorId: string) {
    const called = await this.prisma.$transaction(async (tx) => {
      const next = await tx.queueToken.findFirst({
        where: { tenantId, locationId, doctorId, status: 'WAITING' },
        orderBy: [{ priority: 'asc' }, { tokenNumber: 'asc' }],
        include: { patient: true },
      });
      if (!next) throw new NotFoundException('No waiting patients');
      return tx.queueToken.update({ where: { id: next.id }, data: { status: 'CALLED', calledTime: new Date() }, include: { patient: true } });
    });
    this.ws.emitToTenant(tenantId, 'queue:updated', { action: 'token_called', token: called });
    if (doctorId) this.ws.emitToUser(doctorId, 'queue:token:called', called);
    return called;
  }

  async updateStatus(tenantId: string, tokenId: string, status: string, dto?: any) {
    const data: any = { status };
    if (status === 'IN_CONSULTATION') data.consultStart = new Date();
    if (status === 'COMPLETED') data.completedAt = new Date();
    if (dto?.notes) data.notes = dto.notes;
    const updated = await this.prisma.$transaction(async (tx) => {
      const token = await tx.queueToken.findFirst({ where: { id: tokenId, tenantId } });
      if (!token) throw new NotFoundException('Token not found');
      return tx.queueToken.update({ where: { id: tokenId }, data });
    });
    this.ws.emitToTenant(tenantId, 'queue:updated', { action: 'status_changed', token: updated });
    return updated;
  }

  async getStats(tenantId: string, locationId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [waiting, inConsult, completed, total] = await Promise.all([
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today, status: 'WAITING' } }),
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today, status: { in: ['CALLED', 'IN_CONSULTATION'] } } }),
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today, status: 'COMPLETED' } }),
      this.prisma.queueToken.count({ where: { tenantId, locationId, queueDate: today } }),
    ]);
    return { waiting, inConsultation: inConsult, completed, total };
  }

  async getDoctorQueue(tenantId: string, doctorId: string, limit?: number) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tokens = await this.prisma.queueToken.findMany({
      where: { tenantId, doctorId, queueDate: today },
      include: { patient: { select: { id: true, patientId: true, firstName: true, lastName: true, gender: true, ageYears: true, dateOfBirth: true, mobile: true, allergies: true } } },
      orderBy: [{ priority: 'asc' }, { tokenNumber: 'asc' }],
      take: limit ? Number(limit) : 50,
    });
    const stats = {
      total: tokens.length,
      waiting: tokens.filter(t => t.status === 'WAITING').length,
      inConsultation: tokens.filter(t => t.status === 'IN_CONSULTATION').length,
      completed: tokens.filter(t => t.status === 'COMPLETED').length,
    };
    return { tokens, stats };
  }
}
