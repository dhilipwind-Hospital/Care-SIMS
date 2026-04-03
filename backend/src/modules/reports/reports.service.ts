import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [
      totalPatients, todayQueue, activeAdmissions, pendingLabOrders,
      todayAppointments, pendingPrescriptions,
    ] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.queueToken.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.admission.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.labOrder.count({ where: { ...where, status: { in: ['ORDERED', 'COLLECTED', 'IN_PROGRESS'] } } }),
      this.prisma.appointment.count({ where: { ...where, appointmentDate: { gte: today } } }),
      this.prisma.prescription.count({ where: { ...where, status: 'SENT_TO_PHARMACY' } }),
    ]);
    return { totalPatients, todayQueue, activeAdmissions, pendingLabOrders, todayAppointments, pendingPrescriptions };
  }

  async getPatientReport(tenantId: string, query: any) {
    const { from, to, locationId } = query;
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const [total, byGender, byRegistrationType] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.patient.groupBy({ by: ['gender'], where, _count: true }),
      this.prisma.patient.groupBy({ by: ['registrationType'], where, _count: true }),
    ]);
    return { total, byGender, byRegistrationType };
  }

  async getRevenueReport(tenantId: string, query: any) {
    const { from, to, locationId } = query;
    const where: any = { tenantId, status: { in: ['PAID', 'PARTIAL'] } };
    if (locationId) where.locationId = locationId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const invoices = await this.prisma.invoice.findMany({ where, select: { netTotal: true, paidAmount: true, invoiceType: true, createdAt: true } });
    const totalBilled = invoices.reduce((s, i) => s + Number(i.netTotal), 0);
    const totalCollected = invoices.reduce((s, i) => s + Number(i.paidAmount), 0);
    const outstanding = totalBilled - totalCollected;
    return { totalBilled, totalCollected, outstanding, invoiceCount: invoices.length };
  }

  async getOPDReport(tenantId: string, query: any) {
    const { from, to, locationId } = query;
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const totalConsultations = await this.prisma.consultation.count({ where });
    return { totalConsultations };
  }

  async getIPDReport(tenantId: string, query: any) {
    const { from, to, locationId } = query;
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    if (from || to) {
      where.admissionDate = {};
      if (from) where.admissionDate.gte = new Date(from);
      if (to) where.admissionDate.lte = new Date(to);
    }
    const [total, active, discharged] = await Promise.all([
      this.prisma.admission.count({ where }),
      this.prisma.admission.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.admission.count({ where: { ...where, status: 'DISCHARGED' } }),
    ]);
    return { total, currentlyAdmitted: active, discharged };
  }
}
