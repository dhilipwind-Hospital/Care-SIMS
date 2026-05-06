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
      todayAppointments, pendingPrescriptions, pharmacyRevenueAgg, todayRevenueAgg,
    ] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.queueToken.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.admission.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.labOrder.count({ where: { ...where, status: { in: ['ORDERED', 'COLLECTED', 'IN_PROGRESS'] } } }),
      this.prisma.appointment.count({ where: { ...where, appointmentDate: { gte: today } } }),
      this.prisma.prescription.count({ where: { ...where, status: 'SENT_TO_PHARMACY' } }),
      this.prisma.invoice.aggregate({
        where: { ...where, invoiceType: 'PHARMACY', status: { in: ['PAID', 'PARTIAL'] }, createdAt: { gte: today } },
        _sum: { paidAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: { in: ['PAID', 'PARTIAL'] }, createdAt: { gte: today } },
        _sum: { paidAmount: true },
      }),
    ]);
    const pharmacyRevenue = Number(pharmacyRevenueAgg._sum.paidAmount ?? 0);
    const todayRevenue = Number(todayRevenueAgg._sum.paidAmount ?? 0);
    return { totalPatients, todayQueue, activeAdmissions, pendingLabOrders, todayAppointments, pendingPrescriptions, pharmacyRevenue, todayRevenue };
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

  async getLabReport(tenantId: string, query: any) {
    const { from, to, locationId } = query;
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    if (from || to) {
      where.orderedAt = {};
      if (from) where.orderedAt.gte = new Date(from);
      if (to) where.orderedAt.lte = new Date(to);
    }
    const [totalOrders, completed, cancelled] = await Promise.all([
      this.prisma.labOrder.count({ where }),
      this.prisma.labOrder.count({ where: { ...where, status: 'VALIDATED' } }),
      this.prisma.labOrder.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);
    const pending = totalOrders - completed - cancelled;
    const criticalResults = await this.prisma.labResultItem.count({
      where: { flag: { in: ['CRITICAL', 'PANIC'] }, labResult: { tenantId } },
    });
    return { totalOrders, completed, pending, cancelled, critical: criticalResults };
  }

  async getPharmacyReport(tenantId: string, query: any) {
    const { from, to } = query;
    const where: any = { tenantId };
    if (from || to) {
      where.issuedAt = {};
      if (from) where.issuedAt.gte = new Date(from);
      if (to) where.issuedAt.lte = new Date(to);
    }
    const [total, dispensed, pending, sentToPharmacy, cancelled] = await Promise.all([
      this.prisma.prescription.count({ where }),
      this.prisma.prescription.count({ where: { ...where, status: 'DISPENSED' } }),
      this.prisma.prescription.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.prescription.count({ where: { ...where, status: 'SENT_TO_PHARMACY' } }),
      this.prisma.prescription.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);
    const invoiceWhere: any = { tenantId, invoiceType: 'PHARMACY' };
    if (from || to) {
      invoiceWhere.createdAt = {};
      if (from) invoiceWhere.createdAt.gte = new Date(from);
      if (to) invoiceWhere.createdAt.lte = new Date(to);
    }
    const revenueAgg = await this.prisma.invoice.aggregate({
      where: { ...invoiceWhere, status: { in: ['PAID', 'PARTIAL'] } },
      _sum: { paidAmount: true },
    });
    const revenue = Number(revenueAgg._sum.paidAmount ?? 0);
    return { total, dispensed, pending, sentToPharmacy, cancelled, revenue };
  }

  async getAppointmentReport(tenantId: string, query: any) {
    const { from, to, locationId } = query;
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    if (from || to) {
      where.appointmentDate = {};
      if (from) where.appointmentDate.gte = new Date(from);
      if (to) where.appointmentDate.lte = new Date(to);
    }
    const [total, scheduled, completed, cancelled, noShow] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.count({ where: { ...where, status: 'SCHEDULED' } }),
      this.prisma.appointment.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.appointment.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.appointment.count({ where: { ...where, status: 'NO_SHOW' } }),
    ]);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
    return { total, scheduled, completed, cancelled, noShow, completionRate, cancellationRate };
  }

  async getInventoryReport(tenantId: string, query: any) {
    const { from, to } = query;
    const [totalItems, lowStockItems, totalValue] = await Promise.all([
      this.prisma.inventoryItem.count({ where: { tenantId, isActive: true } }),
      this.prisma.inventoryItem.findMany({ where: { tenantId, isActive: true } }),
      this.prisma.inventoryItem.findMany({ where: { tenantId, isActive: true }, select: { currentStock: true, unitCost: true } }),
    ]);
    const lowStock = lowStockItems.filter(i => i.currentStock <= i.reorderLevel).length;
    const stockValue = totalValue.reduce((s, i) => s + (Number(i.unitCost || 0) * i.currentStock), 0);
    const txWhere: any = { tenantId };
    if (from || to) {
      txWhere.createdAt = {};
      if (from) txWhere.createdAt.gte = new Date(from);
      if (to) txWhere.createdAt.lte = new Date(to);
    }
    const [stockInCount, stockOutCount, expiryAlerts] = await Promise.all([
      this.prisma.inventoryTransaction.count({ where: { ...txWhere, transactionType: 'STOCK_IN' } }),
      this.prisma.inventoryTransaction.count({ where: { ...txWhere, transactionType: 'STOCK_OUT' } }),
      this.prisma.inventoryBatch.count({
        where: { tenantId, isActive: true, quantityRemaining: { gt: 0 }, expiryDate: { lte: new Date(Date.now() + 30 * 86400000) } },
      }),
    ]);
    return { totalItems, lowStock, stockValue, stockInCount, stockOutCount, expiryAlerts };
  }
}
