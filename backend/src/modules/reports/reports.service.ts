import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService, private ai: AiService) {}

  async getDashboardSummary(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0, 0, 0, 0);
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30); monthAgo.setHours(0, 0, 0, 0);
    const [
      totalPatients, todayQueue, activeAdmissions, pendingLabOrders,
      todayAppointments, pendingPrescriptions, pharmacyRevenueAgg, todayRevenueAgg,
      weeklyRevenueAgg, weeklyAppointments,
    ] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.queueToken.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.admission.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.labOrder.count({ where: { ...where, status: { in: ['ORDERED', 'COLLECTED', 'IN_PROGRESS'] } } }),
      this.prisma.appointment.count({ where: { ...where, appointmentDate: { gte: today } } }),
      this.prisma.prescription.count({ where: { ...where, status: 'SENT_TO_PHARMACY' } }),
      this.prisma.invoice.aggregate({
        where: { ...where, invoiceType: 'PHARMACY', status: { in: ['PAID', 'PARTIAL'] }, createdAt: { gte: monthAgo } },
        _sum: { paidAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: { in: ['PAID', 'PARTIAL'] }, createdAt: { gte: monthAgo } },
        _sum: { paidAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: { in: ['PAID', 'PARTIAL'] }, createdAt: { gte: weekAgo } },
        _sum: { paidAmount: true },
      }),
      this.prisma.appointment.count({ where: { ...where, appointmentDate: { gte: weekAgo } } }),
    ]);
    const pharmacyRevenue = Number(pharmacyRevenueAgg._sum.paidAmount ?? 0);
    const todayRevenue = Number(todayRevenueAgg._sum.paidAmount ?? 0);
    const weeklyRevenue = Number(weeklyRevenueAgg._sum.paidAmount ?? 0);
    return {
      totalPatients, todayQueue, activeAdmissions, pendingLabOrders,
      todayAppointments, pendingPrescriptions, pharmacyRevenue, todayRevenue,
      weeklyRevenue, weeklyAppointments,
    };
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

  // AI Revenue Insights — qualitative natural-language commentary on what
  // changed in the last 30 days vs the prior 30 days. NOT a forecast: LLMs
  // are bad at numeric prediction. This is "what does the data say about
  // last month vs the month before" written by Gemini.
  async getAiRevenueInsights(tenantId: string, userId: string) {
    const today = new Date();
    const day = 86400000;
    const start30 = new Date(today.getTime() - 30 * day);
    const start60 = new Date(today.getTime() - 60 * day);

    // Pull both windows in parallel. Cap rows; for tenants with sparse data
    // we still need enough context, but a 10K-row prompt would be wasteful.
    const [currWindow, prevWindow] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId, createdAt: { gte: start30 }, status: { not: 'CANCELLED' } },
        select: { createdAt: true, netTotal: true, paidAmount: true, status: true, invoiceType: true,
                  lineItems: { select: { category: true, amount: true } } },
        take: 5000,
      }),
      this.prisma.invoice.findMany({
        where: { tenantId, createdAt: { gte: start60, lt: start30 }, status: { not: 'CANCELLED' } },
        select: { createdAt: true, netTotal: true, paidAmount: true, status: true, invoiceType: true,
                  lineItems: { select: { category: true, amount: true } } },
        take: 5000,
      }),
    ]);

    const aggregate = (rows: typeof currWindow) => {
      let invoices = 0, gross = 0, collected = 0, outstanding = 0;
      const byCategory: Record<string, number> = {};
      const byType: Record<string, number> = {};
      for (const inv of rows) {
        invoices++;
        gross += Number(inv.netTotal);
        collected += Number(inv.paidAmount);
        outstanding += Math.max(Number(inv.netTotal) - Number(inv.paidAmount), 0);
        byType[inv.invoiceType] = (byType[inv.invoiceType] || 0) + Number(inv.netTotal);
        for (const li of inv.lineItems) {
          const k = li.category || 'OTHER';
          byCategory[k] = (byCategory[k] || 0) + Number(li.amount);
        }
      }
      return { invoices, gross, collected, outstanding, byCategory, byType };
    };

    const curr = aggregate(currWindow);
    const prev = aggregate(prevWindow);

    // If both windows are empty, skip the LLM call.
    if (curr.invoices === 0 && prev.invoices === 0) {
      return {
        insights: 'No invoice activity in the last 60 days yet.',
        cached: false,
        windowFrom: start30,
        windowTo: today,
        previousFrom: start60,
        previousTo: start30,
        summary: { current: curr, previous: prev },
      };
    }

    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    const topN = (obj: Record<string, number>, n: number) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)
        .map(([k, v]) => `${k}: ${fmt(v)}`).join(', ') || '(none)';

    const dataPacket = `WINDOW A (last 30 days, ${start30.toISOString().slice(0, 10)} -> today):
  Invoices: ${curr.invoices}
  Gross billed: ${fmt(curr.gross)}
  Collected: ${fmt(curr.collected)}
  Outstanding: ${fmt(curr.outstanding)}
  By category: ${topN(curr.byCategory, 6)}
  By invoice type: ${topN(curr.byType, 4)}

WINDOW B (prior 30 days, ${start60.toISOString().slice(0, 10)} -> ${start30.toISOString().slice(0, 10)}):
  Invoices: ${prev.invoices}
  Gross billed: ${fmt(prev.gross)}
  Collected: ${fmt(prev.collected)}
  Outstanding: ${fmt(prev.outstanding)}
  By category: ${topN(prev.byCategory, 6)}
  By invoice type: ${topN(prev.byType, 4)}`;

    const systemInstruction = `You are a senior hospital revenue analyst writing 4-6 plain-English bullets for a hospital administrator about what changed in the last 30 days versus the 30 days before.

Rules:
  - Be specific. Use numbers (with INR formatting) and percentage deltas.
  - Compare like-for-like (gross-to-gross, collection-rate-to-collection-rate).
  - Call out the single biggest mover (largest absolute change in one category or invoice type).
  - Surface collection problems if collection rate dropped meaningfully.
  - If a window has very low volume, say so honestly — don't extrapolate.
  - This is COMMENTARY on the past, not a forecast. Never write "we will" or "expect".
  - Plain markdown bullets, no headings or preamble.
  - Each bullet ≤ 25 words.`;

    const prompt = `${dataPacket}

Write the 4-6 bullet commentary now.`;

    const result = await this.ai.complete({
      tenantId,
      feature: 'REVENUE_INSIGHTS',
      userId,
      systemInstruction,
      prompt,
      maxOutputTokens: 600,
    });

    return {
      insights: result.text.trim(),
      generatedAt: new Date(),
      cached: false,
      windowFrom: start30,
      windowTo: today,
      previousFrom: start60,
      previousTo: start30,
      summary: {
        current: { invoices: curr.invoices, gross: curr.gross, collected: curr.collected, outstanding: curr.outstanding },
        previous: { invoices: prev.invoices, gross: prev.gross, collected: prev.collected, outstanding: prev.outstanding },
      },
      model: result.model,
      durationMs: result.durationMs,
    };
  }
}
