import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async processPayroll(tenantId: string, dto: any, userId: string) {
    const existing = await this.prisma.payroll.findFirst({ where: { tenantId, staffId: dto.staffId, month: dto.month, year: dto.year } });
    if (existing) throw new BadRequestException('Payroll already exists for this period');
    const gross = Number(dto.basicPay) + Number(dto.da || 0) + Number(dto.hra || 0) + Number(dto.allowances || 0) + Number(dto.overtime || 0);
    const config = await this.prisma.payrollConfig.findUnique({ where: { tenantId } });
    const pf = gross * Number(config?.pfRate || 12) / 100;
    const esi = gross <= 21000 ? gross * Number(config?.esiRate || 0.75) / 100 : 0;
    const tds = Number(dto.tdsDeduction || 0);
    const other = Number(dto.otherDeductions || 0);
    const totalDeductions = pf + esi + tds + other;
    return this.prisma.payroll.create({ data: { tenantId, staffId: dto.staffId, month: dto.month, year: dto.year, basicPay: dto.basicPay, da: dto.da || 0, hra: dto.hra || 0, allowances: dto.allowances || 0, overtime: dto.overtime || 0, grossPay: gross, pfDeduction: Math.round(pf * 100) / 100, esiDeduction: Math.round(esi * 100) / 100, tdsDeduction: tds, otherDeductions: other, totalDeductions: Math.round(totalDeductions * 100) / 100, netPay: Math.round((gross - totalDeductions) * 100) / 100, status: 'PROCESSED', processedById: userId } });
  }

  async getPayroll(tenantId: string, query: any) {
    const { staffId, month, year, status, page = 1, limit = 20 } = query;
    const where: any = { tenantId }; if (staffId) where.staffId = staffId; if (month) where.month = Number(month); if (year) where.year = Number(year); if (status) where.status = status;
    const [data, total] = await Promise.all([this.prisma.payroll.findMany({ where, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: [{ year: 'desc' }, { month: 'desc' }] }), this.prisma.payroll.count({ where })]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async approve(tenantId: string, id: string) { const p = await this.prisma.payroll.findFirst({ where: { id, tenantId } }); if (!p) throw new NotFoundException('Not found'); return this.prisma.payroll.update({ where: { id }, data: { status: 'APPROVED' } }); }
  async markPaid(tenantId: string, id: string) { const p = await this.prisma.payroll.findFirst({ where: { id, tenantId } }); if (!p) throw new NotFoundException('Not found'); return this.prisma.payroll.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } }); }

  async getConfig(tenantId: string) { return this.prisma.payrollConfig.findUnique({ where: { tenantId } }) || { pfRate: 12, esiRate: 0.75, pfEmployerRate: 12, esiEmployerRate: 3.25 }; }
  async updateConfig(tenantId: string, dto: any) { return this.prisma.payrollConfig.upsert({ where: { tenantId }, update: { pfRate: dto.pfRate, esiRate: dto.esiRate, pfEmployerRate: dto.pfEmployerRate, esiEmployerRate: dto.esiEmployerRate }, create: { tenantId, pfRate: dto.pfRate || 12, esiRate: dto.esiRate || 0.75, pfEmployerRate: dto.pfEmployerRate || 12, esiEmployerRate: dto.esiEmployerRate || 3.25 } }); }

  async dashboard(tenantId: string, query: any) {
    const { month, year } = query;
    const where: any = { tenantId }; if (month) where.month = Number(month); if (year) where.year = Number(year);
    const records = await this.prisma.payroll.findMany({ where });
    return { totalRecords: records.length, totalGross: records.reduce((s, r) => s + Number(r.grossPay), 0), totalNet: records.reduce((s, r) => s + Number(r.netPay), 0), totalDeductions: records.reduce((s, r) => s + Number(r.totalDeductions), 0), paid: records.filter(r => r.status === 'PAID').length, pending: records.filter(r => r.status !== 'PAID').length };
  }
}
